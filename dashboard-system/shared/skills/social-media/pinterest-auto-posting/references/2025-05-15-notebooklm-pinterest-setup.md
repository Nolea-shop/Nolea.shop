# Session: Pinterest Auto-Posting Setup mit OpenRouter + NotebookLM

Datum: 2026-05-15
Modell: deepseek/deepseek-v4-flash (OpenRouter/OpenAI)

## Verifizierte Komponenten

### 1. OpenRouter FLUX Bildgenerierung (funktioniert ✅)

OpenRouter unterstützt FLUX Modelle NICHT über `/v1/images/generations`, sondern nur über `/v1/chat/completions`.

**Getesteter Endpoint:**
```
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer $OPENROUTER_API_KEY
```

**Funktionierendes Modell:** `black-forest-labs/flux.2-klein-4b`
**Kosten pro Bild:** ~$0.01386 (3072 image tokens)
**Response-Format:** Base64-Bild in `choices[0].message.content` oder als Data-URL

### 2. Pinterest App

- **App-ID:** 1570884
- **Name:** n8n hermes
- **Account-Typ:** Business
- **Token-Scopes benötigt:** `pins:read`, `pins:write`, `boards:read`

### 3. OpenRouter API Key

- Existiert in `~/.hermes/.env` als `OPENROUTER_API_KEY`
- Beginnt mit `sk-or-v1-d...`

## "Studio by Margarita" Prompts (aus NotebookLM Notebook)

Diese 4 GPT Image 2 Prompts wurden aus der Notiz "Studio by Margarita" im Pinterest-Notebook extrahiert:

### Prompt 1 — Classic Beauty Editorial
> A close-up portrait of a young woman with sun-kissed skin, wearing a white linen blazer, soft natural makeup with peachy tones, dewy skin, diffused golden hour light from a north-facing window, pale beige background, shot on medium format film, shallow depth of field, editorial fashion photography, timeless and elegant, warm muted tones, 8K

### Prompt 2 — Minimalist Still Life
> A flat lay composition on a rustic oak table: a ceramic bowl filled with ripe figs, a linen napkin in pale sage, a brass spoon, a sprig of rosemary, soft morning light from the left, slight film grain, muted earthy color palette, intentional negative space, minimalist aesthetic, shot on Hasselblad 60mm, editorial still life photography

### Prompt 3 — Modern Sculpture Architecture
> A modern minimalist interior — beige concrete walls, a curved alcove with a single dried eucalyptus branch in a stone vase, clean geometric lines, shadow play from window blinds, warm sand tones and muted clay colors, serenely empty, soft texture on walls, architectural digest style, natural indirect lighting, high contrast shadows, shot on Leica M6

### Prompt 4 — Textures and Materials
> Macro shot of textured natural materials: raw linen fabric draped over a stone surface, a weathered leather journal, dried lavender bundles, the grain of untreated oak, warm neutral palette of ivory, ecru, taupe, and clay, extreme detail, soft diffused natural light, tactile and sensorial, editorial documentary style, shot on 35mm film

### Kanalnamen (Vorschläge aus der Notiz)
- Lumière Ethos
- The Oatmilk Edit
- Studio Élis
- Sérum & Soul
- Linear Wellness

## Pinterest Pin-Beispiel (verifizierter Request-Body)

```json
{
  "board_id": "BOARD_ID",
  "title": "Pin Title",
  "description": "Description with #hashtags",
  "media_source": {
    "source_type": "image_url",
    "url": "https://example.com/image.jpg"
  }
}
```

**Wichtig:** Die Bild-URL muss öffentlich erreichbar sein. Pinterest lädt das Bild herunter, daher sollte die URL mindestens 1 Stunde lang verfügbar sein.
