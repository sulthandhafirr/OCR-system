# Quick Start Guide

## Prerequisites
- Node.js 14+ installed
- DeepSeek API key

## Setup (3 steps)

### 1. Install dependencies
```bash
cd ocrds
npm install
```

### 2. Configure environment
Copy the example env file to `.env`, then edit it and set your API key.

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

Set `DEEPSEEK_API_KEY` inside `.env`.

### 3. Run the server
```bash
npm start
```

Open browser: `http://localhost:3000`

## Usage

1. **Upload** - Click upload zone or drag & drop file
2. **Process** - Click "Process Document" button
3. **View** - See raw OCR text and structured JSON output

## Supported Files
- Images: PNG, JPG, JPEG, GIF, BMP, TIFF
- PDF: Any PDF with text or scanned images
- Word: DOC, DOCX

## API Endpoints

### POST /process
Full pipeline: OCR → DeepSeek → JSON

**Request:**
```bash
curl -X POST http://localhost:3000/process \
  -F "file=@invoice.pdf"
```

**Response:**
```json
{
  "success": true,
  "filename": "invoice.pdf",
  "ocr_text": "RAW OCR TEXT...",
  "structured_data": { ... },
  "processing_timestamp": "2026-02-25T..."
}
```

### POST /extract
OCR only (no DeepSeek processing)

**Request:**
```bash
curl -X POST http://localhost:3000/extract \
  -F "file=@document.png"
```

**Response:**
```json
{
  "success": true,
  "filename": "document.png",
  "ocr_text": "EXTRACTED TEXT...",
  "character_count": 1234
}
```

### GET /health
Health check

```bash
curl http://localhost:3000/health
```

## Troubleshooting

### "DEEPSEEK_API_KEY not configured"
→ Make sure `.env` file exists with valid API key

### OCR extraction fails
→ Check if file format is supported
→ Try converting to PNG or PDF

### Low confidence score
→ OCR text may be noisy or incomplete
→ Try higher quality scan/image

## Integration Example

```javascript
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');

async function processInvoice(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  
  const response = await fetch('http://localhost:3000/process', {
    method: 'POST',
    body: form
  });
  
  const result = await response.json();
  return result.structured_data;
}

// Usage
const data = await processInvoice('./invoice.pdf');
console.log(data.grand_total);
```

## File Structure
```
ocrds/
├── index.js              # HTTP server entry point
├── ocr.js                # OCR extraction logic
├── deepseekProcessor.js  # DeepSeek LLM integration
├── schema.js             # Output validation & normalization
├── index.html            # Web UI
├── package.json          # Dependencies
├── .env                  # Environment variables (create this)
└── README.md             # Main documentation
```

## Notes
- Processing time depends on file size and OCR complexity
- DeepSeek API calls are metered - check your usage
- Confidence score indicates data quality (0.0 - 1.0)
- Missing fields return `null` (never hallucinated)
