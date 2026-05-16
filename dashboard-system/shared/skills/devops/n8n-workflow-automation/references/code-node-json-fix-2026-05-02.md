# Code Node "json property isn't an object" Error Fix

## Problem
```
Error: A 'json' property isn't an object [item 0]
In the returned data, every key named 'json' must point to an object.
```

## Root Cause
The Code node returns `[{json: {...}}]` but the `json` property does not contain a valid object.

### Common Triggers
1. **ES6 shorthand with undefined variables**:
   ```js
   // BAD - if slug undefined, creates {slug: undefined}
   return [{json: {slug, title: t.title}}]
   ```

2. **Spread operator with undefined values**:
   ```js
   // BAD - if t is undefined or missing props
   return [{json: {...t, topic_index: i}}]
   ```

3. **Missing null checks**:
   ```js
   // BAD - $json might be undefined in first execution
   const t = $json;  // t could be undefined
   ```

## Solution Pattern
```javascript
// ROBUST pattern
const t = $json || {};
const rawTitle = t.title || 'Untitled';
const cleanSlug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slug = cleanSlug.slice(0, 40);
const title = rawTitle.slice(0, 60);
return [{
  json: {
    slug: slug,
    title: title,
    // ... other explicit properties
  }
}];
```

## Mode Check
- Nodes using `$input.all()[0]` MUST have `"mode": "runOnceForAllItems"`
- Nodes processing individual items MUST have `"mode": "runOnceForEachItem"`
- Wrong mode causes different data structure than expected

## Debug Steps
1. Add `console.log($json)` at start of code to see input structure
2. Check if expected properties exist: `t.title !== undefined`
3. Use defensive defaults: `const title = t.title || 'Untitled'`
4. Verify output is array with json object: `Array.isArray(result) && result[0].json`