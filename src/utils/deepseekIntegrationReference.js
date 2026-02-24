/**
 * ============================================================
 * DeepSeek AI Integration - Complete Implementation Summary
 * ============================================================
 * 
 * This file demonstrates the three core components requested:
 * 1. DeepSeek prompt string
 * 2. API request body construction
 * 3. Response parsing logic
 * 
 * Full implementation: src/utils/deepseekProcessor.js
 */

// =============================================================================
// 1. DEEPSEEK PROMPT STRING
// =============================================================================

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

// =============================================================================
// 2. DEEPSEEK API REQUEST BODY (JavaScript)
// =============================================================================

/**
 * Build the complete request payload for DeepSeek API
 * @param {string} ocrText - Raw OCR text from Tesseract
 * @returns {object} Request body for DeepSeek API
 */
function buildDeepSeekRequest(ocrText) {
  return {
    // Model selection
    model: 'deepseek-chat',
    
    // Message array with system prompt and user input
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT, // Defined above
      },
      {
        role: 'user',
        content: `Parse this OCR text from a financial document:\n\n${ocrText}`,
      },
    ],
    
    // Temperature: 0 for deterministic output
    temperature: 0,
    
    // Max tokens for response
    max_tokens: 2000,
    
    // Force JSON response format
    response_format: { type: 'json_object' },
  };
}

// =============================================================================
// 3. RESPONSE PARSING LOGIC (Safe JSON Parsing)
// =============================================================================

/**
 * Parse and validate DeepSeek API response
 * Handles edge cases and validates data types
 * 
 * @param {object} response - Raw API response from DeepSeek
 * @returns {object} Validated structured financial data
 */
function parseDeepSeekResponse(response) {
  try {
    // Extract content from response
    const content = response.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in API response');
    }

    // Clean content (remove markdown code blocks if present)
    const cleanContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // Parse JSON safely
    const data = JSON.parse(cleanContent);

    // =================================================================
    // VALIDATION: Ensure data integrity
    // =================================================================
    
    // Document type validation
    if (!data.document_type) {
      data.document_type = null;
    }

    // Grand total validation (required, must be numeric)
    if (data.grand_total !== null && data.grand_total !== undefined) {
      data.grand_total = parseFloat(data.grand_total) || 0;
    } else {
      data.grand_total = 0;
    }

    // Validate and normalize items array
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

    // Validate numeric fields
    if (data.subtotal !== null && data.subtotal !== undefined) {
      data.subtotal = parseFloat(data.subtotal) || null;
    }
    
    if (data.discount !== null && data.discount !== undefined) {
      data.discount = parseFloat(data.discount) || null;
    }
    
    if (data.tax?.amount !== null && data.tax?.amount !== undefined) {
      data.tax.amount = parseFloat(data.tax.amount) || null;
    }

    // Confidence score validation (must be between 0 and 1)
    if (data.confidence_score !== null && data.confidence_score !== undefined) {
      data.confidence_score = Math.max(0, Math.min(1, parseFloat(data.confidence_score) || 0));
    } else {
      data.confidence_score = 0.5; // Default: medium confidence
    }

    return data;
    
  } catch (err) {
    // Safe error handling
    throw new Error(`Failed to parse structured data: ${err.message}`);
  }
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/**
 * Complete integration example
 */
async function exampleUsage() {
  const ocrText = `
    INVOICE
    ABC Corp
    Invoice #: INV-2024-001
    Date: 2024-02-24
    
    Item: Professional Services
    Qty: 10
    Price: $150.00
    Amount: $1,500.00
    
    Total: $1,500.00
  `;
  
  // Step 1: Build request
  const requestBody = buildDeepSeekRequest(ocrText);
  
  // Step 2: Make API call (using native https or fetch)
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });
  
  const apiResponse = await response.json();
  
  // Step 3: Parse response
  const structuredData = parseDeepSeekResponse(apiResponse);
  
  console.log(structuredData);
  // Output:
  // {
  //   document_type: "invoice",
  //   invoice_number: "INV-2024-001",
  //   invoice_date: "2024-02-24",
  //   company: { name: "ABC Corp", ... },
  //   items: [{ description: "Professional Services", quantity: 10, ... }],
  //   grand_total: 1500.00,
  //   currency: "USD",
  //   confidence_score: 0.95
  // }
}

// =============================================================================
// EDGE CASES HANDLED
// =============================================================================

/*
1. BROKEN OCR LINES
   Input:  "Inv oice #: AB\nC-2024"
   Output: { invoice_number: "ABC-2024" }

2. MULTIPLE TOTALS
   Input:  "Subtotal: 1000\nTax: 100\nGrand Total: 1100"
   Output: { grand_total: 1100 }

3. CURRENCY INFERENCE
   Input:  "Total: RM 1,500.00"
   Output: { currency: "MYR", grand_total: 1500.00 }

4. MISSING VALUES
   Input:  "No invoice number"
   Output: { invoice_number: null }

5. DATE NORMALIZATION
   Input:  "Date: 24-Feb-2024"
   Output: { invoice_date: "2024-02-24" }

6. NUMERIC PARSING
   Input:  "Total: $1,234.56"
   Output: { grand_total: 1234.56 }
*/

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  SYSTEM_PROMPT,
  buildDeepSeekRequest,
  parseDeepSeekResponse,
};
