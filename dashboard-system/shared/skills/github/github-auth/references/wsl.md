# GitHub Auth on WSL

## Environment Notes

- WSL filesystem: `/home/username/` for Linux-native paths (DO NOT use `/mnt/c/` for git repos)
- Git credentials stored in `~/.git-credentials` (Linux home, not Windows)
- No sudo required for git-only auth setup

## Working Session Example (2026-05-03)

### Flow
1. User provided token directly in chat (acceptable in controlled WSL environment)
2. Set credential helper: `git config --global credential.helper store`
3. Saved credentials: `https://USERNAME:TOKEN@github.com` in `~/.git-credentials`
4. Verified with API call: `curl -H "Authorization: token $TOKEN" https://api.github.com/user`

### Key Points
- Token format: `ghp_...` classic personal access token
- Username must match GitHub login (not email)
- File permissions: `chmod 600 ~/.git-credentials`
- Works immediately - no browser flow needed on headless WSL

### Test Commands
```bash
# Verify credentials file
cat ~/.git-credentials

# Test API access
curl -s -H "Authorization: token ghp_xxx" https://api.github.com/user | head -5

# Test git operation
git ls-remote https://github.com/OWNER/REPO.git
```

### Pitfalls to Avoid
- Don't store repos under `/mnt/c/` - permission issues with npm/yarn
- Token in chat is acceptable for personal WSL but consider env vars for production
- git config user.name/email are required even if auth works