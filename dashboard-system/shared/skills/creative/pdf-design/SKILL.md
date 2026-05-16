---
name: pdf-design
description: Design and edit professional PDF reports with PDFKit/Canvas API (WSL2/Windows compatible)
user_invocable: true
trigger_patterns:
  - "create.*report"
  - "create.*proposal"
  - "pdf.*report"
  - "design.*pdf"
  - "make.*report"
---

# PDF Design System (PDFKit/Canvas API)

Professional PDF reports for WSL2/Windows using Node.js + PDFKit. Works with Canvas API method as required by project standards.

## Quick start

```bash
# Install
npm init -y && npm install pdfkit canvas --save

# Generate
node -e "const PDFDocument = require('pdfkit'); const doc = new PDFDocument({size:'letter'}); doc.pipe(require('fs').createWriteStream('report.pdf')); doc.fontSize(24).text('Report', 100, 100); doc.end();"
```

## Document structure

### Modern layout (letter: 8.5" × 11")
```javascript
const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 72, bottom: 72, left: 62, right: 62 }
});
```

### Color palette (warm orange accent)
```javascript
const colors = {
  brand: '#e85d04',    // warm orange
  dark: '#333333',
  gray: '#666666',
  light: '#f8f9fa'
};
```

### Cover page template
```javascript
// Header
doc.fontSize(12).fillColor(colors.gray).text('ANALYSE BERicht', 62, 80);
doc.fontSize(36).fillColor(colors.brand).text('Title', 62, 120);
doc.fontSize(18).fillColor(colors.dark).text('Subtitle', 62, 170);

// Stats boxes
doc.rect(62, 280, 200, 80).fill('#f8f9fa').stroke('#e9ecef');
doc.fillColor(colors.brand).fontSize(32).text('120M+', 72, 290);
```

## Content pages

```javascript
// Header bar
doc.rect(0, 0, 612, 40).fill('#f8f9fa');
doc.fillColor(brandColor).text('REPORT TITLE', 62, 15);

// Body text
doc.fontSize(11).fillColor('#000');
doc.text('Content here...', 62, 80, { align: 'justify', width: 488 });
```

## Brand guidelines

- **Colors**: Warm orange #e85d04, dark gray #333, light gray #666
- **Fonts**: Helvetica family (built-in, no CDN needed)
- **Spacing**: 62pt margins, 72pt top/bottom margins
- **Layout**: Left-aligned, sentence case

## Known issues & limits

1. **AUSSCHLIESSLICH Canvas API** — PDFs MUST be generated using PDFKit with the Canvas API method. External services (pdfshift.io, htmltopdf, pdfmake, or any cloud-based PDF generation) are prohibited by project standards. Technical details: see `references/canvas-api-constraint.md`.
2. **No external fonts** - Uses built-in Helvetica. For custom fonts, register with `doc.registerFont()`
2. **Memory limits** - Large base64 images should use external files
3. **WSL2 paths** - Output must go to Windows-mounted drives (/mnt/c/...) or ~/ directory

## References

- PDFKit docs: https://pdfkit.org/
- Canvas API reference: ~/.hermes/skills/pdf-design/references/canvas-notes.md