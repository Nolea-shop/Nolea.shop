# Reddit OAuth2 Setup for n8n Workflows

## App Type Selection

**Choose "script" type** (not "web app") for scheduled n8n workflows:

- **script** — for server-side automation without user interaction
- **web app** — for interactive web applications with redirect flows

For scheduled Reddit scraping workflows, "script" is preferable because:
- No redirect URI management needed
- Tokens can be stored directly in n8n credentials
- Simpler configuration for headless/automated execution

## Setup Steps

### 1. Create Reddit App
1. Go to https://www.reddit.com/prefs/apps
2. Click "create app" at the bottom
3. Fill in:
   - **name**: `herzstuek` (or your project name)
   - **App type**: `script`
   - **redirect uri**: can be left blank or use default
4. Note the **client ID** (under the app name) and **secret**

### 2. Create n8n Credential
1. In n8n, go to Credentials → Add Credential
2. Select "OAuth2 API"
3. Configure:
   - **Name**: `reddit-oauth`
   - **Authentication**: OAuth2 API
   - **Grant Type**: Authorization Code
   - **Access Token URL**: `https://www.reddit.com/api/v1/access_token`
   - **Client ID**: (from Reddit app)
   - **Client Secret**: (from Reddit app)
   - **Scope**: `read`

### 3. Connect to HTTP Request Node
In your workflow's HTTP Request node:
```json
{
  "authentication": "oAuth2",
  "url": "https://oauth.reddit.com/r/{{$json.subreddit}}/hot.json",
  "options": {
    "headers": {
      "User-Agent": "YourBotName/1.0 by /u/username"
    }
  },
  "credentials": {
    "oAuth2Api": "reddit-oauth"
  }
}
```

## User-Agent Requirement

Reddit API requires a descriptive User-Agent header:
```
BotName/1.0 by /u/your_username
```

The format `AppID by /u/username` is required. Using generic or empty User-Agent may result in rate limiting or blocking.

## n8n OAuth2 Credential Type

**Credential type name in n8n**: `redditOAuth2Api` (not `oAuth2Api`).

When creating the credential via REST API:
```python
new_cred = {
    "name": "Reddit OAuth2",
    "type": "redditOAuth2Api",
    "data": {
        "accessToken": "placeholder_token_for_testing"
    }
}
result = subprocess.run([
    "curl", "-s", "-b", cookie_file, "-X", "POST",
    "http://localhost:5678/rest/credentials",
    "-H", "Content-Type: application/json",
    "-d", json.dumps(new_cred)
])
# Response includes credential ID, e.g. "ynUrtWfZbFtFZM2D"
```

**Critical**: Even a placeholder token causes Reddit to block with an HTML error page when n8n adds `Authorization: Bearer placeholder_token`. Reddit's OAuth2 rejects invalid Bearer tokens with a block page (not JSON). The HTTP Request node still returns `1 item` but with HTML content. **Always use real tokens in production credentials.**

### Diagnosing Bearer Token Issues

**Timing-based diagnosis**: A real API response takes ~200-400ms. A block page is much faster (~50-100ms). Compare execution times between direct curl (non-Docker) and n8n execution.

**Verification via direct curl** — this works from WSL terminal:
```bash
# With valid Bearer token → 10 posts
curl -s -H "User-Agent: n8n-research-bot-v1.0 (by /u/dein_reddit_name)" \
  "https://www.reddit.com/search.json?q=glutenfrei&sort=new&limit=3"
# Returns: dist:10, children:[...] — ~15 KB

# With invalid Bearer token → 1.5 KB block page
curl -s -H "User-Agent: n8n-research-bot-v1.0 (by /u/dein_reddit_name)" \
  -H "Authorization: Bearer invalid_token" \
  "https://oauth.reddit.com/search.json?q=glutenfrei&sort=new&limit=3"
# Returns: <html>...whoa there, pardner!...</html>
```

## Common Pitfalls

| Symptom | Fix |
|---------|-----|
| 401 Unauthorized | Check User-Agent header format |
| 429 Too Many Requests | Add delay between requests (Reddit allows ~60/min) |
| Empty response | Verify OAuth scope includes `read` |
| Redirect URI mismatch | Use "script" app type to avoid redirect issues |
| `dist:0, children:[]` despite 200 HTTP | Invalid/placeholder Bearer token — Reddit returned block page |
| Empty despite correct token from terminal | Docker IP blocked — Reddit blocks cloud provider IPs |
| Node returns 1 item but data is HTML | Reddit OAuth2 credential has invalid token |