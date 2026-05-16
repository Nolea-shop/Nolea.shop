# state.db Token Queries

The Hermes session store at `~/.hermes/state.db` (SQLite) contains real token usage data that can be queried instead of using synthetic/manual tracking.

## Schema (sessions table)

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    model TEXT,                    -- e.g. 'deepseek/deepseek-v4-flash'
    billing_provider TEXT,         -- 'nous', 'openrouter', 'gemini', 'anthropic'
    input_tokens INTEGER,
    output_tokens INTEGER,
    cache_read_tokens INTEGER,
    cache_write_tokens INTEGER,
    reasoning_tokens INTEGER,
    estimated_cost_usd REAL,
    actual_cost_usd REAL,
    cost_status TEXT,
    started_at TEXT,
    ended_at TEXT,
    ...
);
```

## Useful Queries

```python
import sqlite3
from pathlib import Path

db = Path.home() / ".hermes" / "state.db"
conn = sqlite3.connect(str(db))

# Token usage per provider
cur = conn.execute("""
    SELECT billing_provider,
           SUM(input_tokens) as input,
           SUM(output_tokens) as output,
           SUM(cache_read_tokens) as cache,
           SUM(input_tokens + output_tokens) as total
    FROM sessions
    WHERE ended_at IS NOT NULL
    GROUP BY billing_provider
    ORDER BY total DESC
""")
for row in cur:
    print(f"{row[0]}: {row[1]:,} in / {row[2]:,} out / {row[3]:,} cache = {row[4]:,} total")

# Top models by usage
cur = conn.execute("""
    SELECT model,
           COUNT(*) as sessions,
           SUM(input_tokens + output_tokens) as total
    FROM sessions
    GROUP BY model
    ORDER BY total DESC
    LIMIT 10
""")

# Recent session costs
cur = conn.execute("""
    SELECT model, billing_provider, estimated_cost_usd, started_at
    FROM sessions
    WHERE estimated_cost_usd > 0
    ORDER BY started_at DESC
    LIMIT 20
""")
```

## Dashboard Integration

The endpoint `/api/token-usage` in `dashboard-server.py` implements the above queries:

```python
def get_nous_tokens():
    """Holt echten Nous Token-Verbrauch aus state.db"""
    db = Path.home() / ".hermes" / "state.db"
    conn = sqlite3.connect(str(db))
    cur = conn.execute("""
        SELECT SUM(input_tokens), SUM(output_tokens),
               SUM(cache_read_tokens),
               SUM(input_tokens + output_tokens)
        FROM sessions WHERE billing_provider = 'nous'
    """)
    row = cur.fetchone()
    conn.close()
    return {"input": row[0], "output": row[1],
            "cache": row[2], "total": row[3], "status": "active"}
```

The JS in `index.html` fetches this every 30s and displays in the Token Card:
```javascript
async function fetchNousTokens() {
    const r = await fetch('/api/token-usage');
    const d = await r.json();
    const nous = d.nous;
    set('data-nous-tokens', (nous.total/1000000).toFixed(1) + 'M ('
        + (nous.input/1000000).toFixed(1) + 'M in / '
        + (nous.output/1000).toFixed(0) + 'K out)');
}
```

## Important

- `estimated_cost_usd` may be 0.0 for free-tier providers (Nous, free OpenRouter models)
- Active sessions (WHERE ended_at IS NULL) should be excluded or summed separately
- The DB file location is `~/.hermes/state.db` — use `Path.home() / ".hermes" / "state.db"` not a hardcoded path
