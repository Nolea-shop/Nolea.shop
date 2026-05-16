# LLM Integration Notes for Telegram Handlers

## StepFun/step-3.5-flash Specific Quirks

### Response Field Mismatch
StepFun returns the main answer in the `reasoning` field, NOT `content`:

```python
# WRONG - only checks content
response = data['choices'][0]['message']['content']

# CORRECT - check reasoning first
reasoning = data['choices'][0]['message'].get('reasoning', '')
content = data['choices'][0]['message'].get('content', '')
response = reasoning or content or "Fallback"
```

### Environment Loading
Hermes .env files may not auto-load in Python scripts:

```python
# Add this at script start
def load_dotenv(path=".env"):
    try:
        with open(path) as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    key, val = line.strip().split("=", 1)
                    os.environ.setdefault(key, val)
    except:
        pass

load_dotenv(os.path.expanduser("~/.hermes/.env"))
```

### API Key Location
- File: `~/.hermes/.env`
- Variable: `OPENROUTER_API_KEY=sk-or-v1-...`
- Model: `stepfun/step-3.5-flash`

## Response Cleaning

StepFun reasoning often contains "Hmmm" or meta-commentary. Clean before sending:

```python
text = reasoning or content or ""
# Remove leading "Hmmm," or meta-analysis
if text.startswith("Hmm"):
    lines = text.split("\n")
    for line in lines:
        if not line.startswith("Hmm") and len(line) > 10:
            text = line
            break
return text.strip()
```