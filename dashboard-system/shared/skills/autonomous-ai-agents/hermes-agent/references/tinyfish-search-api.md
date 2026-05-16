# TinyFish Search API

## Endpoint
```
GET https://api.search.tinyfish.ai?query=<search>&limit=<N>
```

## Authentication
Header: `X-API-Key: sk-tinyfish-...`

## Response Format
```json
{
  "query": "...",
  "results": [
    {
      "position": 1,
      "site_name": "example.com",
      "title": "Page Title",
      "snippet": "Description...",
      "url": "https://..."
    }
  ],
  "total_results": 10,
  "page": 0
}
```

## Env Var
`TINYFISH_API_KEY` in `~/.hermes/.env`

## Notes
- Domain is **.ai** not .io (`api.search.tinyfish.ai`)
- Not a native Hermes web search backend — use direct curl/make_request for individual queries
- For general search, prefer DDGS (free, no key)
- TinyFish also offers Fetch, Agent, and Browser APIs under the same auth scheme
