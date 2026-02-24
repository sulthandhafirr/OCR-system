# DeepSeek AI Integration for Invoice/Bill Processing

## Overview

The DeepSeek AI integration adds an intelligent post-processing layer on top of Tesseract OCR. It converts noisy, unstructured OCR text into clean, structured financial data for invoices, bills, and purchase orders.

## Features

- **Intelligent Field Extraction**: Parses invoice number, date, company info, items, totals
- **Error Correction**: Fixes OCR mistakes using contextual reasoning
- **Data Normalization**: Standardizes dates, currencies, numbers
- **Edge Case Handling**: Manages broken lines, duplicates, multiple totals/dates
- **No Hallucination**: Returns `null` for missing data instead of guessing

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Image/    │────▶│  Tesseract   │────▶│   DeepSeek    │
│  PDF/Word   │     │     OCR      │     │  AI Processor │
└─────────────┘     └──────────────┘     └───────────────┘
                           │                      │
                           ▼                      ▼
                    Raw OCR Text          Structured JSON
```

## Installation

```bash
# Core dependencies already installed
# Optional: for .env file support
npm install dotenv
```

## Setup

### 1. Get DeepSeek API Key

Sign up at: https://platform.deepseek.com

### 2. Configure API Key

**Option A: Environment Variable (.env file)**

Create `.env` file in project root:

```env
deepseek_api_key=sk-xxxxxxxxxxxxxxxxxx
```

**Option B: Pass Directly in Code**

```javascript
const apiKey = 'sk-xxxxxxxxxxxxxxxxxx';
```

## Usage

### Basic Example - Image Invoice

```javascript
const { createWorker, deepseekProcessor } = require('tesseract.js');
require('dotenv').config();

(async () => {
  // Step 1: OCR extraction
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize('invoice.png');
  await worker.terminate();
  
  // Step 2: DeepSeek AI processing
  const structuredData = await deepseekProcessor.processInvoiceOCR(text, {
    apiKey: process.env.deepseek_api_key,
  });
  
  console.log(structuredData);
})();
```

### PDF Invoice

```javascript
const { createWorker, pdfProcessor, deepseekProcessor } = require('tesseract.js');
require('dotenv').config();

(async () => {
  const worker = await createWorker('eng');
  
  // Extract images from PDF
  const { images } = await pdfProcessor.convertPDFToImages('invoice.pdf', {
    scale: 2.0,
  });
  
  // OCR each page
  let combinedText = '';
  for (const img of images) {
    const { data: { text } } = await worker.recognize(img.data);
    combinedText += text + '\n';
  }
  
  await worker.terminate();
  
  // Process with DeepSeek
  const structuredData = await deepseekProcessor.processInvoiceOCR(combinedText, {
    apiKey: process.env.deepseek_api_key,
  });
  
  console.log(structuredData);
})();
```

### Word Document Invoice

```javascript
const { createWorker, wordProcessor, deepseekProcessor } = require('tesseract.js');
require('dotenv').config();

(async () => {
  const worker = await createWorker('eng');
  
  // Extract text and images from Word
  const { extractedText, images } = await wordProcessor.processWordForOCR('invoice.docx');
  
  let combinedText = extractedText || '';
  
  // OCR embedded images
  for (const img of images) {
    const { data: { text } } = await worker.recognize(img.data);
    combinedText += text + '\n';
  }
  
  await worker.terminate();
  
  // Process with DeepSeek
  const structuredData = await deepseekProcessor.processInvoiceOCR(combinedText, {
    apiKey: process.env.deepseek_api_key,
  });
  
  console.log(structuredData);
})();
```

## Output Schema

```javascript
{
  "document_type": "invoice | bill | purchase_order",
  "invoice_number": "INV-2024-001",
  "purchase_order_number": "PO-2024-001",
  "invoice_date": "2024-02-24",
  "company": {
    "name": "ABC Corporation",
    "address": "123 Main St, City, Country",
    "email": "billing@abc.com",
    "phone": "+1-234-567-8900"
  },
  "bill_to": {
    "name": "Customer Name",
    "address": "456 Customer St, City, Country"
  },
  "items": [
    {
      "description": "Product A",
      "quantity": 10,
      "unit_price": 100.00,
      "amount": 1000.00
    },
    {
      "description": "Product B",
      "quantity": 5,
      "unit_price": 200.00,
      "amount": 1000.00
    }
  ],
  "subtotal": 2000.00,
  "tax": {
    "type": "VAT",
    "rate": "10%",
    "amount": 200.00
  },
  "discount": 0,
  "grand_total": 2200.00,
  "currency": "USD",
  "amount_in_words": "Two Thousand Two Hundred Dollars",
  "payment_terms": "Net 30",
  "confidence_score": 0.95
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `document_type` | string | Type of document (invoice/bill/purchase_order) |
| `invoice_number` | string/null | Invoice or bill number |
| `purchase_order_number` | string/null | PO number if present |
| `invoice_date` | string/null | Date in YYYY-MM-DD format |
| `company` | object | Seller/vendor information |
| `bill_to` | object | Buyer/customer information |
| `items` | array | Line items with description, qty, price, amount |
| `subtotal` | number/null | Subtotal before tax |
| `tax` | object | Tax information (type, rate, amount) |
| `discount` | number/null | Discount amount |
| `grand_total` | number | **Final total amount** |
| `currency` | string | ISO currency code (USD, MYR, EUR, etc.) |
| `amount_in_words` | string/null | Amount written in words |
| `payment_terms` | string/null | Payment terms (Net 30, etc.) |
| `confidence_score` | number | AI confidence (0.0 to 1.0) |

## API Reference

### `processInvoiceOCR(ocrText, options)`

Processes OCR text and returns structured financial data.

**Parameters:**

- `ocrText` (string, required): Raw OCR text from Tesseract
- `options` (object, required):
  - `apiKey` (string, required): DeepSeek API key
  - `temperature` (number, optional): Model temperature (default: 0)
  - `maxTokens` (number, optional): Max response tokens (default: 2000)

**Returns:**

Promise that resolves to structured data object (see schema above)

**Example:**

```javascript
const result = await deepseekProcessor.processInvoiceOCR(ocrText, {
  apiKey: 'sk-xxxxx',
  temperature: 0,
  maxTokens: 2000,
});
```

## Command Line Tool

Use the provided example script:

```bash
# Install dotenv if using .env file
npm install dotenv

# Set API key in .env
echo "deepseek_api_key=sk-xxxxxx" > .env

# Run on image
node examples/node/recognize-invoice.js invoice.png eng

# Run on PDF
node examples/node/recognize-invoice.js invoice.pdf eng

# Run on Word
node examples/node/recognize-invoice.js invoice.docx ind
```

## Edge Cases Handled

### 1. Broken OCR Lines

**Input:**
```
Inv oice #: AB
C-2024-001
```

**Output:**
```json
{ "invoice_number": "ABC-2024-001" }
```

### 2. Multiple Totals

DeepSeek prefers "Grand Total" over "Subtotal" or "Tax Total":

**Input:**
```
Subtotal: 1000.00
Tax: 100.00
Grand Total: 1100.00
```

**Output:**
```json
{ "grand_total": 1100.00 }
```

### 3. Currency Inference

**Input:**
```
Total: RM 1,500.00
```

**Output:**
```json
{
  "currency": "MYR",
  "grand_total": 1500.00
}
```

### 4. Missing Data

Returns `null` instead of hallucinating:

**Input:**
```
No invoice number visible
```

**Output:**
```json
{ "invoice_number": null }
```

### 5. Date Normalization

**Input:**
```
Date: 24-Feb-2024
```

**Output:**
```json
{ "invoice_date": "2024-02-24" }
```

## Error Handling

```javascript
try {
  const result = await deepseekProcessor.processInvoiceOCR(ocrText, {
    apiKey: process.env.deepseek_api_key,
  });
  console.log(result);
} catch (error) {
  console.error('Processing failed:', error.message);
  
  // Error types:
  // - "DeepSeek API key is required"
  // - "OCR text must be a non-empty string"
  // - "API error: 401" (invalid API key)
  // - "Failed to parse structured data: ..."
}
```

## Best Practices

### 1. High Quality OCR Input

```javascript
// Use high DPI for better OCR quality
const { images } = await pdfProcessor.convertPDFToImages('invoice.pdf', {
  scale: 2.0, // Higher quality
});
```

### 2. Language Detection

```javascript
// Use appropriate language for OCR
const worker = await createWorker('eng+ind'); // English + Indonesian
```

### 3. Batch Processing

```javascript
// Process multiple invoices efficiently
const worker = await createWorker('eng');

for (const file of invoiceFiles) {
  const { data: { text } } = await worker.recognize(file);
  const structured = await deepseekProcessor.processInvoiceOCR(text, {
    apiKey: process.env.deepseek_api_key,
  });
  
  // Store or process structured data
  await saveToDatabase(structured);
}

await worker.terminate();
```

### 4. Confidence Filtering

```javascript
const result = await deepseekProcessor.processInvoiceOCR(ocrText, {
  apiKey: process.env.deepseek_api_key,
});

if (result.confidence_score < 0.7) {
  console.warn('Low confidence, manual review recommended');
  // Flag for human review
} else {
  // Auto-process
  await processInvoice(result);
}
```

## Troubleshooting

### API Key Issues

```
Error: DeepSeek API key is required
```

**Solution:**
- Check `.env` file exists and contains `deepseek_api_key`
- Verify API key format starts with `sk-`
- Get new key from: https://platform.deepseek.com

### Empty Results

```json
{ "grand_total": 0, "items": [] }
```

**Solution:**
- Check OCR quality (may be too noisy)
- Increase PDF scale parameter
- Try different PSM mode for Tesseract
- Verify document is actually an invoice/bill

### JSON Parse Errors

```
Error: Failed to parse structured data: Unexpected token
```

**Solution:**
- Usually rare (DeepSeek uses `response_format: json_object`)
- Retry the request
- Check if API response format changed

## Performance

- **OCR Time**: 1-3 seconds per page (depends on image size)
- **DeepSeek API**: 1-2 seconds per request
- **Total**: ~3-5 seconds per invoice

**Optimization:**

```javascript
// Process OCR in parallel
const ocrPromises = images.map(img => worker.recognize(img.data));
const results = await Promise.all(ocrPromises);

// Combine and send one DeepSeek request
const combinedText = results.map(r => r.data.text).join('\n');
const structured = await deepseekProcessor.processInvoiceOCR(combinedText, {
  apiKey: process.env.deepseek_api_key,
});
```

## Cost Estimation

DeepSeek API pricing (as of 2024):
- Input: ~$0.14 per 1M tokens
- Output: ~$0.28 per 1M tokens

Typical invoice:
- Input: ~500 tokens (OCR text)
- Output: ~300 tokens (JSON)
- **Cost: < $0.001 per invoice**

## Supported Document Types

✅ Invoices  
✅ Bills  
✅ Purchase Orders  
✅ Receipts (basic)  
❌ Bank Statements (not optimized)  
❌ Tax Forms (not optimized)  

## Advanced Configuration

### Custom Temperature

```javascript
// More deterministic (default, recommended)
const result = await deepseekProcessor.processInvoiceOCR(text, {
  apiKey: apiKey,
  temperature: 0,
});

// More creative (not recommended for invoices)
const result = await deepseekProcessor.processInvoiceOCR(text, {
  apiKey: apiKey,
  temperature: 0.3,
});
```

### Longer Responses

```javascript
// For very large invoices
const result = await deepseekProcessor.processInvoiceOCR(text, {
  apiKey: apiKey,
  maxTokens: 4000, // Default: 2000
});
```

## Module Exports

The `deepseekProcessor` module exports:

```javascript
const {
  processInvoiceOCR,    // Main function
  buildRequestPayload,  // For testing
  parseResponse,        // For testing
} = require('tesseract.js').deepseekProcessor;
```

## License

Same as Tesseract.js: Apache License 2.0

## Support

- Issues: https://github.com/naptha/tesseract.js/issues
- DeepSeek API Docs: https://platform.deepseek.com/docs
- Tesseract.js Docs: https://tesseract.projectnaptha.com/

---

**Note:** This integration is an **enhancement layer** on top of existing OCR. It does not replace Tesseract OCR, but intelligently processes its output for financial documents.
