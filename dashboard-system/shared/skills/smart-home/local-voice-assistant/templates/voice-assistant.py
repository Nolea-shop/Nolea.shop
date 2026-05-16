#!/usr/bin/env python3
"""
Voice Assistant Controller
==========================
2-stage architecture:
  - Stage 1: Short prompts → local LLM (fast) → execute action
  - Stage 2: Complex tasks → delegate to Hermes Agent

Dependencies:
  pip install faster-whisper neutts[all]
  (core: stdlib + curl + subprocess — no extra deps needed for text-only mode)
"""

import os, sys, json, subprocess, tempfile, argparse, re, datetime, threading
from pathlib import Path

# ─── Configuration ──────────────────────────────────────────────────────────
LLAMA_SERVER_URL = "http://127.0.0.1:8080"
WHISPER_MODEL = "base"                       # tiny|base|small|medium|large

SYSTEM_PROMPT = """Du bist ein deutscher Sprachassistent. Antworte MAXIMAL 10 Wörter.

AKTIONEN (nur bei passendem Schlüsselwort):
[ACTION:spotify] Antwort  — bei spotify, musik, song, playlist, podcast
[ACTION:tab] Antwort      — bei öffnen, browser, google, youtube, seite
[ACTION:timer] Antwort    — bei timer, wecker, erinnerung, minute, stunde
[ACTION:info] Antwort     — bei uhrzeit, datum, wie viel, speicher, ram
[ACTION:app] Antwort      — bei app, programm, terminal, rechner

KOMPLEX (NUR Programmierung, Recherche, 3+ Schritte):
Antworte: [HERMES: Aufgabe in 1 Satz]

Beispiele:
spotify nächster song    → [ACTION:spotify] Mache ich!
öffne youtube            → [ACTION:tab] Youtube wird geöffnet
timer 5 minuten          → [ACTION:timer] 5 Minuten gestartet
wie viel uhr             → [ACTION:info] 14:30 Uhr
schreibe eine website    → [HERMES: Erstelle eine Website mit HTML/CSS]
was ist der mond?        → Der Mond ist der einzige natürliche Satellit der Erde.
"""

# ─── Local LLM ─────────────────────────────────────────────────────────────
class LocalLLM:
    def __init__(self, url=LLAMA_SERVER_URL):
        self.url = url
        self.prompt = SYSTEM_PROMPT

    def ask(self, text, max_tokens=100):
        payload = {
            "messages": [
                {"role": "system", "content": self.prompt},
                {"role": "user", "content": text}
            ],
            "max_tokens": max_tokens, "temperature": 0.3,
        }
        try:
            result = subprocess.run(
                ["curl", "-s", "-m", "30", "-X", "POST",
                 f"{self.url}/v1/chat/completions",
                 "-H", "Content-Type: application/json",
                 "-d", json.dumps(payload)],
                capture_output=True, text=True, timeout=30
            )
            data = json.loads(result.stdout)
            return data['choices'][0]['message']['content']
        except Exception as e:
            return f"[ERROR] {e}"

# ─── Action Handler ────────────────────────────────────────────────────────
class ActionHandler:
    @staticmethod
    def handle(action_type, text):
        action_type = action_type.strip().lower()
        if action_type == "spotify":
            print(f"  🎵 Spotify: {text}")
            cmd_map = {
                "nächste": "next", "nächster": "next", "next": "next",
                "vorherige": "previous", "vorheriger": "previous", "previous": "previous",
                "pause": "pause", "stop": "stop", "play": "play", "start": "play",
                "lauter": "volume up", "leiser": "volume down",
            }
            for keyword, cmd in cmd_map.items():
                if keyword in text.lower():
                    subprocess.run(["spotify", cmd], capture_output=True, timeout=10)
                    return f"✅ Spotify: {cmd}"
            subprocess.run(["xurl", "spotify", "next"], capture_output=True, timeout=10)
            return "✅ Spotify Befehl ausgeführt"

        elif action_type == "tab":
            print(f"  🌐 Tab: {text}")
            sites = {
                "google": "https://google.com", "youtube": "https://youtube.com",
                "gmail": "https://mail.google.com", "github": "https://github.com",
                "maps": "https://maps.google.com",
            }
            url = None
            for name, site_url in sites.items():
                if name in text.lower():
                    url = site_url; break
            if not url:
                q = text.replace("öffne","").replace("tab","").replace("suche","").strip()
                url = f"https://www.google.com/search?q={q}"
            subprocess.Popen(["xdg-open", url])
            return f"🌐 Geöffnet: {url}"

        elif action_type == "timer":
            print(f"  ⏱ Timer: {text}")
            minutes = seconds = 0
            m = re.search(r'(\d+)\s*minuten?', text.lower())
            if m: minutes = int(m.group(1))
            m = re.search(r'(\d+)\s*sekunden?', text.lower())
            if m: seconds = int(m.group(1))
            m = re.search(r'(\d+)\s*stund', text.lower())
            if m: minutes = int(m.group(1)) * 60
            total_sec = minutes * 60 + seconds
            if total_sec > 0:
                def timer_done(): print(f"\n⏰ Timer abgelaufen! ({text})")
                t = threading.Timer(total_sec, timer_done)
                t.daemon = True; t.start()
                return f"⏱ Timer auf {minutes} Min {seconds} Sek gesetzt"
            return f"⏱ Timer: {text}"

        elif action_type == "info":
            if "zeit" in text or "uhr" in text or "datum" in text:
                now = datetime.datetime.now()
                return f"Es ist {now.strftime('%H:%M')} Uhr am {now.strftime('%d.%m.%Y')}"
            if "speicher" in text or "ram" in text:
                r = subprocess.run(["free", "-h"], capture_output=True, text=True)
                l = r.stdout.split('\n')[1].split()
                return f"RAM: {l[2]} von {l[1]} belegt"
            return text

        elif action_type == "app":
            apps = {"terminal": "gnome-terminal", "code": "code", "firefox": "firefox"}
            for name, cmd in apps.items():
                if name in text.lower():
                    subprocess.Popen([cmd])
                    return f"📱 {name} geöffnet"
            return "📱 App-Befehl erkannt"
        return f"✅ {text}"

    @staticmethod
    def delegate_to_hermes(task):
        print(f"  ⚡ Delegiere an Hermes: {task}")
        result = subprocess.run(
            ["hermes", "chat", "-q", task],
            capture_output=True, text=True, timeout=300
        )
        if result.stdout: return f"Hermes: {result.stdout[:200]}..."
        return "Aufgabe an Hermes übergeben."

# ─── Main Controller ──────────────────────────────────────────────────────
class VoiceAssistant:
    def __init__(self, use_stt=False, use_tts=False):
        print("Initialisiere Sprachassistent...")
        self.llm = LocalLLM()
        self.stt = self._init_stt() if use_stt else None
        self.tts = self._init_tts() if use_tts else None
        print("✓ Bereit!")

    def _init_stt(self):
        from faster_whisper import WhisperModel
        return WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")

    def _init_tts(self):
        from neutts import TTSEngine
        return TTSEngine()

    def process_text(self, text):
        print(f"\n📝 Eingabe: {text}")
        response = self.llm.ask(text)
        response = response.replace("<|end|>", "").strip()
        print(f"🤖 Gemma: {response}")

        if response.startswith("[ACTION:"):
            parts = response.split("] ", 1)
            a = parts[0][8:].strip().lower()
            t = parts[1] if len(parts) > 1 else response
            result = ActionHandler.handle(a, t)
        elif response.startswith("[HERMES:"):
            task = response[8:].rstrip("]").strip()
            result = ActionHandler.delegate_to_hermes(task)
        else:
            result = response

        if self.tts and result:
            audio = self.tts.speak(result)
            print(f"🔊 Audio: {audio}")
        return result

    def process_audio(self, audio_path):
        if not self.stt: return "STT nicht aktiviert"
        text = " ".join(s.text for s in self.stt.transcribe(audio_path, language="de"))
        return self.process_text(text)

    def interactive(self):
        print("\n=== Sprachassistent (Text-Modus) ===")
        print("Befehle: Spotify, Tab, Timer, Info, App, oder Frage")
        print("Komplexe Aufgaben → Hermes. 'exit' zum Beenden\n")
        while True:
            try:
                text = input("Du: ").strip()
                if text.lower() in ("exit", "quit", "/exit"): break
                if text: self.process_text(text)
            except KeyboardInterrupt:
                print("\nBye!"); break

# ─── CLI ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--text", "-t", help="Einmalige Texteingabe")
    p.add_argument("--audio", "-a", help="Audio-Datei transkribieren")
    p.add_argument("--interactive", "-i", action="store_true", help="Interaktiver Modus")
    p.add_argument("--stt", action="store_true", help="STT aktivieren (faster-whisper)")
    p.add_argument("--tts", action="store_true", help="TTS aktivieren (neutts)")
    args = p.parse_args()

    assistant = VoiceAssistant(use_stt=args.stt, use_tts=args.tts)
    if args.text: assistant.process_text(args.text)
    elif args.audio: assistant.process_audio(args.audio)
    else: assistant.interactive()
