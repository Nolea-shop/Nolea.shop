# Canvas API PDF Generation Notes

## WSL2/Windows Setup

```bash
# Required packages
npm install pdfkit canvas --save

# Note: canvas may need build tools on Windows
# Install windows-build-tools if native module fails
```

## Working example from session

```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 72, bottom: 72, left: 62, right: 62 }
});

doc.pipe(fs.createWriteStream('/home/damia/output.pdf'));

// Cover page
doc.fontSize(36).fillColor('#e85d04').text('Title', 62, 120);

// Content
doc.addPage();
doc.fontSize(11).text('Content here...', 62, 80);

doc.end();
```

## Color palette used
- Brand: #e85d04 (warm orange)
- Dark: #333333
- Gray: #666666
- Light: #f8f9fa

## File paths
- WSL2 home: /home/damia/
- Windows D: drive: /mnt/d/
- Output example: /mnt/d/hermes/Pornhub_Zusammenfassung.pdf