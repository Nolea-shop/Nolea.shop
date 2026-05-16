---
name: editorial-ui-design
description: "Guidelines for building the Premium Editorial Dashboard design system."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [ui, design, css, frontend, editorial, luxury, animation, charts]
---

# Editorial UI Design System

Style guide and technical constraints for building the "Suffix" Premium Editorial Dashboard.

## Vision (Atmosphere & Core)
- **Base**: "Warm Paper" Canvas (`#fcfaf7`, `#f8f6f1`).
- **Background**: Soft-blurred Aurora-Blobs (Coral, Violet, Sky, Gold) with `filter: blur(120px)`.
- **Texture**: Fine SVG Noise Grain (`opacity: 0.03-0.05`).
- **Layers**: Background Aurora -> Noise -> Content.

## Typography
- **Headlines/Numbers**: `Fraunces` (Serif). Use `italic` variants for emphasis. Large sizes (56px-96px).
- **Body**: `Inter` or `Geist` (Sans). 14px.
- **Accents**: `JetBrains Mono` for technical data.
- **Hierachy**: High contrast in scale. Wide tracking for uppercase labels.

## Layout (Bento Editorial)
- **Grid**: Asymmetric Bento Grids.
- **Cards**: Non-uniform sizes. Occasional slight rotation (`transform: rotate(-0.5deg)`).
- **Glassmorphism**: Thick blurs, subtle borders (`rgba(26,26,26,0.05)`), and "inner light" insets.
- **Shadows**: Always use **colored shadows** matched to the card accent (e.g., violet card = violet shadow), never plain gray.

## Data Visualization (ECharts)
- No default Chart.js looks.
- Use ECharts with Bezier-curved lines (3-4px width), thick glows, and gradient area fills.
- Pie/Donut charts with large gaps/rounded corners and custom tooltips (Cream cards with Serif text).

## Technical Implementation (Backend/Server)
When serving this design via a simple Python server:
1. **Static Files**: Explicitly handle `.css` and `.js` routes.
2. **MIME Types**: Set `Content-Type: text/css` and `application/javascript` or browser styles won't load.
3. **Data Mapping**: Ensure JSON API fields map exactly to UI IDs; never leave 'undefined' or hardcoded placeholders when real data available.
4. **Dependencies**: Ensure external libraries like `Lenis` (Smooth Scroll) and `GSAP` are loaded early in the HTML head.

## Frontend Data Patterns
### Multiple API merges in the browser
When a page needs data from more than one endpoint, use `Promise.all`:
```js
const [r1, r2] = await Promise.all([
    fetch('/api/endpoint-a'),
    fetch('/api/endpoint-b'),
]);
```
Merge the two response objects manually rather than awaiting each in sequence.

### Stat-card formatting
- Dollar amounts: `'$' + (cents || 0).toFixed(2)` — OpenRouter returns cents.
- Token counts: suffix `M` / `k` (e.g., `143.7M tokens`). Format: `n >= 1e6 ? (n/1e6).toFixed(2) + 'M'`.
- Rate limits: display `500k/min` instead of raw `500000`.
- Label them with a `/mo` suffix where monthly caps apply.

### HTML error boundaries for fast data checks
When upgrading a page to pull real data, verify via `curl /api/...` before reloading the browser — 401/auth errors surface instantly from terminal and save multiple cycle times.

## Chart.js — Height Explosion Fix

**Pitfall:** `maintainAspectRatio: false` WITHOUT a parent container of fixed height causes the canvas to grow to thousands of pixels. Chart.js interprets "no aspect ratio lock" as "give me all the space I want" and keeps expanding until the page renders at `height: 8504px`.

**Fix:** Every chart canvas must live inside a height-fixed wrapper:

```css
.chart-wrap  { position: relative; width: 100%; height: 300px; }
.chart-wrap-sm { position: relative; width: 100%; height: 280px; }
#chart-canvas { width: 100% !important; height: 100% !important; }
```

```html
<div class="chart-wrap">
    <canvas id="chart-history"></canvas>
</div>
```

Gradients that reference canvas height must read it from the element, not a hardcoded constant:

```js
const gradient = ctx.createLinearGradient(
    0, 0, 0, canvas.parentElement.offsetHeight || 300
);
```

**Scope:** Applies to **any** page using Chart.js with `maintainAspectRatio: false` — not just the token page. Recurring pitfall across all dashboard charts.

## Interaction & Animation
- **GSAP**: Staggered entrance animations (`y: 20`, `opacity: 0`).
- **Lenis**: Enable smooth vertical scrolling.
- **Sparkles**: Particle system (tsParticles or custom) that emits sparkles on clicks and ambiently.
- **Magnetic Effects**: Subtle magnetic follow on cards and buttons.
