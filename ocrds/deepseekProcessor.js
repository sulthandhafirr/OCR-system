/**
 * deepseekProcessor.js
 * DeepSeek OCR Processor - LLM reasoning layer for structured data extraction
 */

const { validateAndNormalize, getEmptySchema } = require('./schema');

/**
 * System prompt for DeepSeek OCR Processor
 * Defines the behavior and constraints for the LLM
 */
const SYSTEM_PROMPT = `You are an OCR Post-Processor specialized in financial document analysis.

Your role:
- Interpret raw, noisy OCR text from invoices, bills, and purchase orders
- Extract structured business and financial entities
- Apply accounting-domain reasoning
- Normalize dates, currencies, and numeric values
- Handle incomplete or ambiguous data gracefully

Strict rules:
1. Output ONLY valid JSON - no explanatory text before or after
2. Use null for missing fields - NEVER hallucinate or guess
3. Prefer grand_total over subtotal when both exist
4. Prefer invoice_date or purchase_order date over other dates
5. Infer currency from context (RM/MYR → MYR, $ → USD)
6. If multiple candidates exist, choose the most logical based on document context
7. Calculate confidence_score (0.0-1.0) based on data completeness and clarity

Output schema:
{
  "document_type": "invoice | bill | purchase_order",
  "invoice_number": null,
  "purchase_order_number": null,
  "invoice_date": null,
  "company": {
    "name": null,
    "address": null,
    "email": null,
    "phone": null
  },
  "bill_to": {
    "name": null,
    "address": null
  },
  "items": [
    {
      "description": null,
      "quantity": 0,
      "unit_price": 0,
      "amount": 0
    }
  ],
  "subtotal": 0,
  "tax": {
    "type": null,
    "rate": null,
    "amount": 0
  },
  "discount": 0,
  "grand_total": 0,
  "currency": null,
  "amount_in_words": null,
  "payment_terms": null,
  "confidence_score": 0.0
}

Remember: Quality over completeness. Better to return null than incorrect data.`;

/**
 * Build user prompt with OCR text
 */
function buildUserPrompt(ocrText) {
  return `Extract structured data from this OCR text:

---
${ocrText}
---

Return only the JSON object, no other text.`;
}

/**
 * Call DeepSeek API
 * @param {string} ocrText - Raw OCR text to process
 * @param {string} apiKey - DeepSeek API key
 * @param {object} options - Optional parameters (model, temperature, etc.)
 * @returns {Promise<object>} - Structured document data
 */
async function processWithDeepSeek(ocrText, apiKey, options = {}) {
  if (!apiKey) {
    throw new Error('DeepSeek API key is required');
  }
  
  if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length === 0) {
    throw new Error('OCR text is required');
  }
  
  const endpoint = options.endpoint || 'https://api.deepseek.com/v1/chat/completions';
  const model = options.model || 'deepseek-chat';
  const temperature = options.temperature !== undefined ? options.temperature : 0.1;
  const maxTokens = options.maxTokens || 4096;
  
  try {
    // Make API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: buildUserPrompt(ocrText)
          }
        ],
        temperature: temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    
    // Extract content from response
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid response structure from DeepSeek API');
    }
    
    const content = result.choices[0].message.content;
    
    // Parse JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      // Attempt to extract JSON from potential text wrapper
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse JSON from LLM response: ${parseError.message}`);
      }
    }
    
    // Validate and normalize the output
    const normalized = validateAndNormalize(parsedData);
    
    return normalized;
    
  } catch (error) {
    console.error('DeepSeek processing error:', error);
    throw error;
  }
}

/**
 * Process with fallback to empty schema on error
 * @param {string} ocrText - Raw OCR text
 * @param {string} apiKey - DeepSeek API key
 * @param {object} options - Optional parameters
 * @returns {Promise<object>} - Structured data or empty schema with error
 */
async function processSafe(ocrText, apiKey, options = {}) {
  try {
    return await processWithDeepSeek(ocrText, apiKey, options);
  } catch (error) {
    console.error('Processing failed, returning empty schema:', error.message);
    const emptySchema = getEmptySchema();
    emptySchema.error = error.message;
    emptySchema.confidence_score = 0.0;
    return emptySchema;
  }
}

module.exports = {
  processWithDeepSeek,
  processSafe,
  SYSTEM_PROMPT
};
