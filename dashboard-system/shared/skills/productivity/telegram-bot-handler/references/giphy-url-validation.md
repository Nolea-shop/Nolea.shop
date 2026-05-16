# Giphy URL Validation Guide

## The Problem
Giphy URLs in the format `https://media.giphy.com/media/{id}/giphy.mp4` frequently return 404.
Not all GIF IDs have MP4 versions available.

## Validation Method
Always test URLs before using in handler:

```python
import requests

url = "https://media.giphy.com/media/ID_HERE/giphy.mp4"
resp = requests.head(url, timeout=5, allow_redirects=True)
print(f"Status: {resp.status_code}")

# 200 = OK to use
# 404 = URL invalid
```

## Currently Working URLs (tested May 2026)

| Context | URL | Status |
|---------|-----|--------|
| Success/Greeting | `https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.mp4` | 200 ✓ |
| Goodbye/Sleep | `https://media.giphy.com/media/a7VjBxK0iZUsw/giphy.mp4` | 200 ✓ |

## Common Failing Patterns
- `3oKIPnmiqNhUIW7a28` - Returns 404 despite appearing in search results
- Any URL with "giphy.webp" instead of "giphy.mp4" - Telegram requires MP4

## Pro Tip
If one GIF ID works, use it for multiple contexts rather than hunting for unique ones.
The `/goodbye` moon GIF works well as a neutral fallback.