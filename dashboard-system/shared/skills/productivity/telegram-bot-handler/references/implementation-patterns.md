# Telegram Bot Handler - Implementation Patterns

## Smart Response Flow

```python
# Intelligent message handling pattern
def process_message(text, chat_id, sender_name):
    text_lower = text.strip().lower()
    
    # Name detection for personalized response
    if "jiff" in text_lower:
        send_message("Ey, da bin ich schon!", chat_id)
        return
    
    # Commands section (minimal)
    if text_lower.startswith("/"):
        # Handle /start, /help, /ask
    
    # Question detection -> LLM response
    if "?" in text:
        response = llm_reply(text, sender_name)
        send_message(response, chat_id)
        return
    
    # Context-based GIF with rotation
    context = detect_gif_context(text)
    if context and should_respond_with_gif(text):
        gif_url = get_random_gif(context, chat_id)  # Avoids repetition
        send_animation(gif_url, chat_id)
```

## Diverse GIF Rotation Pattern

```python
# Multiple URLs per category + recent-use tracking
GIF_POOLS = {
    "greeting": [url1, url2, url3],  # Multiple options
}

LAST_USED_GIFS = {}  # Per-chat tracking

def get_random_gif(category, chat_id):
    pool = GIF_POOLS.get(category, GIF_POOLS["fun"])
    last_used = LAST_USED_GIFS.get(chat_id, [])
    available = [g for g in pool if g not in last_used[-2:]]
    if not available:
        available = pool
    chosen = random.choice(available)
    LAST_USED_GIFS.setdefault(chat_id, []).append(chosen)
    return chosen
```

## Boomer Persona Prompt

```
Du bist Jiff, ein 55-jähriger digital-affiner Senior.
- Kurz und prägnant (max 2-3 Sätze)
- Trockener, leicht ironischer Boomer-Humor  
- Gelegentliche altertümliche Redewendungen
- Freundlich aber nicht aufdringlich
- Keine langen Erklärungen
```

## Deployment Notes

- **Privacy Mode**: Must be disabled for group messages without @mention
- **Background process**: `terminal(background=true)` not `nohup`
- **API Key**: Store in `.env` file, source before running