# n8n Integration with Hermes API Server

Complete workflow configuration for connecting n8n to Hermes Agent via HTTP Request Node.

## Prerequisites

1. Hermes Gateway running with API Server enabled
2. WSL IP address (for Windows n8n access)
3. API_SERVER_KEY set in `.env` (required for 0.0.0.0 binding)

## Getting WSL IP

In WSL terminal:
```bash
hostname -I | awk '{print $1}'
# Example output: 172.20.192.209
```

## Hermes Configuration

### config.yaml
```yaml
api_server:
  enabled: true
  port: 8642
  host: 0.0.0.0
```

### .env
```
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8642
API_SERVER_KEY=your-secret-key-here
GATEWAY_ALLOW_ALL_USERS=true
```

## n8n Workflow Setup

### Basic Workflow Structure
```
Manual Trigger (or Webhook)
    ↓
Set Node (optional - set message variable)
    ↓
HTTP Request Node ← Main configuration
    ↓
Process Response
```

### HTTP Request Node Configuration

**Main Settings:**
- **Method:** POST
- **URL:** `http://<WSL-IP>:8642/v1/chat/completions`
  - Replace `<WSL-IP>` with actual IP (e.g., `172.20.192.209`)
- **Authentication:** None
- **Send Body:** Yes
- **Body Content Type:** JSON

**JSON Body (Using JSON mode):**
```json
{
  "model": "hermes-agent",
  "messages": [
    {
      "role": "user",
      "content": "={{ $json.message }}"
    }
  ],
  "max_tokens": 500,
  "temperature": 0.7
}
```

**If using Set Node to define message:**
1. Add Set Node before HTTP Request
2. Set field `message` to your prompt (e.g., "Analyze this data")
3. In HTTP Request, reference with `={{ $json.message }}`

### Response Format

Hermes returns OpenAI-compatible response:
```json
{
  "id": "chatcmpl-...",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hallo! 👋"
      }
    }
  ],
  "usage": {...}
}
```

**To access response in n8n:**
```
={{ $json.choices[0].message.content }}
```

## Testing

### Windows Command Prompt Test
```cmd
curl http://172.20.192.209:8642/v1/chat/completions ^
  -X POST ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"hermes-agent\",\"messages\":[{\"role\":\"user\",\"content\":\"Hallo!\"}]}"
```

### WSL Internal Test
```bash
curl http://127.0.0.1:8642/v1/chat/completions \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"model":"hermes-agent","messages":[{"role":"user","content":"Test"}]}'
```

## Common Issues

### "Connection refused"
- Check if Gateway is running: `hermes gateway status`
- Verify WSL IP hasn't changed: `hostname -I`
- Check if port 8642 is open: `ss -tlnp | grep 8642`

### "Refusing to start: binding to 0.0.0.0 requires API_SERVER_KEY"
- Set `API_SERVER_KEY` in `.env`
- Or remove `API_SERVER_HOST=0.0.0.0` to use default 127.0.0.1

### n8n can't reach WSL
- WSL ports aren't automatically forwarded to Windows localhost
- Always use WSL IP (not localhost) in n8n when running in WSL
- Consider: `netsh interface portproxy` for permanent localhost forwarding

### 404 Not Found
- Wrong endpoint: Use `/v1/chat/completions` (not `/api/message`)
- Check if API Server is enabled in config.yaml

## Advanced: Workflow Examples

### 1. Webhook → Hermes → Slack
```
Webhook (receive data)
    ↓
HTTP Request (send to Hermes)
    ↓
Slack Node (post response)
```

### 2. Scheduled Prompt
```
Cron Node (every hour)
    ↓
HTTP Request (query Hermes)
    ↓
Email Node (send summary)
```

### 3. Data Processing Pipeline
```
Google Sheets (read rows)
    ↓
Loop (for each row)
    ↓
HTTP Request (analyze with Hermes)
    ↓
Google Sheets (write results)
```

## Security Notes

- API_SERVER_KEY is sent via `Authorization: Bearer <key>` header (if needed)
- For production, set a strong API_SERVER_KEY
- Consider firewall rules if exposing to network
- GATEWAY_ALLOW_ALL_USERS=true allows all requests (disable for production)
