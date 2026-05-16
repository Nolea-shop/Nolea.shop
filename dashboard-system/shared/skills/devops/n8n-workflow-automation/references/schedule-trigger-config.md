# Schedule Trigger + Code Node Reference Config

## Schedule Trigger (Daily at 20:00)

From live session (2026-05-01), the user's working Schedule Trigger config:

| Field | Value |
|---|---|
| Trigger Interval | Days |
| Days Between Triggers | 1 |
| Trigger at Hour | 8pm |
| Trigger at Minute | 0 |

Output fields available in downstream nodes:
- `timestamp` — ISO 8601 (e.g. `2026-04-29T14:29:42.534-04:00`)
- `Readable date` — e.g. `April 29th 2026, 2:29:42 pm`
- `Readable time`
- `Day of week`, `Year`, `Month`, `Day of month`, `Hour`, `Minute`, `Second`
- `Timezone` — e.g. `America/New_York (UTC-04:00)`

Access in Code node items: use `new Date()` for current time or `$input.first().json.timestamp`.

## Code Node: Random Prompt Generator + Multi-Output

The user's Code Node generates a random AI image prompt from templates and outputs structured data. Key pattern:

```javascript
const styles = [
  { id: "1_gritty_flash", template: "[MOTIV]... [TEXT]..." },
  { id: "2_epic_ambition", template: "[MOTIV]... [TEXT]..." },
  // ... more styles
];

const motive = ["A lone wolf...", "A vintage Ferrari...", ...];
const texte = ["type shi.", "stay goated.", ...];

const randomStyle = styles[Math.floor(Math.random() * styles.length)];
const randomMotiv = motive[Math.floor(Math.random() * motive.length)];
const randomText = texte[Math.floor(Math.random() * texte.length)];

let finalPrompt = randomStyle.template
  .replace("[MOTIV]", randomMotiv)
  .replace("[TEXT]", randomText);

return [{
  json: {
    final_prompt: finalPrompt,
    style: randomStyle.id,
    motiv: randomMotiv,
    text: randomText
  }
}];
```

Output fields available downstream:
- `{{ $json.final_prompt }}` — full prompt string
- `{{ $json.style }}` — style ID
- `{{ $json.motiv }}` — selected subject
- `{{ $json.text }}` — selected quote

## Connecting to Next Node (HTTP Request / Telegram)

In downstream nodes, use `{{ $('Code').item.json.final_prompt }}` to reference the Code output.

For Telegram "Send Photo" node:
- **Chat ID**: numeric chat ID (get from @userinfobot or the Telegram API)
- **Photo**: can be a binary field or a URL string
- **Caption**: `{{ $('Code').item.json.text }} — {{ $('Code').item.json.style }}`
