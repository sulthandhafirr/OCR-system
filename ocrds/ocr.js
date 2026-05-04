/**
 * ocr.js
 * Raw OCR text extraction from images, PDFs, and Word documents
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Preprocess image for better OCR accuracy
 * - grayscale: remove color distraction
 * - denoise: light blur to reduce pixel noise
 * - threshold: make text/background separation clearer
 * @param {Buffer|string} imageSource - Image buffer or file path
 * @returns {Promise<Buffer>} - Preprocessed image buffer
 */
async function preprocessImageForOCR(imageSource) {
  const sharp = require('sharp');
  const input = Buffer.isBuffer(imageSource) ? imageSource : await fs.readFile(imageSource);

  return sharp(input)
    .grayscale()
    .normalize()
    .blur(0.4)
    .threshold(170, { grayscale: true })
    .toFormat('png')
    .toBuffer();
}

/**
 * Extract text from image using Tesseract.js
 * @param {Buffer|string} imageSource - Image buffer or file path
 * @returns {Promise<string>} - Extracted text
 */
async function extractFromImage(imageSource) {
  try {
    // Dynamic import of Tesseract.js (if available)
    const Tesseract = require('tesseract.js');
    const preprocessedImage = await preprocessImageForOCR(imageSource);
    
    const result = await Tesseract.recognize(
      preprocessedImage,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    return result.data.text;
  } catch (error) {
    console.error('Tesseract.js not available or extraction failed:', error.message);
    throw new Error(`Image OCR failed: ${error.message}`);
  }
}

/**
 * Extract text from PDF using pdf-parse
 * @param {Buffer|string} pdfSource - PDF buffer or file path
 * @returns {Promise<string>} - Extracted text
 */
async function extractFromPDF(pdfSource) {
  try {
    const pdfParse = require('pdf-parse');
    
    let buffer;
    if (Buffer.isBuffer(pdfSource)) {
      buffer = pdfSource;
    } else if (typeof pdfSource === 'string') {
      buffer = await fs.readFile(pdfSource);
    } else {
      throw new Error('Invalid PDF source');
    }
    
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('pdf-parse not available or extraction failed:', error.message);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from Word document using mammoth
 * @param {Buffer|string} docSource - Word doc buffer or file path
 * @returns {Promise<string>} - Extracted text
 */
async function extractFromWord(docSource) {
  try {
    const mammoth = require('mammoth');
    
    let buffer;
    if (Buffer.isBuffer(docSource)) {
      buffer = docSource;
    } else if (typeof docSource === 'string') {
      buffer = await fs.readFile(docSource);
    } else {
      throw new Error('Invalid Word document source');
    }
    
    const result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
  } catch (error) {
    console.error('mammoth not available or extraction failed:', error.message);
    throw new Error(`Word extraction failed: ${error.message}`);
  }
}

/**
 * Detect file type from extension or buffer
 * @param {string} filename - File name
 * @param {Buffer} buffer - File buffer (optional)
 * @returns {string} - File type: 'image', 'pdf', 'word', 'unknown'
 */
function detectFileType(filename, buffer = null) {
  const ext = path.extname(filename).toLowerCase();
  
  // Image types
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'].includes(ext)) {
    return 'image';
  }
  
  // PDF
  if (ext === '.pdf') {
    return 'pdf';
  }
  
  // Word documents
  if (['.doc', '.docx'].includes(ext)) {
    return 'word';
  }
  
  // Buffer-based detection as fallback
  if (buffer) {
    const signature = buffer.slice(0, 4).toString('hex');
    
    // PDF signature: %PDF
    if (buffer.slice(0, 4).toString() === '%PDF') {
      return 'pdf';
    }
    
    // PNG signature
    if (signature === '89504e47') {
      return 'image';
    }
    
    // JPEG signature
    if (signature.startsWith('ffd8ff')) {
      return 'image';
    }
    
    // ZIP-based formats (DOCX, etc.)
    if (signature === '504b0304') {
      return 'word';
    }
  }
  
  return 'unknown';
}

/**
 * Main extraction function - routes to appropriate extractor
 * @param {Buffer|string} source - File buffer or path
 * @param {string} filename - Original filename (for type detection)
 * @returns {Promise<string>} - Extracted OCR text
 */
async function extractText(source, filename) {
  let buffer;
  
  // Load file if path is provided
  if (typeof source === 'string') {
    buffer = await fs.readFile(source);
    filename = filename || source;
  } else if (Buffer.isBuffer(source)) {
    buffer = source;
  } else {
    throw new Error('Invalid source: must be Buffer or file path');
  }
  
  // Detect file type
  const fileType = detectFileType(filename, buffer);
  
  // Route to appropriate extractor
  switch (fileType) {
    case 'image':
      console.log('Extracting text from image...');
      return await extractFromImage(buffer);
      
    case 'pdf':
      console.log('Extracting text from PDF...');
      return await extractFromPDF(buffer);
      
    case 'word':
      console.log('Extracting text from Word document...');
      return await extractFromWord(buffer);
      
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Extract text with error handling and fallback
 * @param {Buffer|string} source - File source
 * @param {string} filename - Filename
 * @returns {Promise<string>} - Extracted text or error message
 */
async function extractTextSafe(source, filename) {
  try {
    const text = await extractText(source, filename);
    
    if (!text || text.trim().length === 0) {
      return '[No text extracted - file may be empty or unreadable]';
    }
    
    return text;
  } catch (error) {
    console.error('OCR extraction error:', error);
    return `[Extraction failed: ${error.message}]`;
  }
}

module.exports = {
  extractText,
  extractTextSafe,
  extractFromImage,
  extractFromPDF,
  extractFromWord,
  preprocessImageForOCR,
  detectFileType
};
