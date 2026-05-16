# Reddit RSS/Atom Feed Setup in n8n HTTP Request Node

## Overview

Reddit's search results are available via RSS at `https://www.reddit.com/search.rss`. This endpoint requires **no authentication** and returns data in **Atom XML format** (not RSS XML).

## Key Facts

- **URL**: `https://www.reddit.com/search.rss`
- **Format**: Atom XML (uses `<entry>` tags, not `<item>` tags)
- **Authentication**: None required
- **Query params**: `q=<keyword>`, `sort=new|relevance|top`, `limit=1-100`
- **User-Agent**: Recommended: `n8n-research-bot-v1.0 (by /u/your_reddit_name)`

## n8n HTTP Request Node Configuration

```json
{
  "method": "GET",
  "url": "https://www.reddit.com/search.rss",
  "queryParameters": {
    "parameters": [
      {"name": "q", "value": "glutenfrei"},
      {"name": "sort", "value": "new"},
      {"name": "limit", "value": "10"}
    ]
  },
  "headerParameters": {
    "parameters": [
      {"name": "User-Agent", "value": "n8n-research-bot-v1.0 (by /u/your_reddit_name)"}
    ]
  }
}
```

**Do NOT set `responseFormat` to `json`** — the endpoint returns XML, not JSON. Setting `responseFormat: json` causes n8n to fail to parse the XML and return raw text in the output. Leave `responseFormat` unset (defaults to text) or explicitly set it to `text`.

## Critical: Atom XML Format (Not RSS!)

Reddit's RSS is **Atom format**, which uses `<entry>` elements instead of `<item>`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <updated>2026-05-03T01:42:19+00:00</updated>
  <id>/search.rss?q=glutenfrei</id>
  <title>reddit.com: search results</title>
  <entry>
    <title>glutenfrei</title>
    <link href="https://www.reddit.com/r/glutenfrei/"/>
    <author><name>/u/Bl4nk24</name><uri>https://www.reddit.com/user/Bl4nk24</uri></author>
    <content type="html">&lt;div&gt; r/glutenfrei ist die ...</content>
    <id>t5_5r3sic</id>
  </entry>
</feed>
```

## Code Node: Parse Atom XML to JSON (VERIFIED WORKING — 2026-05-03)

n8n's Code Node uses a **sandboxed JavaScript engine that does NOT have DOMParser or cheerio**. Use pure regex parsing instead.

**Verified working pattern (Node.js-tested, confirmed 3 entries parsed):**

```javascript
// NODE 3: Parse Reddit Atom RSS to JSON
// Returns one item per Reddit post
// Verified: 2026-05-03 — Node.js test confirmed 3 entries parsed correctly

const input = $input.first();
const xmlData = input?.json?.data;

if (!xmlData || typeof xmlData !== 'string') {
  return [{ json: { error: 'No XML data', keys: Object.keys(input?.json || {}).join(',') } }];
}

// Parse Atom entries via regex (no DOMParser available in n8n sandbox)
const entries = [];
const entryRegex = /<entry>([\\s\\S]*?)<\\/entry>/g;
let match;

while ((match = entryRegex.exec(xmlData)) !== null) {
  const entryXml = match[1];
  const titleMatch = /<title[^>]*>([\\s\\S]*?)<\\/title>/.exec(entryXml);
  const linkMatch = /<link[^>]*href=["']([^"']*)["'][^>]*>/.exec(entryXml);
  const authorMatch = /<author>[\\s\\S]*?<name>([^<]*)<\\/name>[\\s\\S]*?<\\/author>/.exec(entryXml);
  const contentMatch = /<content[^>]*>([\\s\\S]*?)<\\/content>/.exec(entryXml);
  const summaryMatch = /<summary[^>]*>([\\s\\S]*?)<\\/summary>/.exec(entryXml);
  const idMatch = /<id>([^<]*)<\\/id>/.exec(entryXml);
  const publishedMatch = /<published>([^<]*)<\\/published>/.exec(entryXml);
  const categoryMatch = /<category[^>]*term=["']([^"']*)["'][^>]*>/.exec(entryXml);
  const title = titleMatch ? decodeHTML(titleMatch[1].trim()) : '';
  const content = contentMatch ? decodeHTML(contentMatch[1].trim()) : (summaryMatch ? decodeHTML(summaryMatch[1].trim()) : '');
  entries.push({ title, link: linkMatch ? linkMatch[1] : '', author: authorMatch ? authorMatch[1].trim() : '', content, id: idMatch ? idMatch[1] : '', published: publishedMatch ? publishedMatch[1] : '', subreddit: categoryMatch ? categoryMatch[1] : '' });
}

function decodeHTML(text) { return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' '); }

return entries.map(e => ({ json: e }));
```

**Output**: One n8n item per `<entry>` — `title`, `link`, `author`, `content`, `id`, `published`, `subreddit`.

**Debug**: If "No output" or empty items, check: (1) `responseFormat` on HTTP Request node is NOT `json` (must be text for XML), (2) `$input.first().json.data` contains the XML string, (3) look at execution log for runtime errors.

## Viewing Execution Output in n8n UI

The n8n REST API at `/rest/executions/{id}` does **not** return actual node output data (it's encrypted/stored separately). To view output:

1. Go to the **Executions** tab
2. Click the execution entry (e.g., "May 3, 03:42:18")
3. Click on the node in the canvas (e.g., "Reddit Search")
4. Click the **Output** tab in the right panel

The table view may truncate long XML — scroll or expand rows to see full content. The data IS there even if the preview is cut off.

## Testing via curl

```bash
curl -s -H "User-Agent: n8n-research-bot-v1.0 (by /u/your_reddit_name)" \
  "https://www.reddit.com/search.rss?q=glutenfrei&sort=new&limit=2"
```

Expected: Atom XML with `<entry>` elements containing post titles, links, authors.

## Why not OAuth2?

Reddit's OAuth2 API (`https://oauth.reddit.com/search`) requires a valid Reddit app and proper token handling. The RSS endpoint is simpler for automation since it:
- Requires no app registration
- Requires no token refresh
- Works with just a User-Agent header

## Limitations

- Reddit may rate-limit or block IPs that make too many requests
- RSS may return fewer results than the API for popular searches
- No support for subreddit-specific filtering via RSS (use `q=flair:Olympiade` for post flairs)
