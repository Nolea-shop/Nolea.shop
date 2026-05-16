# Hermes state.db Schema Reference

Location: `~/.hermes/state.db`

## `sessions` table
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    user_id TEXT,
    model TEXT,
    model_config TEXT,
    system_prompt TEXT,
    parent_session_id TEXT,
    started_at REAL NOT NULL,        -- Unix timestamp
    ended_at REAL,                   -- Unix timestamp, NULL if still running
    end_reason TEXT,                 -- "new_session", "interrupted", "complete", etc.
    message_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    reasoning_tokens INTEGER DEFAULT 0,
    billing_provider TEXT,
    billing_base_url TEXT,
    billing_mode TEXT,
    estimated_cost_usd REAL,
    actual_cost_usd REAL,
    cost_status TEXT,
    cost_source TEXT,
    pricing_version TEXT,
    title TEXT,
    api_call_count INTEGER DEFAULT 0,
    handoff_state TEXT,
    handoff_platform TEXT,
    handoff_error TEXT,
    FOREIGN KEY (parent_session_id) REFERENCES sessions(id)
);
```

## `messages` table
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,               -- "user", "assistant", "tool", "system"
    content TEXT,
    tool_call_id TEXT,
    tool_calls TEXT,                  -- JSON array of tool call objects
    tool_name TEXT,
    timestamp REAL NOT NULL,          -- Unix timestamp
    token_count INTEGER,
    finish_reason TEXT,
    reasoning TEXT,
    reasoning_content TEXT,
    reasoning_details TEXT,
    codex_reasoning_items TEXT,
    ...
);
```

## Useful queries

### Today's sessions
```sql
SELECT id, title, started_at, ended_at, message_count, tool_call_count,
       input_tokens, output_tokens, estimated_cost_usd, end_reason
FROM sessions
WHERE started_at >= ? AND started_at < ?
ORDER BY started_at DESC;
```

### First user message + last assistant response per session
```sql
SELECT role, content, timestamp
FROM messages
WHERE session_id = ?
ORDER BY timestamp ASC;
```

### Today's total token usage
```sql
SELECT SUM(input_tokens + output_tokens) as total_tokens,
       COUNT(*) as session_count,
       SUM(estimated_cost_usd) as total_cost
FROM sessions
WHERE started_at >= ? AND started_at < ?;
```

## Notes
- `started_at` is a Unix timestamp (REAL). Convert to/from local time (CEST = UTC+2).
- Session `id` format: `YYYYMMDD_HHMMSS_*` or `cron_<job_id>`.
- FTS5 virtual table `messages_fts` for full-text search across messages.
- `ended_at` is NULL for currently running sessions.
