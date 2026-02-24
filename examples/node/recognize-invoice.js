#!/usr/bin/env node

'use strict';

/**
 * Example: Invoice/Bill OCR with DeepSeek AI Enhancement
 * 
 * Flow:
 * 1. Extract text using Tesseract OCR (image/PDF/Word)
 * 2. Send OCR text to DeepSeek AI for intelligent post-processing
 * 3. Get structured financial data (invoice fields, items, totals)
 * 
 * Usage: node recognize-invoice.js <file-path> [language]
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load .env file
const { createWorker } = require('../..');
const { processPDFForOCR } = require('../../src/utils/pdfProcessor');
const { processWordForOCR } = require('../../src/utils/wordProcessor');
const { processInvoiceOCR } = require('../../src/utils/deepseekProcessor');

const [,, filePath, language = 'eng'] = process.argv;

if (!filePath) {
  console.log('Usage: node recognize-invoice.js <file-path> [language]');
  console.log('');
  console.log('Supported file types:');
  console.log('  - Images: .png, .jpg, .jpeg, .bmp, .gif, .tiff');
  console.log('  - PDF: .pdf');
  console.log('  - Word: .docx');
  console.log('');
  console.log('Environment variables:');
  console.log('  - deepseek_api_key: Your DeepSeek API key (required)');
  console.log('');
  console.log('Examples:');
  console.log('  node recognize-invoice.js invoice.pdf eng');
  console.log('  node recognize-invoice.js bill.png ind');
  console.log('  node recognize-invoice.js receipt.jpg eng');
  process.exit(1);
}

const file = path.resolve(filePath);

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const apiKey = process.env.deepseek_api_key;

if (!apiKey) {
  console.error('Error: DeepSeek API key not found!');
  console.error('Please set deepseek_api_key in your .env file');
  console.error('Get your API key from: https://platform.deepseek.com');
  process.exit(1);
}

const ext = path.extname(file).toLowerCase();

console.log('=================================================');
console.log('  Invoice/Bill OCR with DeepSeek AI');
console.log('=================================================');
console.log(`File: ${file}`);
console.log(`Type: ${ext}`);
console.log(`Language: ${language}`);
console.log('=================================================\n');

(async () => {
  try {
    console.log('Step 1: Extracting text with Tesseract OCR...\n');
    
    const worker = await createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progressPercent = Math.round(m.progress * 100);
          process.stdout.write(`\rOCR Progress: ${progressPercent}%`);
        }
      },
    });
    
    let combinedOcrText = '';
    
    // Extract OCR text based on file type
    if (ext === '.pdf') {
      const { extractedText, images } = await processPDFForOCR(file, {
        extractExistingText: true,
        convertToImages: true,
        scale: 2.0,
      });
      
      if (extractedText && extractedText.trim()) {
        combinedOcrText += extractedText + '\n\n';
      }
      
      if (images && images.length > 0) {
        for (const imageData of images) {
          const { data: { text } } = await worker.recognize(imageData.data);
          combinedOcrText += `--- Page ${imageData.page} ---\n${text}\n\n`;
        }
      }
      
    } else if (ext === '.docx') {
      const { extractedText, images } = await processWordForOCR(file, {
        extractExistingText: true,
        extractImages: true,
      });
      
      if (extractedText && extractedText.trim()) {
        combinedOcrText += extractedText + '\n\n';
      }
      
      if (images && images.length > 0) {
        console.log(`\nProcessing ${images.length} embedded images...`);
        for (let i = 0; i < images.length; i++) {
          const { data: { text } } = await worker.recognize(images[i].data);
          combinedOcrText += `--- Image ${i + 1} ---\n${text}\n\n`;
        }
      }
      
    } else if (['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff'].includes(ext)) {
      const { data: { text } } = await worker.recognize(file);
      combinedOcrText = text;
      
    } else {
      console.error(`\nUnsupported file type: ${ext}`);
      await worker.terminate();
      process.exit(1);
    }
    
    await worker.terminate();
    console.log('\n\n✓ OCR extraction complete\n');
    
    // Show raw OCR text
    console.log('=================================================');
    console.log('  Raw OCR Text');
    console.log('=================================================');
    console.log(combinedOcrText.trim().substring(0, 500) + '...\n');
    
    // Process with DeepSeek AI
    console.log('Step 2: Processing with DeepSeek AI...\n');
    
    const structuredData = await processInvoiceOCR(combinedOcrText, {
      apiKey,
      temperature: 0,
      maxTokens: 2000,
    });
    
    console.log('✓ AI processing complete\n');
    
    // Display structured results
    console.log('=================================================');
    console.log('  Structured Financial Data');
    console.log('=================================================\n');
    
    console.log(JSON.stringify(structuredData, null, 2));
    
    console.log('\n=================================================');
    console.log('  Summary');
    console.log('=================================================');
    console.log(`Document Type: ${structuredData.document_type || 'N/A'}`);
    console.log(`Invoice Number: ${structuredData.invoice_number || 'N/A'}`);
    console.log(`Invoice Date: ${structuredData.invoice_date || 'N/A'}`);
    console.log(`Company: ${structuredData.company?.name || 'N/A'}`);
    console.log(`Bill To: ${structuredData.bill_to?.name || 'N/A'}`);
    console.log(`Items: ${structuredData.items?.length || 0}`);
    console.log(`Grand Total: ${structuredData.currency || ''} ${structuredData.grand_total || 0}`);
    console.log(`Confidence: ${Math.round((structuredData.confidence_score || 0) * 100)}%`);
    console.log('=================================================\n');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
})();
