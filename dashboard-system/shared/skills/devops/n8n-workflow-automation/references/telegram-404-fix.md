# Telegram Node 404 "Not Found" Fix (n8n 2.18.5)

## Symptom
Telegram node fails with:
```
{
  "errorMessage": "The resource you are requesting could not be found",
  "errorDetails": {
    "rawErrorMessage": ["404 - {\"ok\":false,\"error_code\":404,\"description\":\"Not Found\"}"]
  }
}
```

## Root Causes
1. Invalid/expired Telegram bot token
2. Mismatched credential ID in workflow JSON (old credential deleted, new one not updated)
3. Wrong chat ID (using bot ID instead of user's personal Telegram ID)

## Step-by-Step Fix

### 1. Verify Bot Token
```bash
# Get bot info (replace <TOKEN> with your bot token from @BotFather)
curl -s "https://api.telegram.org/bot<TOKEN>/getMe"
# Expected success response:
# {"ok":true,"result":{"id":<BOT_ID>,"is_bot":true,"first_name":"...","username":"..._bot"}}
```

### 2. Verify Chat ID
```bash
# Get your personal Telegram ID from @userinfobot in Telegram
# Test sending a message to confirm chat ID works
curl -s "https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<YOUR_CHAT_ID>&text=test"
# Expected success response: {"ok":true,"result":{"message_id":...,"chat":{"id":<YOUR_CHAT_ID>,...}}}
```

### 3. Reset n8n Telegram Credentials
```bash
# 3a. Delete old n8n credential (get old ID from workflow JSON or n8n UI)
curl -s -b /tmp/n8n_cookie.txt -X DELETE "http://localhost:5678/rest/credentials/<OLD_CRED_ID>"

# 3b. Create new credential with correct token
curl -s -b /tmp/n8n_cookie.txt -X POST "http://localhost:5678/rest/credentials" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Telegram API",
    "type": "telegramApi",
    "data": {
      "accessToken": "<YOUR_NEW_TOKEN>"
    }
  }'
# Note the new credential ID from the response (e.g., "id":"sbuybXkzyK8osS7D")
```

### 4. Update Workflow JSON
1. Open your workflow JSON file (e.g., `arena_workflow_final.json`)
2. Replace all instances of old credential ID with the new one in Telegram nodes:
   ```json
   "credentials": {
     "telegramApi": {
       "id": "<NEW_CRED_ID>",  // Updated from old ID
       "name": "Telegram API"
     }
   }
   ```
3. Re-import the workflow via API:
   ```bash
   # Archive old workflow first
   curl -s -b /tmp/n8n_cookie.txt -X POST "http://localhost:5678/rest/workflows/<OLD_WORKFLOW_ID>/archive"
   # Delete old workflow
   curl -s -b /tmp/n8n_cookie.txt -X DELETE "http://localhost:5678/rest/workflows/<OLD_WORKFLOW_ID>"
   # Create new workflow with updated credentials
   curl -s -b /tmp/n8n_cookie.txt -X POST "http://localhost:5678/rest/workflows" \
     -H "Content-Type: application/json" \
     -d @updated_workflow.json
   ```

### 5. Activate Workflow
```bash
# Get new workflow ID from previous response, retrieve versionId
NEW_WORKFLOW_ID="<NEW_ID>"
VERSION_ID=$(curl -s -b /tmp/n8n_cookie.txt "http://localhost:5678/rest/workflows/$NEW_WORKFLOW_ID" | jq -r '.data.versionId')

# Activate with correct versionId
curl -s -b /tmp/n8n_cookie.txt -X POST "http://localhost:5678/rest/workflows/$NEW_WORKFLOW_ID/activate" \
  -H "Content-Type: application/json" \
  -d "{\"versionId\": \"$VERSION_ID\"}"
```

## Prevent Future Issues
- Always verify bot token and chat ID before creating n8n credentials
- Use @userinfobot to get your correct personal Telegram ID (not the bot's ID)
- Test Telegram sendMessage manually before configuring n8n nodes