# Cron-Setup-Historie: API Key Leak Scanner

## Session vom 2026-05-17

### Was eingerichtet wurde
- Cron-Job `daily-api-key-scan` täglich um 20:00 Uhr
- Job-ID: `7714030fd8a8`
- Wrapper-Skript: `~/.hermes/scripts/scan-keys-daily.sh`
- Manueller Test mit `SCAN_DURATION=2 bash ~/.hermes/scripts/scan-keys-daily.sh`
- Langer Scan (45 Min.) im Hintergrund

### Vom Benutzer bestätigte Parameter
| Parameter | Wert |
|-----------|------|
| SCAN_DURATION | 45 Minuten |
| RATE_LIMIT_PAUSE | 0.8 Sekunden |
| OUTPUT_DIR | ~/.hermes/data/key-scanner |
| Cron-Zeit | 20:00 täglich |

### Ergebnis
Scanner funktioniert mit 3 gefundenen Leaks im Test:
- OpenAI API (sk-proj-*)
- GitHub PAT (ghp_*)
- Stripe Live (sk_live_*)

### Cron-Job prüfen / anpassen
```bash
# Liste alle Cron-Jobs
crontab -l

# Job entfernen und neu anlegen
crontab -l | grep -v "scan-keys-daily.sh" | crontab -
echo "0 20 * * * bash /home/damia/.hermes/scripts/scan-keys-daily.sh >> /home/damia/.hermes/logs/cron-scan.log 2>&1" | crontab -
```

### Ergebnis-JSON der Test-Session
`~/.hermes/data/key-scanner/scan_20260516_200234.json`

### Benutzer-Präferenz (wichtig für zukünftige Sessions)
Benutzer sagte "tuhe jetz alles rein" und "ja deplay" — sofortige Ausführung,
keine langen Erklärungen vor der Ausführung. Bei neuen Features: zuerst bauen/testen,
dann dokumentieren, nicht umgekehrt.
