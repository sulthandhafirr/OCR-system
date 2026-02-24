'use strict';

/**
 * DeepSeek AI Post-Processor for OCR
 * Converts noisy OCR text into structured financial data
 * Focus: Bills, Invoices, Purchase Orders
 */

const https = require('https');

/**
 * System prompt for DeepSeek AI
 * Instructs the model to act as an intelligent OCR post-processor
 */
const SYSTEM_PROMPT = `You are an expert OCR post-processor specializing in financial documents (invoices, bills, purchase orders).

Your task:
- Parse noisy, broken OCR text into structured financial data
- Use contextual reasoning to infer missing or messy fields
- Normalize dates, currency symbols, and numeric values
- Handle duplicate values, broken lines, and formatting issues
- Prefer "Grand Total" or "Total Amount" over subtotals
- Prefer invoice/PO date over other dates (issue date, due date)

Critical rules:
- NEVER hallucinate missing values - use null if uncertain
- Return VALID JSON only, no markdown, no explanations
- Maintain numeric precision for financial values
- Infer currency from symbols (RM/MYR → MYR, $ → USD, etc.)

Output schema (strict):
{
  "document_type": "invoice | bill | purchase_order",
  "invoice_number": "string or null",
  "purchase_order_number": "string or null", 
  "invoice_date": "YYYY-MM-DD or null",
  "company": {
    "name": "string or null",
    "address": "string or null",
    "email": "string or null",
    "phone": "string or null"
  },
  "bill_to": {
    "name": "string or null",
    "address": "string or null"
  },
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "amount": number
    }
  ],
  "subtotal": number or null,
  "tax": {
    "type": "string or null (e.g., VAT, GST, SST)",
    "rate": "string or null (e.g., 10%, 6%)",
    "amount": number or null
  },
  "discount": number or null,
  "grand_total": number,
  "currency": "string (ISO code: MYR, USD, EUR, etc.)",
  "amount_in_words": "string or null",
  "payment_terms": "string or null",
  "confidence_score": 0.0 to 1.0
}`;

/**
 * Build DeepSeek API request payload
 * @param {string} ocrText - Raw OCR text from Tesseract
 * @param {object} options - Additional options
 * @returns {object} Request payload for DeepSeek API
 */
function buildRequestPayload(ocrText, options = {}) {
  const {
    temperature = 0, // Deterministic output
    maxTokens = 2000,
  } = options;

  return {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Parse this OCR text from a financial document:\n\n${ocrText}`,
      },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' }, // Force JSON response
  };
}

/**
 * Make HTTPS request to DeepSeek API
 * @param {string} apiKey - DeepSeek API key
 * @param {object} payload - Request payload
 * @returns {Promise<object>} API response
 */
function makeDeepSeekRequest(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);

    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(body);
            resolve(response);
          } catch (err) {
            reject(new Error(`Failed to parse response: ${err.message}`));
          }
        } else {
          let errorMsg = `API error: ${res.statusCode}`;
          try {
            const errorData = JSON.parse(body);
            errorMsg = errorData.error?.message || errorMsg;
          } catch (e) {
            // Ignore parse error
          }
          reject(new Error(errorMsg));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Parse and validate DeepSeek response
 * @param {object} response - Raw API response
 * @returns {object} Structured financial data
 */
function parseResponse(response) {
  try {
    // Extract content from response
    const content = response.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in API response');
    }

    // Parse JSON (remove markdown code blocks if present)
    const cleanContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const data = JSON.parse(cleanContent);

    // Basic validation
    if (!data.document_type) {
      data.document_type = null;
    }

    if (data.grand_total !== null && data.grand_total !== undefined) {
      data.grand_total = parseFloat(data.grand_total) || 0;
    }

    // Validate items array
    if (Array.isArray(data.items)) {
      data.items = data.items.map(item => ({
        description: item.description || '',
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        amount: parseFloat(item.amount) || 0,
      }));
    } else {
      data.items = [];
    }

    // Ensure confidence score is between 0 and 1
    if (data.confidence_score !== null && data.confidence_score !== undefined) {
      data.confidence_score = Math.max(0, Math.min(1, parseFloat(data.confidence_score) || 0));
    } else {
      data.confidence_score = 0.5; // Default medium confidence
    }

    return data;
  } catch (err) {
    throw new Error(`Failed to parse structured data: ${err.message}`);
  }
}

/**
 * Process OCR text with DeepSeek AI
 * Main entry point for invoice/bill processing
 * 
 * @param {string} ocrText - Raw OCR text from Tesseract
 * @param {object} options - Configuration options
 * @param {string} options.apiKey - DeepSeek API key (required)
 * @param {number} options.temperature - Model temperature (default: 0)
 * @param {number} options.maxTokens - Max tokens for response (default: 2000)
 * @returns {Promise<object>} Structured financial data
 */
async function processInvoiceOCR(ocrText, options = {}) {
  const { apiKey } = options;

  if (!apiKey) {
    throw new Error('DeepSeek API key is required');
  }

  if (!ocrText || typeof ocrText !== 'string') {
    throw new Error('OCR text must be a non-empty string');
  }

  try {
    // Build request
    const payload = buildRequestPayload(ocrText, options);

    // Call DeepSeek API
    const response = await makeDeepSeekRequest(apiKey, payload);

    // Parse and validate response
    const structuredData = parseResponse(response);

    return structuredData;
  } catch (err) {
    throw new Error(`DeepSeek processing failed: ${err.message}`);
  }
}

module.exports = {
  processInvoiceOCR,
  buildRequestPayload, // Exported for testing
  parseResponse, // Exported for testing
};
