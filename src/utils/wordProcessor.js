'use strict';

/**
 * Word Document Processor for Tesseract.js
 * Extracts images and text from Word (.docx) files for OCR processing
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const officeparser = require('officeparser');

/**
 * Extract text content from Word document using mammoth
 * @param {string|Buffer} docPath - Path to Word file or Buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromWord(docPath) {
  try {
    let options;
    
    if (Buffer.isBuffer(docPath)) {
      options = { buffer: docPath };
    } else {
      options = { path: docPath };
    }
    
    const result = await mammoth.extractRawText(options);
    return result.value;
  } catch (error) {
    console.error('Error extracting text from Word:', error);
    throw error;
  }
}

/**
 * Extract text using officeparser (alternative method, supports more formats)
 * @param {string} docPath - Path to Word file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromWordAlternative(docPath) {
  try {
    if (Buffer.isBuffer(docPath)) {
      throw new Error('officeparser requires file path, not buffer');
    }
    
    const text = await officeparser.parseOfficeAsync(docPath);
    return text;
  } catch (error) {
    console.error('Error extracting text from Word (alternative):', error);
    throw error;
  }
}

/**
 * Extract images from Word document
 * @param {string|Buffer} docPath - Path to Word file or Buffer
 * @returns {Promise<Array>} Array of image buffers
 */
async function extractImagesFromWord(docPath) {
  try {
    let options;
    
    if (Buffer.isBuffer(docPath)) {
      options = { buffer: docPath };
    } else {
      options = { path: docPath };
    }
    
    // Convert to HTML to extract images
    const result = await mammoth.convertToHtml(options, {
      convertImage: mammoth.images.imgElement(function(image) {
        return image.read('base64').then(function(imageBuffer) {
          return {
            src: `data:${image.contentType};base64,${imageBuffer}`,
          };
        });
      }),
    });
    
    // Extract base64 images from HTML
    const images = [];
    const imgRegex = /<img[^>]+src="data:([^;]+);base64,([^"]+)"/g;
    let match;
    
    while ((match = imgRegex.exec(result.value)) !== null) {
      const contentType = match[1];
      const base64Data = match[2];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      images.push({
        contentType,
        data: imageBuffer,
      });
    }
    
    return images;
  } catch (error) {
    console.error('Error extracting images from Word:', error);
    throw error;
  }
}

/**
 * Extract both text and images with formatting
 * @param {string|Buffer} docPath - Path to Word file or Buffer
 * @returns {Promise<Object>} Complete document data
 */
async function extractCompleteDocument(docPath) {
  try {
    let options;
    
    if (Buffer.isBuffer(docPath)) {
      options = { buffer: docPath };
    } else {
      options = { path: docPath };
    }
    
    const textResult = await mammoth.extractRawText(options);
    const images = await extractImagesFromWord(docPath);
    
    return {
      text: textResult.value,
      images: images,
      messages: textResult.messages,
    };
  } catch (error) {
    console.error('Error extracting complete document:', error);
    throw error;
  }
}

/**
 * Process Word document for OCR
 * @param {string|Buffer} docPath - Path to Word file or Buffer
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Combined text and image data
 */
async function processWordForOCR(docPath, options = {}) {
  try {
    const { 
      extractExistingText = true, 
      extractImages = true,
      useAlternativeParser = false 
    } = options;
    
    const result = {
      extractedText: null,
      images: null,
    };
    
    if (extractExistingText) {
      if (useAlternativeParser && !Buffer.isBuffer(docPath)) {
        result.extractedText = await extractTextFromWordAlternative(docPath);
      } else {
        result.extractedText = await extractTextFromWord(docPath);
      }
    }
    
    if (extractImages) {
      result.images = await extractImagesFromWord(docPath);
    }
    
    return result;
  } catch (error) {
    console.error('Error processing Word for OCR:', error);
    throw error;
  }
}

module.exports = {
  extractTextFromWord,
  extractTextFromWordAlternative,
  extractImagesFromWord,
  extractCompleteDocument,
  processWordForOCR,
};
