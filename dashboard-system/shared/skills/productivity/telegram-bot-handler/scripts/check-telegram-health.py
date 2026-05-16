#!/usr/bin/env python3
"""Quick health check for Telegram bot handler - alerts on blocked API or dead process"""
import requests
import sys
import os

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

if not BOT_TOKEN:
    print("ERROR: TELEGRAM_BOT_TOKEN not set")
    sys.exit(1)

try:
    resp = requests.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getMe", timeout=5)
    if resp.status_code == 200 and resp.json().get("ok"):
        print("OK: Telegram API reachable")
        print(f"Bot: @{resp.json()['result']['username']}")
    else:
        print(f"WARN: API returned {resp.status_code}")
        sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)