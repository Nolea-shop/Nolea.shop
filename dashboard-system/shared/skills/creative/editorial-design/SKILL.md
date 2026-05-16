---
name: editorial-design
description: Design system for premium, magazine-style web interfaces (Bento, Aurora, GSAP).
category: creative
---

# Editorial Design System

Standards and templates for creating visually immersive, premium web interfaces inspired by high-end magazines (Kinfolk, Apartamento), Apple Vision Pro, and award-winning "Awwwards" sites.

## Core Identity (The Vision)

- **Atmosphere**: A living, breathing artwork.
- **Canvas (Paper)**: Never pure white. Use warm, creamy off-white (#fcfaf7, #faf8f3, #f5f3ef).
- **Background Depth**:
  - **Aurora Blobs**: Soft-blurred floating blobs (filter: blur(120px), opacity 0.45) in accent colors (coral, violet, sky, gold) that drift slowly.
  - **Noise Texture**: Fine grain overlay (opacity 0.03 - 0.05) for tactile depth (film-like grain).
- **Typography (Editorial Mix)**:
  - **Headlines**: Elegant Serif (Fraunces, Instrument Serif). Use Italics for "Statement" look.
  - **Body**: Clean Sans (Inter, Geist).
  - **Hierarchies**: Huge typography jumps (Display 72px vs Body 14px). Tight tracking on titles, wide on labels.

## Palette & Effects

- **Ink**: Warm black (#1a1a1a).
- **Accents**: Coral (#ff5733), Violet (#7c3aed), Sky (#0ea5e9), Gold (#fbbf24).
- **Iconography (Emoji-Free)**: For a professional editorial look, **strictly avoid standard Emojis**. Use custom SVG vector paths with consistent stroke weights (e.g. 2px). Wrap icons in typed React components for robustness.
- **Cards**: Asymmetric Bento Grid. Cards use glassmorphism, soft tints, and subtle rotations (rotate: -0.8deg). Use **colored shadows** (shadow color matches card tint).
- **Sparks**: 1-2px "Glitter" particles drifting in the background and bursting on clicks.

## Interactivity (GSAP + Lenis)

- **Motion**: Buttery smooth. Use Lenis for smooth scrolling (duration 1.2s).
- **Choreography**: GSAP reveals on scroll/load. Use staggered entrance animations.
- **Magnetic**: Elements slightly follow the cursor on hover (factor 0.1).

## Technical Implementation (Pitfalls)

- **Static Assets**: When using a minimal Python `BaseHTTPRequestHandler` (like the Dashboard Server), you **MUST** patch the server to explicitly serve `.css` and `.js` files with correct Content-Type. Generic handlers often serve them as HTML by default, breaking the CSS/JS.
- **ECharts**: Prefer ECharts over Chart.js for ultimate styling control. Use custom line smoothing (Bezier) and area gradients.

## Assets in this Skill
- `templates/magazine.css`: The central design core.
- `templates/editorial.js`: The GSAP/Lenis/Sparkle orchestrator.
