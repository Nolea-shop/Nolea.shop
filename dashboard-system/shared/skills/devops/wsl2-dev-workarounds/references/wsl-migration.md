# WSL Migration: Moving Distribution from C: to D: Drive

## Context
User needs to free C: drive space by moving WSL virtual disk (.vhdx) to D: drive.

## Prerequisites
- D: drive has sufficient free space (check with `df -h /mnt/d`)
- WSL distribution is shut down (no active terminals)

## Step-by-Step Migration (Windows PowerShell as Administrator)

### 1. List Current Distributions
```powershell
wsl -l -v
```

### 2. Export the Distribution
```powershell
# Create backup folder
mkdir D:\WSL-Backup

# Export (may take 5-15 minutes depending on size)
wsl --export Ubuntu D:\WSL-Backup\ubuntu-backup.tar
```

### 3. Unregister Old Distribution
```powershell
wsl --unregister Ubuntu
```

### 4. Import to New Location
```powershell
mkdir D:\WSL
wsl --import Ubuntu D:\WSL\Ubuntu D:\WSL-Backup\ubuntu-backup.tar --version 2
```

### 5. Verify
```powershell
wsl -l -v
# Should show: Ubuntu Running on D:\WSL\Ubuntu
```

## Important Notes

- **Do NOT export while running WSL** - can cause corruption
- **Default version is WSL2** (`--version 2`), use `--version 1` for WSL1
- The .vhdx file will be at `D:\WSL\Ubuntu\ext4.vhdx`
- Existing WSL sessions must be restarted after migration

## Common Errors

### "The service cannot be started"
- WSL service is stuck. Restart Windows or run `wsl --shutdown`

### "Access denied" on import
- Ensure no files are open in D:\WSL folder
- Run PowerShell as Administrator

### "Distribution already exists"
```powershell
wsl --unregister Ubuntu
# Then retry import
```