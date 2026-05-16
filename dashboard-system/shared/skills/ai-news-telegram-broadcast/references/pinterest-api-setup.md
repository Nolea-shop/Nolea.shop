# Pinterest API v5 Setup Notes

## App Registration
1. Go to https://developers.pinterest.com/ and create a Business account
2. Create a new app under "My apps"
3. Note the App ID and App Secret

## Authentication Pitfalls (Discovered May 2026)
- **New apps start in "Trial" mode** - API returns `"Your application consumer type is not supported"` until the app is submitted for review
- **Sandbox environment** (`api-sandbox.pinterest.com`) also requires the app type to be set to "Public" first
- **Required flow**: Submit app for review under "App submission" with description + privacy policy → wait 1-2 days for approval → generate Production token with full `pins:write, boards:write` scopes

## Token Scopes Needed for Posting
- `pins:read` - List/read pins
- `pins:write` - Create new pins
- `boards:read` - List available boards
- `boards:write` - Create boards (optional)
- `user_accounts:read` - Verify identity

## API Endpoints
- Production: `https://api.pinterest.com/v5/`
- Sandbox: `https://api-sandbox.pinterest.com/v5/`
- Auth header: `Authorization: Bearer <token>`
- Create pin: `POST /v5/pins` with `board_id`, `title`, `description`, `media_source`
