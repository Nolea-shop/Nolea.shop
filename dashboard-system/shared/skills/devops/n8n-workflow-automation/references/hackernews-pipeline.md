# Hacker News Pipeline Pattern

**Use Case:** When Reddit OAuth2 is unavailable due to API restrictions or policy requirements.

## API Endpoint
```
GET http://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50
```

## No Authentication Required
- No OAuth2 credentials needed
- No rate limiting concerns for normal usage
- Returns stories sorted by points (HN frontpage ranking)

## Node Structure
| Node | Purpose |
|------|---------|
| Schedule Trigger | Daily execution at specific hours |
| HTTP Request | Fetch HN frontpage stories |
| Code (Normalize) | Filter by points > 10, structure output |
| Split in Batches | Process items individually |
| Merge Raw Data | Aggregate all results |
| Code (Aggregate) | Count items, add timestamp |
| Code (Deduplicate) | Cosine similarity clustering |
| Code (Score) | Calculate engagement score |
| IF | Filter high-scoring topics |
| Split Topics | Process each topic |
| Generate Product | Create product JSON |
| HTTP Request | POST to shop API |

## Working Flow Configuration
```json
{
  "url": "http://hn.algolia.com/api/v1/search",
  "method": "GET",
  "sendQuery": true,
  "queryParameters": {
    "parameters": [
      {"name": "tags", "value": "front_page"},
      {"name": "hitsPerPage", "value": "50"}
    ]
  }
}
```

## Normalize Code
```javascript
const hits = $input.all()[0]?.json?.hits || [];
return hits
  .filter(h => h.points > 10)
  .map(h => ({
    json: {
      source: 'hackernews',
      title: h.title,
      url: h.url,
      upvotes: h.points || 0,
      comments: h.num_comments || 0,
      author: h.author,
      created: new Date(h.created_at).toISOString(),
      category: 'tech'
    }
  }));
```

## Stress Test Results
- API Response: 200 OK
- Response Time: ~489ms
- Raw stories: 50-100 items
- Filtered (>10pts): ~25 items
- Clusters after deduplication: ~20

## Category Mapping
HN stories are tech-focused. Map to:
- `category: 'technik'` (German for tech)
- `subtitle: 'Tech Deep Dive Guide'`
- `tags: ['tech', 'innovation', 'tools']`

Related session: 2026-05-02 - Reddit OAuth2 blocked, switched to Hacker News