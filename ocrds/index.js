/**
 * index.js
 * HTTP server entry point for OCRDS (OCR Data Structuring)
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { extractTextSafe } = require('./ocr');
const { processSafe } = require('./deepseekProcessor');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * Parse multipart/form-data manually
 * Extracts file buffer and filename from request
 */
async function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      return reject(new Error('No boundary found in multipart form'));
    }
    
    const chunks = [];
    
    req.on('data', chunk => chunks.push(chunk));
    
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      
      // Find file part
      const parts = [];
      let start = 0;
      
      while (true) {
        const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
        if (boundaryIndex === -1) break;
        
        const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
        if (nextBoundaryIndex === -1) break;
        
        parts.push(buffer.slice(boundaryIndex, nextBoundaryIndex));
        start = nextBoundaryIndex;
      }
      
      // Find file part with filename
      for (const part of parts) {
        const partStr = part.toString('binary');
        const filenameMatch = partStr.match(/filename="([^"]+)"/);
        
        if (filenameMatch) {
          const filename = filenameMatch[1];
          
          // Find start of file data (after double CRLF)
          const headerEndIndex = part.indexOf('\r\n\r\n');
          if (headerEndIndex === -1) continue;
          
          // Extract file buffer (remove trailing CRLF)
          const fileBuffer = part.slice(headerEndIndex + 4, -2);
          
          return resolve({ filename, buffer: fileBuffer });
        }
      }
      
      reject(new Error('No file found in form data'));
    });
    
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Send HTML file
 */
async function sendHTML(res, filename) {
  try {
    const filePath = path.join(__dirname, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
}

/**
 * Send static file (CSS, JS, etc.)
 */
async function sendStaticFile(res, filename) {
  try {
    const filePath = path.join(__dirname, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json'
    };
    
    const contentType = contentTypes[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
}

/**
 * Main request handler
 */
async function handleRequest(req, res) {
  const url = req.url;
  const method = req.method;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Route: GET / - serve HTML UI
  if (url === '/' && method === 'GET') {
    await sendHTML(res, 'index.html');
    return;
  }
  
  // Route: GET /style.css - serve CSS
  if (url === '/style.css' && method === 'GET') {
    await sendStaticFile(res, 'style.css');
    return;
  }
  
  // Route: GET /script.js - serve JavaScript
  if (url === '/script.js' && method === 'GET') {
    await sendStaticFile(res, 'script.js');
    return;
  }
  
  // Route: GET /health - health check
  if (url === '/health' && method === 'GET') {
    sendJSON(res, { status: 'ok', timestamp: new Date().toISOString() });
    return;
  }
  
  // Route: POST /process - main processing endpoint
  if (url === '/process' && method === 'POST') {
    try {
      // Check API key
      if (!DEEPSEEK_API_KEY) {
        sendJSON(res, { 
          error: 'DEEPSEEK_API_KEY not configured',
          message: 'Please set DEEPSEEK_API_KEY in .env file'
        }, 500);
        return;
      }
      
      // Parse uploaded file
      const { filename, buffer } = await parseMultipartForm(req);
      console.log(`Processing file: ${filename}`);
      
      // Step 1: Extract OCR text
      console.log('Step 1: Extracting text from file...');
      const ocrText = await extractTextSafe(buffer, filename);
      console.log(`Extracted ${ocrText.length} characters`);
      
      // Step 2: Process with DeepSeek
      console.log('Step 2: Processing with DeepSeek...');
      const structuredData = await processSafe(ocrText, DEEPSEEK_API_KEY);
      console.log('Processing complete');
      
      // Return results
      sendJSON(res, {
        success: true,
        filename: filename,
        ocr_text: ocrText,
        structured_data: structuredData,
        processing_timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Processing error:', error);
      sendJSON(res, {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Route: POST /extract - OCR only (no DeepSeek processing)
  if (url === '/extract' && method === 'POST') {
    try {
      const { filename, buffer } = await parseMultipartForm(req);
      console.log(`Extracting text from: ${filename}`);
      
      const ocrText = await extractTextSafe(buffer, filename);
      
      sendJSON(res, {
        success: true,
        filename: filename,
        ocr_text: ocrText,
        character_count: ocrText.length
      });
      
    } catch (error) {
      console.error('Extraction error:', error);
      sendJSON(res, {
        success: false,
        error: error.message
      }, 500);
    }
    return;
  }
  
  // 404 - Not found
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

/**
 * Create and start server
 */
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   OCRDS - OCR Data Structuring         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  /         - Web UI`);
  console.log(`  GET  /health   - Health check`);
  console.log(`  POST /process  - Full pipeline (OCR + DeepSeek)`);
  console.log(`  POST /extract  - OCR only`);
  console.log('');
  
  if (!DEEPSEEK_API_KEY) {
    console.log('⚠️  WARNING: DEEPSEEK_API_KEY not set');
    console.log('   Create .env file with: DEEPSEEK_API_KEY=your_key_here');
    console.log('');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = server;
