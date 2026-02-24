#!/usr/bin/env node

'use strict';

/**
 * Example: Advanced document processing with multiple file types
 * Supports: Images, PDF, and Word documents
 */

const path = require('path');
const fs = require('fs');
const { createWorker } = require('../..');
const { processPDFForOCR } = require('../../src/utils/pdfProcessor');
const { processWordForOCR } = require('../../src/utils/wordProcessor');

const [,, filePath, language = 'eng'] = process.argv;

if (!filePath) {
  console.log('Usage: node recognize-advanced.js <file-path> [language]');
  console.log('');
  console.log('Supported file types:');
  console.log('  - Images: .png, .jpg, .jpeg, .bmp, .gif, .tiff');
  console.log('  - PDF: .pdf');
  console.log('  - Word: .docx');
  console.log('');
  console.log('Examples:');
  console.log('  node recognize-advanced.js document.pdf eng');
  console.log('  node recognize-advanced.js document.docx ind');
  console.log('  node recognize-advanced.js image.png eng');
  process.exit(1);
}

const file = path.resolve(filePath);

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const ext = path.extname(file).toLowerCase();

console.log(`Processing file: ${file}`);
console.log(`File type: ${ext}`);
console.log(`Language: ${language}`);
console.log('===================================\n');

(async () => {
  try {
    const worker = await createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progressPercent = Math.round(m.progress * 100);
          process.stdout.write(`\rProgress: ${progressPercent}%`);
        }
      },
    });
    
    let ocrResults = [];
    
    // Process based on file type
    if (ext === '.pdf') {
      console.log('Processing PDF file...\n');
      const { extractedText, images } = await processPDFForOCR(file, {
        extractExistingText: true,
        convertToImages: true,
        scale: 2.0,
      });
      
      if (extractedText && extractedText.trim()) {
        ocrResults.push({
          source: 'PDF Metadata',
          text: extractedText,
        });
      }
      
      if (images && images.length > 0) {
        for (const imageData of images) {
          const { data: { text } } = await worker.recognize(imageData.data);
          ocrResults.push({
            source: `Page ${imageData.page}`,
            text: text,
          });
        }
      }
      
    } else if (ext === '.docx') {
      console.log('Processing Word document...\n');
      const { extractedText, images } = await processWordForOCR(file, {
        extractExistingText: true,
        extractImages: true,
      });
      
      if (extractedText && extractedText.trim()) {
        ocrResults.push({
          source: 'Word Document Text',
          text: extractedText,
        });
      }
      
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const { data: { text } } = await worker.recognize(images[i].data);
          ocrResults.push({
            source: `Image ${i + 1}`,
            text: text,
          });
        }
      }
      
    } else {
      // Process as image
      console.log('Processing image file...\n');
      const { data: { text } } = await worker.recognize(file);
      ocrResults.push({
        source: 'Image',
        text: text,
      });
    }
    
    await worker.terminate();
    
    // Display results
    console.log('\n\n===================================');
    console.log('OCR RESULTS');
    console.log('===================================\n');
    
    if (ocrResults.length === 0) {
      console.log('No text found in the document.');
    } else {
      ocrResults.forEach((result, index) => {
        console.log(`\n--- ${result.source} ---`);
        console.log(result.text);
        console.log('-----------------------------------');
      });
      
      // Save to file
      const outputFile = path.join(
        path.dirname(file),
        `${path.basename(file, ext)}_ocr_result.txt`
      );
      
      const fullText = ocrResults
        .map(r => `=== ${r.source} ===\n${r.text}\n`)
        .join('\n');
      
      fs.writeFileSync(outputFile, fullText, 'utf8');
      console.log(`\n\nResults saved to: ${outputFile}`);
    }
    
    console.log('\nProcessing completed!');
    
  } catch (error) {
    console.error('\nError processing file:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
