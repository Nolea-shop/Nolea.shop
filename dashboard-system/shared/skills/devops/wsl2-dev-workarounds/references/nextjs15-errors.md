# Next.js 15 on WSL2 — Error Transcripts & Patterns

## Case 5: better-sqlite3 pulled into client bundle (Module not found: Can't resolve 'fs')

**Context:** Next.js 15 project with `better-sqlite3` for SQLite DB. Page imports `getAllRecipes()` from `@/lib/recipes` which imports `@/lib/db` which imports `better-sqlite3`.

**Error (build time):**
```
./node_modules/better-sqlite3/lib/database.js
Module not found: Can't resolve 'fs'

Import trace:
  ./src/lib/db.ts
  ./src/lib/recipes.ts
  ./src/app/page.tsx
```

**Root cause:** `page.tsx` was marked `"use client"` (or was a Server Component that transitively imported better-sqlite3 through a client-side bundle). Webpack bundles `better-sqlite3` for the browser, but it depends on Node.js `fs`.

**Fix:** Keep pages that call DB functions as **pure Server Components** — NO `"use client"` directive. Next.js Server Components are never bundled for the client, so `better-sqlite3` stays server-side.

**Critical:** Even WITHOUT `"use client"`, if webpack traces the import chain from a client component → recipes → db → better-sqlite3, it will fail. Ensure the import chain only starts from Server Components (pages without `"use client"`).

---

## Case 6: Next.js 15 params must be Promise in async Server Components

**Context:** Dynamic route `src/app/rezept/[id]/page.tsx`.

**Wrong (Next.js 14 style):**
```typescript
interface Props {
  params: { id: string };
}
export default async function Page({ params }: Props) { ... }
```

**Error (build time):**
```
Type error: Type 'Props' does not satisfy the constraint 'PageProps'.
  Types of property 'params' are incompatible.
    Type '{ id: string; }' is missing the following properties from type 'Promise<any>':
      then, catch, finally, [Symbol.toStringTag]
```

**Fix (Next.js 15):**
```typescript
interface Props {
  params: Promise<{ id: string }>;
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  ...
}
```

**Note:** This applies to ALL dynamic route pages in Next.js 15 App Router. The `params` object is now always a Promise and must be awaited.

---

## Case 7: dangerouslySetInnerHTML style tags cause hydration errors

**Context:** Used `<style dangerouslySetInnerHTML={{ __html: '...' }} />` inside page body to define CSS class hover effects for cards.

**Error (runtime, client-side):**
```
Application error: a client-side exception has occurred while loading localhost
```

The error was empty string in console — no stack trace. Root cause: Next.js hydration mismatch between server-rendered HTML and client-side expectations when `<style>` tags appear in `<body>` via `dangerouslySetInnerHTML`.

**Fix:** Use inline styles directly on elements, or define global CSS in `globals.css`. For hover effects, use CSS `:hover` in a proper stylesheet. Example:

```css
/* globals.css */
.card {
  transition: all var(--transition);
}
.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

Then apply `className="card"` on elements. Do NOT use `dangerouslySetInnerHTML` to inject `<style>` tags.

**Alternative:** If CSS class names aren't working with Tailwind purging, use inline `style={{ ... }}` React props directly instead.

---

## Case 8: execute_code Popen dies when context ends

**Context:** Started Next.js production server via `execute_code` using `subprocess.Popen()`:

```python
proc = subprocess.Popen(
    ['bash', '-c', 'cd /home/damia/rezept-app && npm start'],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
)
time.sleep(4)
# ... test requests ...
# Server dies after execute_code context ends
```

The server process is killed when the Python script finishes — even with `time.sleep()` and even though `Popen` was called.

**Fix:** Use `terminal(background=true)` for long-running processes:

```
terminal(background=true, command="cd /home/damia/rezept-app && npm start", workdir="/home/damia/rezept-app")
```

This returns immediately with `pid` and `session_id`. The server keeps running.

**Note:** If using `execute_code` for a quick build step (`npm run build`), `subprocess.run()` and `Popen.wait()` work fine — the process completes before the context ends.

---

## Case 9: Long-running npm install timeout

**Context:** `npm install` on WSL2 with native module compilation can take 60-180+ seconds.

**Error (execute_code default timeout):**
```
[Command timed out after 120s]
```

**Fix:** Increase timeout:
```python
result = subprocess.run(
    ['bash', '-c', 'cd /path && npm install --ignore-scripts'],
    capture_output=True, text=True, timeout=240  # 4 minutes minimum
)
```

Or use `terminal()` with longer timeout for interactive monitoring.
