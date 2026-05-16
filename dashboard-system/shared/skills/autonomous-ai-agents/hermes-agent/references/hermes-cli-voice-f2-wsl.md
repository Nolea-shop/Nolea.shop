# WSL Voice Input (Ctrl+F2) Implementation Detail

The PTT (Push-to-Talk) implementation in `cli.py` for WSL/Windows users utilizes `ffmpeg.exe` and `faster-whisper`.

## Key Bindings
- **Ctrl+F2**: Main trigger.
- **F2**: Alias for Ctrl+F2.

## Logic Flow (PTT)
1. **First Press**: Starts background `ffmpeg.exe` process using `dshow` to capture from the Fifine Microphone. Sets `self._voice_recording = True`.
2. **Second Press (Cancel/Stop)**: 
   - Kills the recording process.
   - Sets the recording state to `None`.
   - **Critical**: Aborts the transcription thread before it calls Whisper, preventing accidental text insertion.
3. **Automatic Stop**: If not manually cancelled, the thread proceeds to `faster-whisper` (large-v3, int8, CPU) and inserts the result into the prompt buffer.

## Patch Reference (cli.py)
```python
        _f2_rec_state: list = [None]
        
        @kb.add("c-f2")
        def _f2_handler(event):
            # ... setup ffmpeg ...
            if _f2_rec_state[0] is not None:
                # STOP logic
                s = _f2_rec_state[0]
                if hasattr(s, 'terminate'):
                    s.terminate()
                _f2_rec_state[0] = None # Abort signal
                self._voice_recording = False
                event.app.invalidate()
                return
            
            # START logic
            _f2_rec_state[0] = True
            def _rec():
                # ... popen ffmpeg ...
                _f2_rec_state[0] = p
                p.wait()
                
                # ABORT CHECK
                if _f2_rec_state[0] is None:
                    # Clean up and exit thread
                    _os.unlink(wav)
                    return
                
                # PROCEED TO TRANSCRIPTION
                self._voice_processing = True
                # ... whisper logic ...
```
