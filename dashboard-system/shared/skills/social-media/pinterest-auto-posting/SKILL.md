---
name: pinterest-auto-posting
description: Full Pinterest content pipeline — GPT Image 2 prompt engineering, NotebookLM sourcing, API v5 posting, cron-to-Telegram delivery, content strategy (collages, carousels, food, body). Triggers expanded.
triggers:
  - "pinterest posten"
  - "pinterest pin erstellen"
  - "pinterest automatisiert"
  - "pinterest workflow"
  - "board auf pinterest"
  - "bild auf pinterest hochladen"
  - "pinterest api token"
---

# Pinterest Auto-Posting

Automated workflow to generate images (via OpenRouter FLUX models) and post them as Pins to Pinterest boards using the official REST API v5.

## Prerequisites

- **Pinterest Business Account** (required for API access — personal accounts don't work)
- **Pinterest App** created at https://developers.pinterest.com/apps/
  - Note the **App ID** (e.g. `1570884`)
- **OpenRouter API key** with funds (for image generation)

## Setup: OAuth Access Token

### 1. Generate a token in the Developer Portal (easiest for automation)

1. Go to https://developers.pinterest.com/apps/YOUR_APP_ID/
2. Click the **OAuth 2.0** tab
3. Under **Generate Token**, select scopes:
   - `pins:read` — read Pins
   - `pins:write` — create/update Pins
   - `boards:read` — list your boards
4. Click **Generate** (you may need to re-authenticate with your Pinterest account)
5. Copy the **Access Token** (starts with `pina-...`)

### 2. Manual OAuth flow (if needed)

Redirect URI: `https://developers.pinterest.com/apps/YOUR_APP_ID/oauth/callback/`

```
GET https://www.pinterest.com/oauth/?client_id=YOUR_APP_ID&redirect_uri=https://developers.pinterest.com/apps/YOUR_APP_ID/oauth/callback/&response_type=code&scope=pins:read,pins:write,boards:read
```

Exchange the `code` for a token:

```
POST https://api.pinterest.com/v5/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://developers.pinterest.com/apps/YOUR_APP_ID/oauth/callback/
Authorization: Basic BASE64(APP_ID:APP_SECRET)
```

## Pinterest API v5 — Key Endpoints

### List Boards

```
GET https://api.pinterest.com/v5/boards
Authorization: Bearer pina-TOKEN
```

Response includes `id` (board ID), `name`, `description`, `privacy`.

### Create a Pin (with image URL)

```
POST https://api.pinterest.com/v5/pins
Authorization: Bearer pina-TOKEN
Content-Type: application/json

{
  "board_id": "BOARD_ID",
  "title": "Pin title",
  "description": "Pin description with #hashtags",
  "link": "https://...",
  "media_source": {
    "source_type": "image_url",
    "url": "https://example.com/image.jpg"
  }
}
```

Pinterest downloads the image from the URL — it must be publicly accessible for at least 1 hour.

### Create a Pin (with base64 image — upload via multipart)

Use the Image Upload API first:

```
POST https://api.pinterest.com/v5/media
Authorization: Bearer pina-TOKEN
Content-Type: application/json

{
  "media_type": "image"
}
```

Returns a `media_id` and `upload_url`. Then upload the binary to the `upload_url`, then create the pin with `media_source.source_type: "image_id"` and `media_source.media_id`.

**Simpler approach**: Host the image temporarily (e.g., transfer.sh, your own server, or a public GitHub raw URL) and use `image_url` source_type.

## Image Generation via OpenRouter (FLUX)

Pinterest pins need images. OpenRouter supports FLUX models through the chat completions endpoint:

```
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer $OPENROUTER_API_KEY
Content-Type: application/json

{
  "model": "black-forest-labs/flux.2-klein-4b",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Generate an image: a minimalist white room with natural light streaming through linen curtains, a stone mortar and pestle on an oak table, soft beige tones — shot on medium format film, editorial style"
        }
      ]
    }
  ]
}
```

**Response**: The image is in `choices[0].message.content`. It may be a data URL (`data:image/png;base64,...`) or a JSON object with an `images` array.

**Cost**: ~$0.014/image (3072 image tokens at ~$0.0045/k token).

**Important**: OpenRouter does NOT support `/v1/images/generations` for FLUX — only `/v1/chat/completions` with the image generation prompt as a user message.

### Extract and save the image from the response

```bash
# If base64 in message.content:
echo "$IMAGE_RESPONSE" | jq -r '.choices[0].message.content' | base64 -d > /tmp/pin-image.jpg

# If base64 in an images array:
echo "$IMAGE_RESPONSE" | jq -r '.choices[0].message.images[0]' | base64 -d > /tmp/pin-image.jpg
```

## Complete Automation Workflow (Hermes Cron)

The recommended pattern is a Hermes cron job that runs daily:

1. **Select a prompt** — from a prompt pool (store in a local file or query from NotebookLM)
2. **Generate image** — via OpenRouter chat completions
3. **Save image locally** — decode base64 to a temp file
4. **Host image** — upload to a temporary public URL OR use Pinterest multipart upload
5. **Create Pin** — POST to Pinterest API v5
6. **Log result** — save the Pin ID and image URL for reference

### Example cron job structure

```yaml
# ~/.hermes/config.yaml or created via cronjob tool
schedule: "0 8 * * *"  # daily at 8am
skills: ["pinterest-auto-posting"]
prompt: "Generate a new Pinterest pin image in the Studio by Margarita style..."
```

## NotebookLM Integration

If using NotebookLM as a prompt source:
- Store the notebook ID in memory
- Query the notebook for prompts using `mcp_notebooklm_notebook_query`
- Select prompts randomly or in rotation from the notebook

For prompt libraries and formatted examples, see:
- `references/gpt-image-2-prompt-library.md` — 21+ ready-to-use GPT Image 2 prompts covering all 7 content types: compact collages, carousels, food/drink, body transformation, exercise collages, checklists. Includes photorealism rules, color palette (#F8C8DC pastel pink accent), and character consistency patterns.

## GIF Attachment

Every Telegram delivery MUST include a relevant reaction GIF at the end:

1. Search web for a GIF matching the content topic (e.g. "glow up gif", "fitness motivation gif", "smoothie gif", "skincare gif")
2. Download it via curl to `/tmp/current_gif.gif`
3. Append `MEDIA:/tmp/current_gif.gif` to the Telegram message body — Telegram renders it as a native animated GIF attachment

**Fallback**: If GIF search/download fails, skip it — don't block delivery.

## Telegram Delivery Format (Daily Cron Job)

When delivering prompts via Telegram (cron → send_message), use this structure with `━━━` separator lines so each block is independently copy-pasteable. The GIF goes after the tags block, before the footer:

```
━━━━━━━━━━━━━━━━━━
📌 [TITLE]
━━━━━━━━━━━━━━━━━━

📝 PROMPT

[Scene: … Subject: … Important details: … Use case: … Constraints: … --ar 2:3]

━━━━━━━━━━━━━━━━━━
📋 TEXT-IN-BILD
━━━━━━━━━━━━━━━━━━

[Headlines, steps, labels, arrows to appear in image]

━━━━━━━━━━━━━━━━━━
📄 PIN DESCRIPTION
━━━━━━━━━━━━━━━━━━

[SEO description, max 200 chars, natural keywords]

━━━━━━━━━━━━━━━━━━
🏷 TAGS
━━━━━━━━━━━━━━━━━━

[5-8 relevant Pinterest tags]

━━━━━━━━━━━━━━━━━━
📍 Tipp: Image 2 hochladen, Prompt kopieren, Thinking Mode bei Karussell 🎯
```

## Content Rotation Strategy

Rotate through these 7 content types daily (each gets its own prompt construction in `references/gpt-image-2-prompt-library.md`):

1. **Compact Collage** — Person zeigt 3-6 Steps in Grid (1 Bild)
2. **Carousel (Thinking Mode)** — 4-7 Slides, konsistenter Charakter
3. **Food/Drink (no face)** — Rezept, pink cozy, kein Gesicht
4. **Body Transformation** — Before/After, Glutes, Waist, Hips, Chest
5. **Exercise Collage** — 3-6 Übungen mit Namen/Steps
6. **Food with Person** — Person + Rezept-Overlay
7. **Tracker/Checklist** — 30-Day Glow Up, Measurement Tracker

## Pitfalls

- **Token expiry**: Pinterest OAuth tokens expire after 30-90 days depending on how they were created. The Developer Portal "Generate Token" creates a 90-day token. Set calendar reminders or use the refresh token flow.
- **Image hosting**: Pinterest's `image_url` source type requires the image to be publicly accessible. Free options: transfer.sh, imgur, GitHub raw, or use the multipart upload flow instead.
- **Rate limits**: Pinterest API v5 has rate limits (~1000 requests/day). Stay well under for daily workflows.
- **Non-English text**: Pinterest supports UTF-8 in titles and descriptions — German umlauts work fine.
- **OpenRouter model naming**: ALWAYS check if the model exists first with `GET /openrouter.ai/api/v1/models` (filtered by `flux`). Model names on OpenRouter use dot notation (e.g. `black-forest-labs/flux.2-klein-4b`).
- **Telegram formatting**: Use `━━━` separator lines between blocks. Each section (Prompt, Text-in-Image, Description, Tags) must be separately copy-pasteable — do NOT embed them in a single code block.
- **Photorealism**: Always add camera specs + "no filters, no color grading, no AI artifacts" constraints. Without these, GPT Image 2 outputs look too "clean" and AI-generated.
- **Character consistency**: Always reference "the specific woman from the uploaded reference Image 2" in the Subject line. For carousels, use GPT Image 2 Thinking Mode to maintain character across all slides.

## Verification

After setup, verify with:
```bash
# List boards (token works?)
curl -s "https://api.pinterest.com/v5/boards" \
  -H "Authorization: Bearer pina-TOKEN" | jq .

# Create a test pin
curl -s -X POST "https://api.pinterest.com/v5/pins" \
  -H "Authorization: Bearer pina-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"board_id":"BOARD_ID","title":"Test","description":"Test pin","media_source":{"source_type":"image_url","url":"https://placekitten.com/800/1200"}}' | jq .
```
