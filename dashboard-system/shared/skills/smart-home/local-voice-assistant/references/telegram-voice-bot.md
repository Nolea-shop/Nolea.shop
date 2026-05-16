Telegram Voice Bot for Local Voice Assistant
=============================================
File: telegram-voice-bot.py
Location: ~/.hermes/models/gemma4/telegram-voice-bot.py

Runs alongside (or alternating with) the Hermes Gateway.

Architecture:
- Voice messages → STT (faster-whisper in WSL) → Voice Assistant → TTS reply
- Text messages → Hermes Agent for complex tasks
- Slash commands: /spotify, /timer, /info

Key constraint: Telegram allows only ONE connection per bot token
  (Webhook XOR Polling). The Hermes Gateway uses Webhook by default.
  
Two deployment options:
  1. ALTERNATE: Use telegram-controller.sh to switch between Gateway and Voice Bot
  2. SEPARATE BOT: Create a second Telegram bot via @BotFather for voice only

Dependencies (Windows Python):
  pip install python-telegram-bot faster-whisper
  sudo apt-get install ffmpeg  (for audio conversion in WSL)

The bot token is read from TELEGRAM_BOT_TOKEN env var or hardcoded.
