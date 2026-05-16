# Telegram Bot Einrichtung

## Bot erstellen
1. @BotFather auf Telegram kontaktieren
2. `/newbot` senden
3. Name und Username wählen
4. Token speichern: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## Chat-ID ermitteln
```bash
# Nachricht an @RawDataBot oder @get_id_bot senden
# Oder mit curl:
curl "https://api.telegram.org/botTOKEN/getUpdates"
```

## In Production einsetzen
```bash
# Als Service
sudo systemctl edit --force --full telegram-handler.service
sudo systemctl enable --now telegram-handler

# In tmux/screen
tmux new-session -d -s telegram 'python3 telegram_handler.py'
```

## Token-Speicherung
- Nicht im Code hartcodieren
- Environment Variable: `TELEGRAM_BOT_TOKEN`
- Oder separate config.json mit gitignore