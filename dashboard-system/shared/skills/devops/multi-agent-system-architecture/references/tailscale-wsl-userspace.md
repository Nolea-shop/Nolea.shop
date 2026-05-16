# Tailscale on WSL2 — Userspace Mode (no sudo)

## Installation (no sudo binary install)

```bash
cd /tmp
curl -fsSL https://pkgs.tailscale.com/stable/tailscale_1.80.0_amd64.tgz -o tailscale.tgz
tar xzf tailscale.tgz
mkdir -p ~/.local/bin
cp tailscale_*/tailscale ~/.local/bin/
cp tailscale_*/tailscaled ~/.local/bin/
chmod +x ~/.local/bin/tailscale ~/.local/bin/tailscaled
```

## Start (userspace networking, no root)

```bash
# Start daemon
~/.local/bin/tailscaled \
  --tun=userspace-networking \
  --socks5-server=localhost:1055 \
  --outbound-http-proxy-listen=localhost:1055 \
  --state=/home/$USER/.local/share/tailscale/tailscaled.state \
  --socket=/home/$USER/.local/share/tailscale/tailscaled.sock \
  --port=0

# Authenticate (visit the URL in Windows browser)
~/.local/bin/tailscale --socket=/home/$USER/.local/share/tailscale/tailscaled.sock up
```

## ⚠️ CRITICAL: Tilde `~` is NOT expanded by tailscaled

**Never use `~` in paths.** This causes the socket and state to be written to a literal `~` directory at `/home/$USER/~/` instead of `/home/$USER/`.

**Wrong:** `--state=~/.local/share/tailscale/tailscaled.state`  
**Right:** `--state=/home/damia/.local/share/tailscale/tailscaled.state`

### Recovery from tilde-mistake

If you already ran tailscaled with `~` paths, the auth state is stored at:
```
/home/$USER/~/.local/share/tailscale/
```

Copy it to the correct location:
```bash
cp "/home/$USER/~/.local/share/tailscale/tailscaled.state" \
   /home/$USER/.local/share/tailscale/tailscaled.state
rm -rf "/home/$USER/~"
```

## Autostart via systemd user service

Create `~/.config/systemd/user/tailscaled.service`:

```ini
[Unit]
Description=Tailscale VPN (userspace, no-root WSL)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=%h/.local/bin/tailscaled \
    --tun=userspace-networking \
    --socks5-server=localhost:1055 \
    --outbound-http-proxy-listen=localhost:1055 \
    --state=%h/.local/share/tailscale/tailscaled.state \
    --socket=%h/.local/share/tailscale/tailscaled.sock \
    --port=0
ExecStop=%h/.local/bin/tailscale --socket=%h/.local/share/tailscale/tailscaled.sock down
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Then:
```bash
systemctl --user daemon-reload
systemctl --user enable --now tailscaled.service
```

Note: `%h` in systemd user services DOES expand to the home directory correctly (unlike `~` in shell).

## Status check

```bash
~/.local/bin/tailscale --socket=/home/$USER/.local/share/tailscale/tailscaled.sock status
```

Expected output:
```
100.x.x.x  <hostname>  <email>@<provider>  linux  -
```

DNS warnings about "getting OS base config is not supported" are normal for userspace-mode on WSL and can be ignored.

## Notes

- Port 1055: SOCKS5 proxy (optional)
- Port 1055: HTTP outgoing proxy (optional)
- Taildrop requires a state directory — not available in userspace mode with socket path override
- Logs go to `~/.local/share/tailscale/tailscaled.log*.txt`