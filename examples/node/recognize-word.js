#!/usr/bin/env node

'use strict';

/**
 * Example: OCR from Word documents
 * This example shows how to extract text and images from Word (.docx) files
 * and perform OCR on the images.
 */

const path = require('path');
const fs = require('fs');
const { createWorker } = require('../..');
const { processWordForOCR } = require('../../src/utils/wordProcessor');

const [,, docPath, language = 'eng'] = process.argv;

if (!docPath) {
  console.log('Usage: node recognize-word.js <path-to-docx> [language]');
  console.log('Example: node recognize-word.js document.docx eng');
  console.log('Example: node recognize-word.js document.docx ind (untuk bahasa Indonesia)');
  process.exit(1);
}

const docFile = path.resolve(docPath);

if (!fs.existsSync(docFile)) {
  console.error(`File not found: ${docFile}`);
  process.exit(1);
}

console.log(`Processing Word document: ${docFile}`);
console.log(`Language: ${language}`);
console.log('-----------------------------------\n');

(async () => {
  try {
    // Step 1: Extract existing text and images from Word document
    console.log('Step 1: Extracting text and images from Word document...');
    const { extractedText, images } = await processWordForOCR(docFile, {
      extractExistingText: true,
      extractImages: true,
    });
    
    if (extractedText && extractedText.trim()) {
      console.log('Extracted Text (from Word document):');
      console.log('-----------------------------------');
      console.log(extractedText);
      console.log('-----------------------------------\n');
    } else {
      console.log('No text found in Word document.\n');
    }
    
    // Step 2: Perform OCR on images (if any)
    if (images && images.length > 0) {
      console.log(`Step 2: Performing OCR on ${images.length} image(s)...\n`);
      
      const worker = await createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      
      for (let i = 0; i < images.length; i++) {
        console.log(`\n--- OCR Result for Image ${i + 1} ---`);
        const { data: { text } } = await worker.recognize(images[i].data);
        console.log(text);
        console.log('-----------------------------------');
      }
      
      await worker.terminate();
      console.log('\nOCR processing completed!');
    } else {
      console.log('No images found in Word document.');
    }
    
  } catch (error) {
    console.error('Error processing Word document:', error.message);
    process.exit(1);
  }
})();
