# Backend API Patterns

## Grouped Calendar / Event Data

### Returning grouped data instead of flat lists
When the frontend needs to group by date, let the backend do it — eliminates duplicate
loops and keeps the interface clean. Pattern:

```python
def get_calendar():
    items = [...]
    grouped = {}
    for item in items:
        d = item["date"]
        if d not in grouped:
            dt = datetime.strptime(d, "%Y-%m-%d")
            grouped[d] = {
                "date": d,
                "day": dt.day,
                "weekday": dt.strftime("%A"),
                "weekday_short": dt.strftime("%a"),
                "is_today": d == today_str,
                "is_past": d < today_str,
                "items": [],
            }
        grouped[d]["items"].append(item)
    return list(grouped.values())
```

Benefits: frontend gets everything needed for grouping, sorting, and FTU display without
another pass over the list.

### Adding synthetic "reality" to demo data
When mocking data, always include past (done) and future (upcoming) items relative to
`datetime.now()`. Hardcoded static dates (`"2026-05-16"`) break within hours. Use:

```python
from datetime import timedelta
today = datetime.now()
items.append({"date": (today + timedelta(days=5)).strftime("%Y-%m-%d"), ...})
items.append({"date": (today - timedelta(days=1)).strftime("%Y-%m-%d"), ...})
```

### Month computation helper
Quickly compute month start / end for grid layouts:

```python
month_start = today.replace(day=1)
month_end = (today.replace(month=today.month+1, day=1) if today.month < 12
             else today.replace(year=today.year+1, month=1, day=1)) - timedelta(days=1)
month_days = (month_end - month_start).days + 1
month_start_weekday = month_start.weekday()  # 0 = Monday
```

## Auth JSON fallback pattern

`auth.json` → `credential_pool` → provider list. Not all providers have auth
configured at all times (e.g. Gemini API may return 401 even though the dashboard must
still show Nous data). Use defensive None / default returns; never re-raise:

```python
def get_openrouter_usage():
    try:
        auth = json.loads(AUTH_FILE.read_text())
        keys = [...]
        if not keys: return {"status": "no_key"}
        ...
    except:
        return {"status": "error", "message": str(e)[:80]}
```

Frontend then guards with `?.` or `|| {}` — ensures one broken endpoint does not
blank-out the entire data panel.
