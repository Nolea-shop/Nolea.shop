# Cross-Device Dashboard Access

## Übersicht

Das Multi-Agent Dashboard läuft auf **Damians PC (Suffix/WSL)** auf Port **8383**.
Andere Main Agents (NAME auf Julian's Server, Claudi/Cloudy auf Julian's PC) können
das Dashboard via Tailscale erreichen.

**Basis-URL (via Tailscale):** `http://100.103.196.11:8383`

## Voraussetzung: Tailscale

BEIDE Systeme müssen im selben Tailscale-Account sein (`babyprobo.09@gmail.com`).

### Installation auf Julian's Server (Linux)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Im Browser-Login: babyprobo.09@gmail.com
```

### Installation auf Julian's PC (Windows)

https://tailscale.com/download → Installieren → Mit gleichem Account anmelden

## SSH Key Exchange — Completed / Pending

### Damian → Jeffs Server (`jlhome6353`) ✅ Public Key gespeichert

| Bezeichnung | Wert |
|-------------|------|
| **Key-Typ** | Ed25519 |
| **Label** | `server@jlhome6353` |
| **Öffentlicher Key (lokal)** | `~/.ssh/id_ed25519_jlhome.pub` |
| **Privater Key** | Auf Jeffs Server (nicht lokal) |
| **SSH-Config Alias** | `jlhome / jlhome6353` (HostName noch `100.x.x.x` Platzhalter) |
| **Richtung** | rsync Jeff → Damian (öff. Key auf Jeffs `authorized_keys`) |
| **Status** | ⏳ Public Key muss noch auf Jeffs `authorized_keys` |

**Benötigter Eintrag auf Jeffs Server** (als Benutzer `damia` ausführen):

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1LZDI1NTE5AAAAIEwjNVPIY025wiCDhh43PMGm3eCXiMA0pfM+IKsniNF/ server@jlhome6353
EOF
chmod 600 ~/.ssh/authorized_keys
```

Sobald Jeffs **exakte Tailscale-IP** bekannt ist, `HostName` in `~/.ssh/config` ersetzen und rsync-Job aktivieren.

### Noch ausstehend

- **NAME** (Julian's Server) — SSH-Key + Tailscale-IP ausstehend
- **Claudi/Cloudy** (Julian's PC) — SSH-Key + Tailscale-IP ausstehend

Prozedur: `multi-agent-system-architecture` → Abschnitt **5. Cross-Device Sync — SSH Keys & rsync Pattern**.

## Verfügbare Endpoints