# Code Node json Property Whitespace Bug (2026-05-02)

## Problem
n8n Code nodes failed with error:
```
A 'json' property isn't an object [item 0]
In the returned data, every key named 'json' must point to an object.
```

## Root Cause
Whitespace between `{` and `json` in object literals:
- **Invalid**: `{ json: {title: ...}}` or `{ json: itemJson }`  
- **Valid**: `{json: {title: ...}}` or `{json: itemJson }`

JavaScript accepts both forms, but n8n's internal validator strictly requires `{json:` without spaces.

## Affected Nodes
- `Split Topics`: `return { json: itemJson }` → Fixed to `return {json: itemJson}`
- `Generate Product`: `return [{json: { slug: ...}}]` → Fixed to `return [{json: {slug: ...}}]`

## Fix
Remove all whitespace between `{` and `json` in Code node return statements.

## Verification
```javascript
// Before (fails):
return { json: {slug: slug, title: title} };

// After (works):
return {json: {slug: slug, title: title}};
```

## Notes
- This is a validator quirk, not a JavaScript syntax error
- The error occurs even with correct object structure
- Check both inline objects and variable assignments