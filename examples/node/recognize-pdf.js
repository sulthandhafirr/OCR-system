#!/usr/bin/env node

'use strict';

/**
 * Example: OCR from PDF files
 * This example shows how to extract text and images from PDF files
 * and perform OCR on the images.
 */

const path = require('path');
const fs = require('fs');
const { createWorker } = require('../..');
const { processPDFForOCR, convertPDFToImages } = require('../../src/utils/pdfProcessor');

const [,, pdfPath, language = 'eng'] = process.argv;

if (!pdfPath) {
  console.log('Usage: node recognize-pdf.js <path-to-pdf> [language]');
  console.log('Example: node recognize-pdf.js document.pdf eng');
  console.log('Example: node recognize-pdf.js document.pdf ind (untuk bahasa Indonesia)');
  process.exit(1);
}

const pdfFile = path.resolve(pdfPath);

if (!fs.existsSync(pdfFile)) {
  console.error(`File not found: ${pdfFile}`);
  process.exit(1);
}

console.log(`Processing PDF: ${pdfFile}`);
console.log(`Language: ${language}`);
console.log('-----------------------------------\n');

(async () => {
  try {
    // Step 1: Extract existing text from PDF
    console.log('Step 1: Extracting existing text from PDF...');
    const { extractedText, images } = await processPDFForOCR(pdfFile, {
      extractExistingText: true,
      convertToImages: true,
      scale: 2.0, // Higher scale = better quality but slower
    });
    
    if (extractedText && extractedText.trim()) {
      console.log('Extracted Text (from PDF metadata):');
      console.log('-----------------------------------');
      console.log(extractedText);
      console.log('-----------------------------------\n');
    } else {
      console.log('No text found in PDF metadata. Will perform OCR on images.\n');
    }
    
    // Step 2: Perform OCR on PDF images (if any)
    if (images && images.length > 0) {
      console.log(`Step 2: Performing OCR on ${images.length} page(s)...\n`);
      
      const worker = await createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      
      for (const imageData of images) {
        console.log(`\n--- OCR Result for Page ${imageData.page} ---`);
        const { data: { text } } = await worker.recognize(imageData.data);
        console.log(text);
        console.log('-----------------------------------');
      }
      
      await worker.terminate();
      console.log('\nOCR processing completed!');
    } else {
      console.log('No images found in PDF.');
    }
    
  } catch (error) {
    console.error('Error processing PDF:', error.message);
    process.exit(1);
  }
})();
