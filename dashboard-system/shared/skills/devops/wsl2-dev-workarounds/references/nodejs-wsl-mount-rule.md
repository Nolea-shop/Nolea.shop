# WSL2 Node.js Mount Rule — Technical Detail

## Problem Statement

NTFS (Windows-Dateisystem) kann über `/mnt/c/`, `/mnt/d/` in WSL2 gemountet werden, aber es **fehlt vollständige Linux-Permissions-Semantik**. Node.js-Ökosystem (npm, yarn, pnpm, node-gyp) setzt voraus:

- `chmod` auf Dateien und Verzeichnisse
- `futime` (Datei-Zeitstempel setzen)
- Erstellung von ausführbaren Bit-Flags (z.B. `node_modules/.bin/`-Tools)
- Erstellung von Shared-Libraries (`.node`-Addons)

NTFS unter WSL2 unterstützt diese Operationen **nicht** oder emuliert sie unzuverlässig → EPERM-Fehler.

## Symptome (konkret)

```
npm ERR! code EPERM
npm ERR! syscall chmod
npm ERR! path /mnt/d/project/node_modules/.bin/eslint
npm ERR! errno -1
npm ERR! Operation not permitted, chmod '/mnt/d/project/node_modules/.bin/eslint'
```

```
pnpm ERR! EPERM: operation not permitted, futime '/mnt/d/project/node_modules/...'
```

```
node-gyp ERR! build error
... cannot create output file ... Permission denied
```

## Lösungen

### 1. Projekt unter `/home/<user>/` anlegen (empfohlen)
```bash
# RICHTIG
mkdir -p ~/projects/my-node-app
cd ~/projects/my-node-app
npm init -y && npm install

# FALSCH (garantiert EPERM)
cd /mnt/d/project && npm install   # Bricht ab
```

### 2. Vorhandenes Projekt migrieren
```bash
# 1) Neues Ziel unter /home/ erstellen
mkdir -p ~/nolea-brain-app

# 2. Kopieren (nicht verschieben, da NTFS→ext4)
cp -r /mnt/d/hermes/NOLEA_BRAIN_APP/* ~/nolea-brain-app/

# 3. In neuem Verzeichnis npm install ausführen
cd ~/nolea-brain-app
npm install   # Erfolgreich – keine EPERM

# 4. Altes Verzeichnis optionally löschen
rm -rf /mnt/d/hermes/NOLEA_BRAIN_APP
```

**Wichtig:** Bei großen Projekten (>1GB) `rsync -av --progress` verwenden statt `cp`, um Timeouts zu vermeiden.

### 3. Wenn C: Drive voll ist – WSL2-VM auf D: verschieben

Nicht das Projekt auf `/mnt/d/` verschieben, sondern die gesamte WSL2-Installation verlegen:

```powershell
# In Windows PowerShell (Admin)
wsl --export Ubuntu D:\WSL-Backup\ubuntu.tar
wsl --unregister Ubuntu
wsl --import Ubuntu D:\WSL\Ubuntu D:\WSL-Backup\ubuntu.tar --version 2
```

Dann ist `/home/damia/` bereits auf D: als ext4-Dateisystem, und Node.js-Projekte können dort normal arbeiten.

## Tech Deep Dive – Warum genau schlägt chmod auf NTFS fehl?

WSL2 verwendet `drvfs` (Driver File System) als Bridge zwischen Linux-Syscalls und Windows NTFS. Diese Emulation unterstützt:
- Lesen/Schreiben von Dateiinhalten ✅
- Verzeichnisauflistung ✅
- **Aber:** `chmod` wird ignoriert (Dateien sind immer lesbar/schreibbar gemäß Windows ACLs), `futime` wird teilweise unterstützt, aber nicht atomar.

Node.js-Ökosystem-Annahmen:
- `npm install` führt `fs.chmodSync(bin, 0o755)` für `.bin`-Wrapper aus → Failure auf drvfs
- `node-gyp` kompiliert native Addons und nutzt `process.umask()` → Inkonsistente Permissions
- `pnpm` verwendet Hardlinks und symlinks auf `.bin` → `operation not permitted, link`

Resultat: Installationsabbruch bei EPERM.

## Workaround (nur wenn Migration unmöglich)

Falls das Projekt **zwingend** auf `/mnt/d/` liegen muss (weil z.B. Windows-Tools darauf zugreifen):

```bash
# npm install mit deaktivierten Postinstall-Skripts
npm install --ignore-scripts

# Dann native Module einzeln neu bauen (nutzt jetzt ext4-Permissions bei node-gyp)
npm rebuild better-sqlite3
npm rebuild sharp

# Überprüfen, ob .node-Binaries erstellt wurden
find node_modules -name "*.node" | wc -l   # sollte >0 sein
```

**Risiko:** Diese Umgehung funktioniert nicht für alle Pakete (z.B. Pakete mit `install`-Skript, die Dateien außerhalb `node_modules` kopieren). Die stabile Lösung ist **immer** Migration zu `/home/`.

## Checkliste vor npm/yarn/pnpm

- [ ] Projektverzeichnis unter `/home/<user>/`?  → Nein = sofort migrieren
- [ ] `ls -ld .` zeigt `drwxr-xr-x` und gehört `$USER`? → Falls `root` oder andere UID, Permission-Probleme wahrscheinlich
- [ ] `node --version` ist 18.x oder 20.x (n8n-Stack benötigt ≥18)?
- [ ] Falls n8n: `n8n start` try — falls `ERR_OSSL_EVP_UNSUPPORTED` auftritt, OpenSSL 3 Legacy Provider in Node.js 18/20 fehlt → Node 20 verwenden oder `NODE_OPTIONS=--openssl-legacy-provider` setzen

## Bekannte Projekte mit dieser Regel

| Projekt | Alter Pfad (NTFS) | Neuer Pfad (ext4) |Status |
|---------|------------------|-------------------|--------|
| NOLEA_BRAIN_APP | `/mnt/d/hermes/NOLEA_BRAIN_APP` | `/home/damia/nolea-brain-app` | ✅ Produktiv, Build erfolgreich |
| CrazyGames Factory | `D:\hermes\crazygames-factory\` | geplant, falls npm-Probleme auftreten | ⚠️ Noch auf D: |
| Hermes Agent selbst | `~/.hermes/` (standard) | — | ✅ Bereits unter /home/ |

## Fragen & Antworten

**Q: Kann ich symlinks von /mnt/d/ nach /home/ verwenden?**
A: Ja, aber das umgeht nur das Symptom. Der Node.js-Prozess arbeitet trotzdem auf NTFS, wenn der Link-Zielpfad auf `/mnt/` verweist. Symlink auf `/home/`-Ziel ist OK — aber dann muss das **Ziel** unter `/home/` liegen.

**Q: Was ist mit Docker-Containern in WSL2?**
A: Docker-Container nutzen ihr eigenes OverlayFS. Diese Regel gilt nur für den **Host-Workspace**, wo `npm install` läuft. Container-Volumes von `/mnt/` in den Container sind in Ordnung, da die Permission-Semantik innerhalb des Containers eigenständig ist.

**Q: Meine SSD ist auf C: und voll. Was tun?**
A: WSL2-VM auf D: verschieben (siehe Abschnitt 3 oben). Nicht die Projekte auf `/mnt/d/` lassen.

**Q: Gilt das auch für Python/virtualenv?**
A: Teilweise. Python installiert meist reine Python-Pakete (keine nativen Addons), daher funktioniert es oft. Aber Pakete mit C-Extensions (z.B. `numpy`, `opencv-python`) **können** ähnliche Probleme haben. Best Practice: alle Dev-Projekte unter `/home/`.
