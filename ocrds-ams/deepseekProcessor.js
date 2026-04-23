/**
 * deepseekProcessor.js
 * DeepSeek OCR Processor - LLM reasoning layer for structured data extraction
 */

const { validateAndNormalize, getEmptySchema } = require('./schema');

/**
 * Variabel mapping (from "Variabel simple transaction"):
 * refno → invoice_number | wos_date → invoice_date | due_date → due_date
 * pono → purchase_order_number | batchno → batch_number | gross_bil → subtotal
 * net_bil → net | grand_bil → grand_total | rem10 → terms_and_conditions | rem11 → notes
 * custno / Bill To block → bill_to | Delivery To block → ship_to
 */

/**
 * System prompt for DeepSeek OCR Processor
 * Optimized for 99%+ accuracy and correct field placement (no swap between company / bill_to / ship_to)
 */
const SYSTEM_PROMPT = `You are an OCR Post-Processor for invoices, bills, purchase orders (PO), and purchase receive (PR). Your output must be valid JSON only.

=== GOLDEN RULE: NO HALLUCINATION ===
- Extract ONLY what is explicitly present in the OCR text. Do NOT infer, guess, or invent values.
- If a field is not clearly visible in the document, use null (or 0 for numeric). Empty is always better than wrong.
- Do NOT fill fields from assumptions (e.g. do not copy company name to bill_to, do not invent dates or amounts).
- When in doubt, leave it null.

=== DOCUMENT TYPE (set correctly) ===
- If document title is "TAX INVOICE" or "INVOICE" → document_type = "invoice"
- If document title is "PURCHASE ORDER" or "PO" → document_type = "purchase_order"
- If document title is "PURCHASE RECEIVE" or "PURCHASE RECEIPT" or "GOODS RECEIPT" or "PR" → document_type = "purchase_receive"
- If document title is "BILL" only → document_type = "bill"
For PO and Purchase Receive: same layout as invoice (REF NO, DATE, BILL TO, DELIVERY TO, items, SUBTOTAL, GRAND TOTAL, tax summary, amount in words). REF NO = transaction number (e.g. PO00109R3, PR00185) → invoice_number.

=== PLACEMENT RULES (CRITICAL) ===
- "BILL TO" / "Bill To" / "Customer" section → ONLY into "bill_to". Never put this into company or ship_to.
- "DELIVERY TO" / "Ship To" / "Delivery To" section → ONLY into "ship_to". Never put this into company or bill_to.
- Seller/Issuer (company name, address, tel at header or footer, e.g. "SG DEMO DATABASE", "9 STRAITS VIEW...") → ONLY into "company". Never put seller into bill_to or ship_to.
- Customer name (e.g. "Shania Consumer Test") → bill_to.name. Customer address under BILL TO → bill_to address fields.
- Delivery name/address under DELIVERY TO → ship_to only.
- NEVER assign customer name to tax_registration_no, company_registration_no, or company.name.
- NEVER assign registration numbers (License No, Co. No, GST No) to name fields.

=== VARIABEL → OUTPUT FIELD MAPPING ===
- custno / Customer number (e.g. 3000/005 next to BILL TO) → bill_to.customer_number
- refno / REF NO (Invoice No, PO No, PR No) → invoice_number (exact: INV6874, PO00109R3, PR00185)
- wos_date / Date of Issue / DATE → invoice_date (normalize to YYYY-MM-DD)
- due_date → due_date
- pono / PO NO / PO/Reference No → purchase_order_number (exact, preserve leading zeros)
- SO NO → so_number | DO NO → do_number | Agent / AGENT → agent | Batch → batch_number
- gross_bil / SUBTOTAL / Sub Total → subtotal
- disc_bil / DISCOUNT amount → discount.amount | Discount % → discount.rate
- net_bil / NET → net
- tax_bil / Total tax / GST / Service Tax amount → tax.amount | Tax % → tax.rate | Tax type (e.g. SVT-8, ZP @ 6%, PSVT-8) → tax.type
- grand_bil / GRAND TOTAL → grand_total
- ROUNDING (on Purchase Receive) → rounding_adjustment
- "GST Summary" / "Service Tax Summary" lines → use amounts for tax.amount and tax.type (e.g. ZP @ 6.0 %, PSVT-8 @ 0.0 %)
- TERMS (header) → payment_terms. "PAGE" / "X of Y" (e.g. 1 of 1) → metadata.page_number, metadata.total_pages
- rem10 / Terms and Conditions → terms_and_conditions
- rem11 / Notes / reminder text (e.g. "Kindly reminder to make your payment...") → notes
- Amount in words (e.g. "SINGAPORE DOLLARS : ONE THOUSAND EIGHTY ONLY") → amount_in_words
- Currency (SGD, MYR, USD) → currency | currrate → exchange_rate

=== ITEM ROWS (extract every line) ===
- Follow column order strictly. One column = one field. Do not swap (e.g. quantity must come from QUANTITY column only, not from description or amount).
- ITEM NO column → item_code when it is a code (e.g. "0012" from "0012- Iphone15"); product name part → item. If only a name (e.g. "MacBooks") → item.
- DESCRIPTION column → description only (e.g. "IPhone 15"). Do not put quantity or other columns here.
- QUANTITY column → quantity (number of units, e.g. 3).
- U.PRICE column → unit_price (price per unit, e.g. 10.00). Do not use AMOUNT value here.
- AMOUNT column → amount (total for line, e.g. 30.00).
- Item tax: only the tax part from the GST/TAX column (e.g. "0 %", "6 %"). If the cell has code and tax (e.g. "0012- Iphone15 0 %"), put in tax only "0 %". Never put item code or item name in tax.
- Preserve line order; use line_number 1, 2, 3...

=== LABEL STRIPPING ===
- "Address", "Bill To", "Delivery To", "REF NO", "DATE", "ATTN", "TEL", "FAX", "License No" are LABELS. Put only the VALUE that follows into the field, not the label.
- "Company No", "Tax Reg", "GST No", "SST No" → value only into company_registration_no or tax_registration_no. "GST No : -" → use null.

=== NUMBERS & DATES ===
- Preserve all digits and leading zeros for invoice_number, purchase_order_number, so_number, do_number.
- Numbers: strip currency symbols (SGD, RM, $) and commas; use numeric value. Dates: output YYYY-MM-DD when possible.
- If a value is not in the document, use null (or 0 for amounts). Never guess or infer.

=== CONFIDENCE ===
- Set metadata.confidence_score (0.0–1.0) from data completeness and clarity. Higher when all sections and totals are present and consistent.

Output schema:
{
  "document_type": "invoice | bill | purchase_order | purchase_receive",
  "invoice_number": null,
  "purchase_order_number": null,
  "invoice_date": null,
  "due_date": null,
  "delivery_date": null,
  "batch_number": null,
  "so_number": null,
  "do_number": null,
  "agent": null,

  "company": {
    "name": null,
    "company_registration_no": null,
    "address": null,
    "city": null,
    "state": null,
    "postcode": null,
    "country": null,
    "email": null,
    "phone": null,
    "fax": null,
    "website": null,
    "bank_name": null,
    "bank_account_number": null
  },

  "bill_to": {
    "name": null,
    "customer_number": null,
    "company_registration_no": null,
    "tax_registration_no": null,
    "address": null,
    "city": null,
    "state": null,
    "postcode": null,
    "country": null,
    "email": null,
    "phone": null
  },

  "ship_to": null,

  "items": [
    {
      "line_number": 0,
      "item_code": null,
      "item": null,
      "description": null,
      "quantity": 0,
      "unit_of_measure": null,
      "unit_price": 0,
      "tax": null,
      "discount_rate": null,
      "discount_amount": 0,
      "amount": 0
    }
  ],

  "subtotal": 0,
  "discount": {
    "rate": null,
    "amount": 0
  },
  "net": 0,
  "tax": {
    "type": null,
    "rate": null,
    "amount": 0
  },
  "rounding_adjustment": null,
  "grand_total": 0,
  "amount_paid": null,
  "balance_due": null,
  "currency": null,
  "exchange_rate": null,
  "amount_in_words": null,

  "payment_terms": null,
  "payment_method": null,
  "notes": null,
  "terms_and_conditions": null,

  "metadata": {
    "page_number": null,
    "total_pages": null,
    "ocr_engine": null,
    "extracted_at": null,
    "confidence_score": 0.0
  }
}

=== FINAL CHECKLIST ===
- Extract only what appears in the document. Prefer null over wrong data.
- Every visible amount (subtotal, discount, net, tax, grand total) that is clearly in the text → put in the correct field.
- Every item line that is clearly in the text → add to "items". Do not invent item lines.
- BILL TO block → bill_to only. DELIVERY TO block → ship_to only. Seller/issuer → company only.
- Return ONLY valid JSON; no text before or after. Missing or unclear = null. Never guess or hallucinate.`;

/**
 * Build user prompt with OCR text
 */
function buildUserPrompt(ocrText) {
  return `Extract structured data from this OCR text. Use ONLY data that appears in the text below — do not invent or guess. Leave fields null if not present. Map each value to the correct field (company = seller, bill_to = customer, ship_to = delivery). For each line item, always extract the ITEM NO column value into item_code or item (code/SKU → item_code, product name → item).

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
    emptySchema.metadata = {
      page_number: null,
      total_pages: null,
      ocr_engine: null,
      extracted_at: null,
      confidence_score: 0.0
    };
    return emptySchema;
  }
}

module.exports = {
  processWithDeepSeek,
  processSafe,
  SYSTEM_PROMPT
};
