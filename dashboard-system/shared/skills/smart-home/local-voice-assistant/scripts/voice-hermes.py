#!/usr/bin/env python3
"""
voice-hermes — Terminal Voice Input für Hermes.
Ein-Satz-Beschreibung: Mikrofon aufnehmen (Windows ffmpeg), transkribieren (Whisper Turbo),
an Hermes senden. Kein zweites Terminal nötig — alles hier in der laufenden Session.

Verwendung (im Terminal):
  voice-hermes                    # Einmal sprechen → Antwort von Hermes
  voice-hermes --loop             # Dauermodus
"""
import sys, os, json, tempfile, subprocess as sp, asyncio, shutil
MIC = "Mikrofon (fifine Microphone)"
ff = shutil.which("ffmpeg.exe") or shutil.which("ffmpeg")

def record(sek=15):
    fd, p = tempfile.mkstemp(suffix=".wav"); os.close(fd)
    try:
        sp.run([ff, "-y", "-f", "dshow", "-i", f"audio={MIC}", "-t", str(sek),
                "-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le", "-loglevel", "error", p],
               capture_output=True, timeout=sek+5)
        return (p, os.path.getsize(p) > 2000)
    except: return (p, False)

def transcribe(p):
    try:
        import websockets
        with open(p, "rb") as f: d = f.read()
        pcm = d[44:] if len(d) > 44 else d
        async def go():
            async with websockets.connect("ws://localhost:8000/stream", max_size=50*1024*1024) as ws:
                for i in range(0, len(pcm), 4096): await ws.send(pcm[i:i+4096])
                await ws.send(b"END_OF_SPEECH")
                return json.loads(await asyncio.wait_for(ws.recv(), timeout=30)).get("text","").strip()
        return asyncio.run(go())
    except:
        from faster_whisper import WhisperModel
        m = WhisperModel("base", device="cpu", compute_type="int8")
        return " ".join(s.text for s in m.transcribe(p, language="de", beam_size=3)[0]).strip()

def ask_hermes(text):
    try:
        r = sp.run(["hermes", "chat", "-q", text, "-Q", "--continue"],
                   capture_output=True, text=True, timeout=120)
        return (r.stdout or "").strip() or (r.stderr or "").strip()[:300]
    except sp.TimeoutExpired: return "⏱️ Timeout"
    except Exception as e: return f"❌ {e}"

def main():
    loop_mode = "--loop" in sys.argv
    print("━"*50 + "\n  🎤  Voice Hermes\n" + "━"*50)
    print("  Enter → Sprechen → Antwort\n  'exit' zum Beenden\n" + "━"*50)
    while True:
        try: inp = input("\n🎤 [Enter] > ")
        except (EOFError, KeyboardInterrupt): break
        if inp.lower() in ("exit","quit","q"): break
        print(" 🎤 Sprich jetzt...", end=" ", flush=True)
        path, ok = record()
        if not ok: print("❌"); os.unlink(path); continue
        dur = os.path.getsize(path) / 16000 / 2
        print(f"✅ ({dur:.0f}s)  Transkribiere...", end=" ", flush=True)
        text = transcribe(path); os.unlink(path)
        if not text: print("⚠️ Nichts"); continue
        print("✅\n\n📝", text, "\n")
        print("🤔 ", end="", flush=True)
        print(ask_hermes(text) + "\n")
    print("\nBis bald! 🎤")

if __name__ == "__main__":
    main()
