const PDFDocument = require('pdfkit');
const fs = require('fs');

// Create PDF - letter size with standard margins
const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 72, bottom: 72, left: 62, right: 62 }
});

doc.pipe(fs.createWriteStream('/home/damia/output.pdf'));

// === COVER PAGE ===
doc.fontSize(12).fillColor('#666').text('BERICHT', 62, 80);
doc.fontSize(36).fillColor('#e85d04').text('Titel', 62, 120);
doc.fontSize(18).fillColor('#333').text('Untertitel', 62, 170);

// Stats box
doc.rect(62, 280, 200, 80).fill('#f8f9fa').stroke('#e9ecef');
doc.fillColor('#e85d04').fontSize(32).text('120M+', 72, 290);
doc.fillColor('#333').fontSize(10).text('NUTZER', 72, 330);

// Footer
doc.fontSize(9).fillColor('#666').text('Erstellt mit PDFKit', 62, 700);

// === CONTENT PAGE ===
doc.addPage();

// Header bar
doc.rect(0, 0, 612, 40).fill('#f8f9fa');
doc.fillColor('#e85d04').fontSize(10).text('BERICHT', 62, 15);
doc.fillColor('#666').text('Seite 2', 500, 15);

doc.moveDown(2);
doc.fillColor('#333').fontSize(16).text('Inhalt', 62);
doc.moveDown();

doc.fontSize(11).fillColor('#000').text(
  'Hauptinhalt des Berichts...',
  62, 80, { align: 'justify', width: 488 }
);

doc.end();
console.log('PDF: /home/damia/output.pdf');