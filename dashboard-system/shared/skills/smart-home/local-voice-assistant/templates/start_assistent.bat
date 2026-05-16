@echo off
title Gemma 4 Sprachassistent
echo ============================================
echo   GEMMA 4 VOICE ASSISTANT - ALWAYS-ON
echo   Wake-Word: "Computer" (openWakeWord)
echo   3s Stille = Ende | Komplett lokal
echo ============================================
echo.

:: WSL Gemma Server starten
wsl -e bash -c "systemctl --user start gemma4-server 2>/dev/null || nohup ~/llama.cpp/build/bin/llama-server --model ~/.hermes/models/gemma4/gemma-4-E4B-it-Q5_K_M.gguf --port 8080 --host 127.0.0.1 --ctx-size 65536 --threads 16 > /dev/null 2>&1 &"
timeout /t 5 /nobreak >nul

:: Skript starten
set SCRIPT=%~dp0voice_assistant_windows.py
if not exist "%SCRIPT%" (
    echo FEHLER: %SCRIPT% nicht gefunden!
    pause
    exit /b 1
)

python3 "%SCRIPT%"
if %ERRORLEVEL% NEQ 0 python "%SCRIPT%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Installiere: pip install openwakeword sounddevice webrtcvad requests pyttsx3
    pause
)
