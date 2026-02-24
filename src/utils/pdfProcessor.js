'use strict';

/**
 * PDF Processor for Tesseract.js
 * Extracts images and text from PDF files for OCR processing
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');

// Disable worker for Node.js environment
pdfjsLib.GlobalWorkerOptions.workerSrc = null;

/**
 * Extract text content from PDF using pdf-parse
 * @param {string|Buffer} pdfPath - Path to PDF file or Buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfPath) {
  try {
    let dataBuffer;
    
    if (Buffer.isBuffer(pdfPath)) {
      dataBuffer = pdfPath;
    } else {
      dataBuffer = fs.readFileSync(pdfPath);
    }
    
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * Convert PDF pages to images for OCR
 * @param {string|Buffer} pdfPath - Path to PDF file or Buffer
 * @param {Object} options - Options for conversion
 * @param {number} options.scale - Scale factor for rendering (default: 2.0)
 * @param {number[]} options.pageNumbers - Specific pages to convert (default: all pages)
 * @returns {Promise<Array>} Array of image data for each page
 */
async function convertPDFToImages(pdfPath, options = {}) {
  const { scale = 2.0, pageNumbers = null } = options;
  
  try {
    let dataBuffer;
    
    if (Buffer.isBuffer(pdfPath)) {
      dataBuffer = pdfPath;
    } else {
      dataBuffer = fs.readFileSync(pdfPath);
    }
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(dataBuffer),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    const pagesToProcess = pageNumbers || [...Array(numPages).keys()].map(i => i + 1);
    const images = [];
    
    // Process each page
    for (const pageNum of pagesToProcess) {
      if (pageNum < 1 || pageNum > numPages) {
        console.warn(`Page ${pageNum} is out of range. Skipping...`);
        continue;
      }
      
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      // Prepare canvas using Node.js canvas
      const canvas = require('canvas').createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      
      // Convert to buffer
      const imageBuffer = canvas.toBuffer('image/png');
      
      images.push({
        page: pageNum,
        width: viewport.width,
        height: viewport.height,
        data: imageBuffer,
      });
    }
    
    return images;
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw error;
  }
}

/**
 * Process PDF for OCR - combines text extraction and image conversion
 * @param {string|Buffer} pdfPath - Path to PDF file or Buffer
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Combined text and image data
 */
async function processPDFForOCR(pdfPath, options = {}) {
  try {
    const { extractExistingText = true, convertToImages = true } = options;
    
    const result = {
      extractedText: null,
      images: null,
    };
    
    if (extractExistingText) {
      result.extractedText = await extractTextFromPDF(pdfPath);
    }
    
    if (convertToImages) {
      result.images = await convertPDFToImages(pdfPath, options);
    }
    
    return result;
  } catch (error) {
    console.error('Error processing PDF for OCR:', error);
    throw error;
  }
}

module.exports = {
  extractTextFromPDF,
  convertPDFToImages,
  processPDFForOCR,
};
