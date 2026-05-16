# Troubleshooting — Windows Local Voice Assistant

## "Notch schließt sich sofort" / BAT-Fenster verschwindet

**Ursache**: BAT hat keinen `pause`-Befehl am Ende, oder Python-Skript crasht sofort.

**Fix**:
```bat
:: Am Ende der BAT:
echo.
echo Drueck Enter zum Schliessen...
pause >nul
```

Im Python-Skript alle `sys.exit(1)` durch `input("Enter...")` ersetzen.

## `tkinter.TclError: invalid color name "#00000000"`

**Ursache**: 8-stelliger Hex-Farbwert mit Alpha-Kanal (`#RRGGBBAA`). tkinter unterstützt NUR 6-stellige Hex-Farben.

**Fix**: `#00000000` → `#000001` (transparente Fensterfarbe)

## Erstes Wort fehlt in Transkription

**Ursache**: VAD-Check und Aufnahme nutzen zwei separate `sounddevice.InputStream` → Audio-Lücke dazwischen.

**Fix**: Ein einziger Stream. VAD-Phase sammelt Audio in Buffer, Recording-Phase übernimmt Buffer:

```python
with sd.InputStream(...) as s:
    # VAD: sammelt in audio_buf
    while not detected:
        audio_buf.extend(s.read(FRAME)[0].tobytes())
    
    # Recording: übernimmt Buffer
    vad = VAD()
    vad.buf = bytearray(audio_buf)  # !KRITISCH
    while True:
        if vad.feed(s.read(FRAME)[0].tobytes()) == "STOP": break
```

## Gemma wird nicht erkannt

**Ursache 1**: "Gemma" wird als "Jemma", "Gamma", "Gema" transkribiert.

**Fix**: Prüfe im gesamten Text per `.find()`, nicht nur `.split()[0]`:
```python
idx = text.lower().find('gemma')
```

**Ursache 2**: VAD zu aggressiv (Mode 2/3) → Sprache wird nicht erkannt.

**Fix**: `webrtcvad.Vad(1)` statt `Vad(2)`.

**Ursache 3**: Falsches Mikrofon ausgewählt.

**Fix**: Mikrofon-Liste ausgeben und spezifisches Device setzen (siehe "Mikrofon-Auswahl").

## TTS funktioniert nicht

**Ursache 1**: `pygame` Installation scheitert an Python 3.14+.

**Fix**: Statt pygame → `playsound` verwenden:
```cmd
pip install edge-tts playsound
```
```python
from playsound import playsound
playsound(mp3_file)
```

**Ursache 2**: Edge-TTS braucht Internet (Cloud-API).

**Fallback**: pyttsx3 (Windows SAPI5, offline, roboterhafter):
```python
import pyttsx3
tts = pyttsx3.init()
```

## "No module named 'distutils.msvccompiler'" bei pip install

**Ursache**: Python 3.14+ hat `distutils` entfernt. Betrifft Pakete, die aus Source bauen müssen (z.B. pygame).

**Fix**: Nur Pakete mit vorkompilierten Wheels installieren. `playsound` statt `pygame`, `edge-tts` statt lokaler TTS.

## Mikrofon-Auswahl

```python
import sounddevice as sd
devices = sd.query_devices()
for i, dev in enumerate(devices):
    print(f"  [{i}] {dev['name']} (in: {dev['max_input_channels']}, out: {dev['max_output_channels']})")
    if 'fifine' in dev['name'].lower():
        sd.default.device = i
```

## VAD-Empfindlichkeit anpassen

```python
# webrtcvad.Vad(level) — level 0-3
Vad(0)  # Zu lasch, nimmt auch Hintergrund auf
Vad(1)  # Empfohlen für die meisten Umgebungen
Vad(2)  # Aggressiv, braucht laute klare Sprache
Vad(3)  # Sehr aggressiv, nur bei nah am Mikrofon

# Auch die Frame-Zahl anpassen:
sframes > 2   # Schnelle Reaktion (ca. 60ms)
sframes > 5   # Sicherer, aber verzögert (ca. 150ms)
```

## WSL STT schlägt fehl

**Ursache**: WSL-Pfad nicht korrekt konvertiert.

**Fix**:
```python
wsl_path = windows_path.replace('\\', '/')
# Windows: D:\... → WSL: /mnt/d/...
# Aber besser: Temp-Datei in WSL /tmp/ verwenden
```

## BAT findet Python nicht

**Ursache**: Python nicht im PATH oder nur `python3` vs `python`.

**Fix**:
```bat
:: Prüfe beide Varianten
where python >nul 2>&1 && goto :run || where python3 >nul 2>&1 || goto :error
:run
python "%SCRIPT%"
```

## Potentielle Python 3.14-Probleme

Python 3.14 (Comprehensive Error Messages):
- `[ONNXRuntimeError] : 3 : NO_SUCHFILE` — openWakeWord Modelldatei nicht gefunden. Fix: `download_models()` vor erstem Use.
- `ModuleNotFoundError: No module named 'distutils'` — `setuptools` muss aktuell sein: `pip install --upgrade setuptools`
