# n8n Owner Lockout Recovery

## Symptoms
- Login returns `{"status":"error","message":"Unauthorized"}`
- CLI `npx n8n user:resetPassword` returns `Error: Command "user:resetPassword" not found`
- API `/rest/owner/setup` returns `{"code":400,"message":"Instance owner shell user not found"}`

## Root Cause
n8n 2.18.5 does NOT have `user:resetPassword` CLI command. Database state is inconsistent.

## Recovery Procedure

### Option A: Soft Reset (preserves workflows)
```bash
# 1. Stop n8n
kill $(ps aux | grep 'n8n start' | grep -v grep | awk '{print $2}')

# 2. Reset to default user state (keeps workflows)
cd /home/damia
npx n8n user-management:reset
# Returns: "Successfully reset the database to default user state."

# 3. Start n8n
npx n8n start --tunnel=false &
sleep 15

# 4. Recreate owner via API
curl -s -X POST http://localhost:5678/rest/owner/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.dev","password":"Admin1234!","firstName":"Admin","lastName":"User"}'

# 5. Login with correct field name
curl -s -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@local.dev","password":"Admin1234!"}'
```

### Option B: Nuclear Reset (deletes everything)
```bash
# 1. Stop n8n
kill $(ps aux | grep 'n8n start' | grep -v grep | awk '{print $2}')

# 2. Backup and delete database
mv /home/damia/.n8n/database.sqlite /home/damia/.n8n/database.sqlite.bak

# 3. Start n8n (creates fresh DB)
npx n8n start --tunnel=false &
sleep 15

# 4. Recreate owner (same as Option A Step 4)
```

## Critical Notes
- **Login API field is `emailOrLdapLoginId`**, NOT `email`
- `user-management:reset` clears users but may leave stale settings
- If `Instance owner shell user not found` persists, delete user row + settings flag manually:
  ```bash
  sqlite3 /home/damia/.n8n/database.sqlite "DELETE FROM user; DELETE FROM settings WHERE key='userManagement.isInstanceOwnerSetUp';"
  ```
- Password hash must be generated with bcrypt cost 10; use `python3 -c "import bcrypt; print(bcrypt.hashpw(b'Admin1234!', bcrypt.gensalt(10)).decode())"`

## Verified Credentials
- Email: `admin@local.dev`
- Password: `Admin1234!`
- Role: `global:owner`
