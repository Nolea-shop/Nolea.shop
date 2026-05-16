#!/usr/bin/env python3
"""
Gemma 4 Voice Assistant - Windows Always-On + GUI Overlay
=========================================================
- GUI: Black notch overlay with status dot + live transcription
- Wake-Word: "Computer" (openWakeWord, no API key) or VAD-only fallback
- VAD: 3 seconds silence = end of recording
- TTS: pyttsx3 (Windows SAPI5, German voice preferred)
- 2-tier: simple actions local, complex → Hermes
"""
import sys, os, json, time, threading, subprocess, tempfile, wave, re
from pathlib import Path

# ── Dependencies ──────────────────────────────────────────────────────────────
try:
    import sounddevice as sd
except: sys.exit(print("✗ pip install sounddevice"))

try:
    import webrtcvad
except: sys.exit(print("✗ pip install webrtcvad"))

try:
    import requests
except: sys.exit(print("✗ pip install requests"))

# openWakeWord (optional — VAD-only fallback if missing)
HAVE_OWW = False
try:
    from openwakeword.model import Model as WakeModel
    HAVE_OWW = True
except:
    print("⚠ openWakeWord not found → VAD-only mode (no wake-word)")

# GUI Overlay (tkinter)
GUI_AVAIL = False
try:
    import tkinter as tk
    import queue as q
    GUI_AVAIL = True
except:
    print("⚠ tkinter not available → CLI mode only")

# TTS
TTS_OK = False
try:
    import pyttsx3
    tts_engine = pyttsx3.init()
    tts_engine.setProperty('rate', 160)
    for v in tts_engine.getProperty('voices'):
        if 'german' in v.name.lower() or 'de-' in v.id.lower():
            tts_engine.setProperty('voice', v.id); break
    TTS_OK = True
except:
    print("⚠ pyttsx3 not available → no TTS")

# ── Config ──────────────────────────────────────────────────────────────────
GEMMA_URL = "http://127.0.0.1:8080/v1/chat/completions"
SR = 16000           # sample rate
FRAME = int(SR*30/1000)  # 30ms frame
SILENCE_SECS = 3     # silence threshold

SYS_PROMPT = "Du bist ein deutscher Assistent. Max 10 Wörter.\nAKTIONEN: [ACTION:spotify] [ACTION:tab] [ACTION:timer] [ACTION:info] [ACTION:app]\nKOMPLEX: [HERMES: Aufgabe]"

# ── GUI Overlay ─────────────────────────────────────────────────────────────
class Notch:
    def __init__(self):
        if not GUI_AVAIL: return
        self.r = tk.Tk()
        self.r.overrideredirect(True)
        self.r.attributes('-topmost', True)
        self.r.attributes('-transparentcolor', '#000001')
        self.r.configure(bg='#000001')
        w, h = 120, 42
        self.r.geometry(f"{w}x{h}+{(self.r.winfo_screenwidth()-w)//2}+6")
        self.c = tk.Canvas(self.r, width=w, height=h, bg='#000001', highlightthickness=0)
        self.c.pack()
        self.dot = self.c.create_oval(38, 12, 54, 28, fill='#666', outline='')
        self.tid = self.c.create_text(60, 12, text="...", fill='#888',
            font=("Segoe UI", 8), anchor="center", width=110)
        self.sid = self.c.create_text(60, 30, text="Bereit", fill='#555',
            font=("Segoe UI", 7), anchor="center")
        self.xb = self.c.create_text(w-10, 12, text="✕", fill='#555', font=("Segoe UI", 8))
        self.c.tag_bind(self.xb, "<Button-1>", lambda e: self.stop())
        # Drag
        bg = self.c.create_rectangle(0,0,w,h, fill='', outline='')
        self.c.tag_bind(bg, "<Button-1>", self._ds)
        self.c.tag_bind(bg, "<B1-Motion>", self._dm)
        self.q = q.Queue()
        self._poll()
        self.ok = True
    def _ds(self, e): self._dx, self._dy = e.x, e.y
    def _dm(self, e):
        x = self.r.winfo_x() + e.x - self._dx
        y = self.r.winfo_y() + e.y - self._dy
        self.r.geometry(f"+{x}+{y}")
    def _poll(self):
        try:
            while True: fn = self.q.get_nowait(); fn()
        except q.Empty: pass
        if self.ok: self.r.after(50, self._poll)
    def _up(self, fn): self.q.put(fn)
    def idle(self): self._up(lambda: self.c.itemconfig(self.dot, fill='#666'))
    def listen(self): self._up(lambda: self.c.itemconfig(self.dot, fill='#0c4'))
    def trans(self): self._up(lambda: self.c.itemconfig(self.dot, fill='#fa0'))
    def think(self): self._up(lambda: self.c.itemconfig(self.dot, fill='#fa0'))
    def speak(self): self._up(lambda: self.c.itemconfig(self.dot, fill='#48f'))
    def show(self, t, s="", c='#888'):
        self._up(lambda: self.c.itemconfig(self.tid, text=t[:50], fill=c))
        if s: self._up(lambda: self.c.itemconfig(self.sid, text=s))
    def stop(self):
        self.ok = False
        self.r.quit(); self.r.destroy()
    def run(self): self.r.mainloop()

def gui_start():
    g = Notch()
    threading.Thread(target=g.run, daemon=True).start()
    time.sleep(0.5)
    return g

# ── VAD ────────────────────────────────────────────────────────────────────
class VAD:
    def __init__(self):
        self.v = webrtcvad.Vad(2); self.reset()
    def reset(self):
        self.buf = bytearray(); self.talk = False; self.last = None
    def feed(self, f):
        self.buf.extend(f)
        s = self.v.is_speech(f, SR)
        if s: self.talk = True; self.last = time.time(); return "GO"
        return "STOP" if (self.talk and time.time()-self.last >= SILENCE_SECS) else "GO"
    def get(self): d = bytes(self.buf); self.buf.clear(); return d

# ── STT (WSL faster-whisper) ───────────────────────────────────────────────
def stt(path):
    try:
        r = subprocess.run(["wsl", "-e", "bash", "-c",
            f"cd ~/.hermes/models/gemma4 && ~/gemma4-env/bin/python3 -c\""
            f"from faster_whisper import WhisperModel; "
            f"m = WhisperModel('base',device='cpu',compute_type='int8'); "
            f"print(' '.join(s.text for s in m.transcribe('{path.replace(chr(92),'/')}',language='de')[0]))\""
        ], capture_output=True, text=True, timeout=60)
        return r.stdout.strip()
    except: return ""

# ── LLM ─────────────────────────────────────────────────────────────────────
def ask(text):
    try:
        r = requests.post(GEMMA_URL, json={
            "messages":[{"role":"system","content":SYS_PROMPT},{"role":"user","content":text}],
            "max_tokens":100,"temperature":0.3
        }, timeout=60)
        return r.json()['choices'][0]['message']['content'].replace("<|end|>","").strip()
    except requests.exceptions.ConnectionError:
        return "[FEHLER] Server nicht erreichbar — WSL läuft?"
    except Exception as e: return f"[FEHLER] {e}"

# ── TTS ─────────────────────────────────────────────────────────────────────
def say(text, gui=None):
    t = text.split("] ")[-1] if "] " in text else text
    t = t.split("]")[-1] if "[" in t else t
    if gui: gui.speak(); gui.show(t[:40], "Spricht...", '#48f')
    if TTS_OK:
        try: tts_engine.say(t); tts_engine.runAndWait()
        except: print(f"💬 {t}")
    else: print(f"💬 {t}")

# ── Actions ─────────────────────────────────────────────────────────────────
def act(text, gui=None):
    if text.startswith("[HERMES:"):
        task = text.split("] ",1)[-1] if "] " in text else text[8:].rstrip("]")
        if gui: gui.show("⚡ Hermes", "Delegiere...", '#f40')
        say("Ich leite das an Hermes weiter.", gui)
        subprocess.Popen(["wsl","-e","hermes","chat","-q",task], creationflags=subprocess.CREATE_NO_WINDOW)
        return
    if not text.startswith("[ACTION:"): say(text, gui); return
    parts = text.split("] ",1); atype = parts[0][8:].strip().lower(); atext = parts[1] if len(parts)>1 else text
    if atype == "spotify":
        for kw,cmd in [("nächste","next"),("next","next"),("pause","pause"),("play","play")]:
            if kw in atext.lower(): say(f"Spotify {cmd}", gui); os.system(f"start spotify:{cmd}"); return
    elif atype == "tab":
        for n,u in {"google":"https://google.com","youtube":"https://youtube.com","github":"https://github.com"}.items():
            if n in atext.lower(): os.system(f"start {u}"); say(f"{n}", gui); return
    elif atype == "timer":
        m = re.search(r'(\d+)', atext)
        if m: threading.Timer(int(m.group(1))*60, lambda: os.system('msg * "Timer!"')).start(); say(f"Timer {m.group(1)}m", gui); return
    say(text, gui)

# ── Wake-Word ───────────────────────────────────────────────────────────────
def wait_wake(gui):
    if HAVE_OWW:
        if gui: gui.idle(); gui.show("Warte...", "Wake-Word: Computer", '#666')
        oww = WakeModel(wakeword_models=[], inference_framework="onnx")
        ww = ["alexa","computer","hey computer","hey google"]
        with sd.InputStream(samplerate=16000, channels=1, dtype='int16', blocksize=1280) as s:
            while True:
                pcm = s.read(1280)[0]; oww.predict(pcm[:,0]/32768.0)
                for w in ww:
                    if w in oww.prediction_buffer and max(oww.prediction_buffer[w][-20:]) > 0.5:
                        print(f"🎤 '{w}'!"); return
    else:
        if gui: gui.show("VAD-Modus", "Sprache erwartet...", '#666')
        v = webrtcvad.Vad(2); c = 0
        with sd.InputStream(samplerate=16000, channels=1, dtype='int16', blocksize=480) as s:
            while True:
                c = c+1 if v.is_speech(s.read(480)[0].tobytes(), 16000) else 0
                if c > 3: return

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    gui = gui_start() if GUI_AVAIL else None
    try:
        requests.get("http://127.0.0.1:8080/health", timeout=3)
    except:
        print("⚠ Server nicht erreichbar — starte WSL...")
        subprocess.Popen(["wsl","-e","systemctl","--user","start","gemma4-server"], creationflags=subprocess.CREATE_NO_WINDOW)
    say("Bereit.", gui)
    try:
        while True:
            wait_wake(gui)
            if gui: gui.listen()
            vad = VAD()
            with sd.InputStream(samplerate=SR, channels=1, dtype='int16', blocksize=FRAME) as s:
                while True:
                    f = s.read(FRAME)[0]; st = vad.feed(f.tobytes())
                    if st == "STOP": break
                    v = max(abs(x) for x in f[:,0])
                    if v > 0.003 and gui: gui.show("🎙", "#888")
            wav = tempfile.mktemp(suffix=".wav")
            with wave.open(wav,'wb') as wf:
                wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(vad.get())
            if gui: gui.trans(); gui.show("📝 Transkribiere...", "#fa0")
            text = stt(wav); os.unlink(wav)
            if not text: continue
            if gui: gui.show(text[:45], "#0c4")
            print(f"📝 {text}")
            resp = ask(text)
            print(f"🤖 {resp}")
            act(resp, gui)
    except KeyboardInterrupt: print("\n👋 Bye!")

if __name__ == "__main__":
    main()
