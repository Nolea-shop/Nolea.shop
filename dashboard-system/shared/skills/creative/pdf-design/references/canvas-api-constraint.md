# PDF-Generierung: Canvas-API-Only Constraint

## Regel

**PDF-Generierung ist AUSSCHLIESSLICH mit der Canvas API (PDFKit) erlaubt.**

Verboten sind:
- Externe Cloud-Dienste (pdfshift.io, htmltopdf Cloud, Adobe PDF Service, etc.)
- Client-side PDF-Bibliotheken, die auf externen APIs basieren
- Serverless-Functions, die Drittanbieter-PDF-Engines wrappen
- `pdfmake` (generiert PDF intern, aber nicht Canvas-API-basiert)
- `puppeteer`/`playwright` + `page.pdf()` (nutzt Chromium intern, nicht Canvas)

## Warum Canvas-API only?

1. **WSL2/Windows-Kompatibilität** — Canvas API (PDFKit) ist reines Node.js, keine externen Binaries oder system-level Abhängigkeiten
2. **Keine Netzwerk-Abhängigkeiten** — Alle Generierung lokal, keine Latenz, keine API-Kosten, kein Vendor-Lock-in
3. **Deterministische Ausgabe** — Gleicher Input → gleiches PDF (keine Cloud-Versionierung)
4. **Offline-fähig** — Funktioniert ohne Internet
5. **Druckfertige Qualität** — PDFKit erzeugt vektorbasierte PDFs, geeignet für Print

## Erlaubte Methode: PDFKit + Canvas

```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 72, bottom: 72, left: 62, right: 62 }
});

doc.pipe(fs.createWriteStream('report.pdf'));

// Text mit Styling
doc.fontSize(24).fillColor('#e85d04').text('Title', 100, 100);
doc.fontSize(11).fillColor('#333333').text('Body copy...', 100, 150);

// Grafiken (sofern erforderlich)
// doc.image('chart.png', { width: 400 });

doc.end();
```

**Nicht erlaubt:**
```javascript
// VERBOTEN — externe Dienste
import { PDFDocument } from 'pdf-lib';  // OK — rein JS, aber keine Canvas-API
// ... wenn es mit htmltopdf/puppeteer/Cloud-Service wrappt, verboten

// VERBOTEN — Cloud-API
const pdf = await axios.post('https://api.pdfshift.io/convert', { html: '...' });
```

## Gray Zone – was ist erlaubt?

- `pdf-lib` ist **erlaubt**, wenn es rein client-side im Node.js-Prozess läuft und keine externen Dienste kontaktiert
- `hummus`/`hummus Recipe` (PDF-Manipulation) ist erlaubt, solange es lokal bleibt
- `fs.createReadStream('existing.pdf')` → weitere Seiten anhängen ist erlaubt (Manipulation, nicht Generierung von externen Quellen)

## Durchsetzung

- CI/CD-Phase: PDF-Generierung muss in `npm run build` oder ähnlichem lokal laufen
- Dependency-Check: `package.json` darf keine `pdfshift`, `html-pdf`, `chrome-aws-lambda` (Puppeteer auf Lambda) enthalten, wenn diese primär für PDF-Erstellung gedacht sind
- Code-Review: Jede `page.pdf()` (Puppeteer) oder `wkhtmltopdf`-Aufruf muss eine Ausnahme haben und mit `// ALLOWED: <reason>` kommentiert sein

## Alternative bei komplexen Layouts

Wenn Layout zu komplex für PDFKit (z.B. Tabellen über mehrere Seiten mit dynamischer Höhe):
1. **HTML → Canvas** — HTML mit `html-to-image`→ Canvas → PDFKit `doc.image(canvas.toBuffer())`
2. **SVG → Canvas** — SVG mit `svg2img`→ PNG→ PDFKit

Diese Wege bleiben **lokal** und nutzen keine Cloud-PDF-API.
