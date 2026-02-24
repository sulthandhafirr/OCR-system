# Node.js Examples with DeepSeek AI Integration

## Quick Start Guide

### Standard OCR Examples

Basic Tesseract OCR without AI enhancement:

```bash
# Image OCR
node recognize.js image.png

# PDF OCR
node recognize-pdf.js document.pdf eng

# Word OCR
node recognize-word.js document.docx eng

# Auto-detect format
node recognize-advanced.js file.pdf eng
```

### DeepSeek AI Enhanced Examples

Intelligent OCR with structured data extraction:

#### 1. Test DeepSeek Integration

Run validation tests with sample data:

```bash
# Install dotenv if not already installed
npm install dotenv

# Create .env file with your API key
echo "deepseek_api_key=sk-xxxxxxxxxx" > .env

# Run tests
node test-deepseek-invoice.js
```

**Expected Output:**
- ✓ Document type detection
- ✓ Field extraction
- ✓ Numeric parsing
- ✓ JSON validation
- Sample structured invoice data

#### 2. Process Real Invoices

Extract structured data from actual invoice files:

```bash
# Image invoice
node recognize-invoice.js invoice.png eng

# PDF invoice
node recognize-invoice.js invoice.pdf eng

# Word invoice
node recognize-invoice.js invoice.docx ind

# Receipt (JPG)
node recognize-invoice.js receipt.jpg eng
```

**Output Includes:**
- Invoice number, date, PO number
- Company and customer information
- Line items with quantities and prices
- Tax, discount, and totals
- Structured JSON format

## DeepSeek Setup

### 1. Get API Key

Sign up at: https://platform.deepseek.com

### 2. Create .env File

In the project root directory:

```bash
# Windows
echo deepseek_api_key=sk-xxxxxxxxxx > .env

# Linux/Mac
echo "deepseek_api_key=sk-xxxxxxxxxx" > .env
```

Or manually create `.env`:

```
deepseek_api_key=sk-0244078225ed47f587a3bcde7ab2d61a
```

### 3. Install Dependencies

```bash
npm install dotenv
```

## Example Outputs

### Standard OCR (recognize.js)

```
Raw OCR Text:
INVOICE
ABC Corporation
Invoice #: INV-2024-001
...
```

### DeepSeek Enhanced (recognize-invoice.js)

```json
{
  "document_type": "invoice",
  "invoice_number": "INV-2024-001",
  "invoice_date": "2024-02-24",
  "company": {
    "name": "ABC Corporation",
    "address": "123 Main St, City, Country",
    "email": "billing@abc.com",
    "phone": "+1-234-567-8900"
  },
  "bill_to": {
    "name": "Customer Name",
    "address": "456 Customer Ave"
  },
  "items": [
    {
      "description": "Professional Services",
      "quantity": 10,
      "unit_price": 150.00,
      "amount": 1500.00
    }
  ],
  "subtotal": 1500.00,
  "tax": {
    "type": "VAT",
    "rate": "10%",
    "amount": 150.00
  },
  "grand_total": 1650.00,
  "currency": "USD",
  "confidence_score": 0.95
}
```

## Comparison: Standard vs DeepSeek

| Feature | Standard OCR | DeepSeek Enhanced |
|---------|-------------|-------------------|
| Output | Raw text | Structured JSON |
| Field extraction | Manual parsing | Automatic |
| Error correction | None | AI-powered |
| Data normalization | None | Dates, currency, numbers |
| Edge cases | Manual handling | Intelligent inference |
| Use case | Text extraction | Financial automation |

## When to Use Each

### Use Standard OCR when:
- Just need raw text extraction
- Processing general documents (not invoices)
- No budget for API calls
- Building custom parsing logic

### Use DeepSeek Enhanced when:
- Processing invoices, bills, purchase orders
- Need structured financial data
- Want automatic error correction
- Building accounting/ERP integrations
- Need high accuracy with messy OCR

## Batch Processing Example

Process multiple invoices in a folder:

```javascript
const fs = require('fs');
const path = require('path');
const { createWorker, deepseekProcessor } = require('../../');
require('dotenv').config();

async function batchProcess(folderPath) {
  const files = fs.readdirSync(folderPath)
    .filter(f => /\.(png|jpg|jpeg|pdf)$/i.test(f));
  
  const worker = await createWorker('eng');
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    console.log(`Processing: ${file}`);
    
    try {
      // OCR
      const { data: { text } } = await worker.recognize(filePath);
      
      // DeepSeek
      const structured = await deepseekProcessor.processInvoiceOCR(text, {
        apiKey: process.env.deepseek_api_key,
      });
      
      results.push({
        file,
        data: structured,
      });
    } catch (err) {
      console.error(`Error: ${file}`, err.message);
    }
  }
  
  await worker.terminate();
  
  // Save results
  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
  console.log(`Processed ${results.length} invoices`);
}

batchProcess('./invoices');
```

## Performance Tips

### 1. Reuse Worker Instance

```javascript
// ✓ Good: Reuse worker
const worker = await createWorker('eng');
for (const file of files) {
  await worker.recognize(file);
}
await worker.terminate();

// ✗ Bad: Create new worker each time
for (const file of files) {
  const worker = await createWorker('eng');
  await worker.recognize(file);
  await worker.terminate();
}
```

### 2. Increase OCR Quality

```javascript
const { images } = await pdfProcessor.convertPDFToImages('invoice.pdf', {
  scale: 2.0, // Higher = better quality, slower
});
```

### 3. Use Parallel Processing

```javascript
// OCR multiple pages in parallel
const ocrPromises = images.map(img => worker.recognize(img.data));
const results = await Promise.all(ocrPromises);

// Combine for one DeepSeek request
const combinedText = results.map(r => r.data.text).join('\n');
const structured = await deepseekProcessor.processInvoiceOCR(combinedText, {
  apiKey: process.env.deepseek_api_key,
});
```

## Troubleshooting

### Error: deepseek_api_key not found

**Solution:**
```bash
# Check .env file exists
ls -la .env

# Check file content
cat .env

# Recreate if needed
echo "deepseek_api_key=sk-xxxxxx" > .env
```

### Error: DeepSeek API error: 401

**Solution:**
- Verify API key is correct
- Check API key hasn't expired
- Generate new key at: https://platform.deepseek.com

### Low Confidence Scores

**Solution:**
- Increase OCR quality (higher scale)
- Use correct language code
- Clean up source image (contrast, DPI)
- Try different PSM mode

### Empty or Missing Fields

**Solution:**
- Check OCR text quality first (run recognize.js)
- Verify document is actually an invoice/bill
- Check if document is in supported language
- Look at `confidence_score` field

## Cost Estimation

DeepSeek API is very affordable:
- ~$0.001 per invoice (typical)
- $1 processes ~1000 invoices
- Much cheaper than manual data entry

## Language Support

Standard OCR supports 100+ languages:
```bash
node recognize-invoice.js invoice.pdf eng     # English
node recognize-invoice.js invoice.pdf ind     # Indonesian
node recognize-invoice.js invoice.pdf chi_sim # Chinese Simplified
node recognize-invoice.js invoice.pdf ara     # Arabic
```

DeepSeek AI understands all major languages.

## More Information

- [DeepSeek Integration Docs](../../docs/deepseek-integration.md)
- [Tesseract.js API](../../docs/api.md)
- [FAQ](../../docs/faq.md)
- [DeepSeek API](https://platform.deepseek.com/docs)

## Contributing

Found a bug or want to improve the examples?

1. Test with sample data first
2. Check error messages carefully
3. Open an issue with full details
4. Submit PR with clear description

---

**Note:** DeepSeek integration requires an API key. Standard OCR examples work offline without any API key.
