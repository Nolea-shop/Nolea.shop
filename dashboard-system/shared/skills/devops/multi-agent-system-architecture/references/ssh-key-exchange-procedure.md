# SSH Key Exchange Procedure (Multi-Agent Sync)

## Overview

Documented from session 2026-05-16: Establishing rsync-based cross-device
sync between Damian/Suffix and Jeff's Server (jlhome6353).

## Key Design: One Key Per Sync Target

Generate a dedicated Ed25519 key for **each** peer-to-peer connection.
Never reuse the same key for multiple targets.

```bash
# On the SENDER machine
ssh-keygen -t ed25519 -C "<label>" -f ~/.ssh/id_ed25519_<alias>
# Example:
ssh-keygen -t ed25519 -C "server@jlhome6353" -f ~/.ssh/id_ed25519_jlhome
```

Result:
- Private key: `~/.ssh/id_ed25519_jlhome` (stays on sender — do not copy)
- Public key: `~/.ssh/id_ed25519_jlhome.pub` (copy to target)

## Public Key Placement

On the **TARGET** machine:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
<contents of sender's id_ed25519_<alias>.pub>
EOF
chmod 600 ~/.ssh/authorized_keys
```

**Only the public key goes into `authorized_keys`** — never add a private key.

## SSH Config Host Alias

On the sender's `~/.ssh/config`, add a host entry even before the target's IP is known:

```ssh-config
Host <alias> <alias2>
    HostName 100.x.x.x        # Replace with actual Tailscale IP when known
    User <target-username>
    IdentityFile ~/.ssh/id_ed25519_<alias>
    IdentitiesOnly yes
```

**Alias naming:** Strip non-alphanumeric chars from the label, allow space-separated aliases.

**When the Tailscale IP becomes known:** Edit `HostName` — no need to regenerate the key.
If both machines already share keys, `ssh <alias>` will connect immediately.

## rsync over SSH

```bash
# Sender → Target (sender's private key, target's authorized_keys has sender's pubkey)
rsync -avz -e "ssh -i ~/.ssh/id_ed25519_<alias> -o StrictHostKeyChecking=no" \
  ~/.hermes/shared/ <alias>:~/.hermes/shared/

# Target → Sender (same keys, opposite direction)
rsync -avz -e "ssh -i ~/.ssh/id_ed25519_<alias> -o StrictHostKeyChecking=no" \
  <alias>:~/.hermes/shared/ ~/.hermes/shared/
```

## Bidirectional Trap

`rsync` in a single direction overwrites the target. For true bidirectional sync:

- Use `rsync --update` + `--backup` (simplest)
- Or use `unison` (two-way aware, more complex setup)

A single rsync command cannot simultaneously propagate changes in both directions without conflict.

## Checklist: Add a New Peer

```
[ ] Tailscale installed + logged in on target (same account: babyprobo.09@gmail.com)
[ ] Ed25519 key generated on sender (label + alias)
[ ] Public key copied to target's ~/.ssh/authorized_keys
[ ] ~/.ssh/config updated on sender (Host alias, IdentityFile, placeholder HostName)
[ ] Tailscale IP of target added to multi-agent-sync.sh
[ ] First `ssh <alias>` test (accept host key prompt)
[ ] agents.yaml / agents config updated on both sides
```

## Case Study: Damian → Jeffs Server (`jlhome6353`)

| Step | Status |
|------|--------|
| Key generated (`server@jlhome6353`) | ✅ Done 2026-05-17 |
| Public key saved (`~/.ssh/id_ed25519_jlhome.pub`) | ✅ Done |
| SSH config alias created (`jlhome / jlhome6353`) | ✅ Done |
| Public key on Jeffs `authorized_keys` | ⏳ Pending |
| Tailscale IP on Jeffs Server known | ⏳ Pending |
| rsync job activated | ⏳ Pending |

The public key is ready — it just needs to be appended to Jeffs
`~/.ssh/authorized_keys` by someone with shell access to Jeff's Server.

## Lessons Captured

1. **Separate key per direction** = simpler audit, clean revocation per device
2. **Generate key on the sender**, not on the target — private key stays with sender
3. **Placeholder HostName in SSH config** is fine as long as `Host` alias matches the rsync target name
4. **`ssh-copy-id` is fine for same-net setups** — here we couldn't reach yet (target IP unknown) so we saved the pubkey locally and waited for the target's authorized_keys entry
5. **Private key on target = wrong direction** — if you already have a private key on the target machine, you need to swap: save the new key as pubkey locally, and the old private key becomes the sender's private key on the other side
