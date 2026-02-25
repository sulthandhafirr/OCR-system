/**
 * schema.js
 * Defines and validates the output schema for structured bill/invoice data
 */

/**
 * Base schema template
 * All fields default to null or 0 to prevent hallucination
 */
const BASE_SCHEMA = {
  document_type: null,
  invoice_number: null,
  purchase_order_number: null,
  invoice_date: null,
  company: {
    name: null,
    address: null,
    email: null,
    phone: null
  },
  bill_to: {
    name: null,
    address: null
  },
  items: [],
  subtotal: 0,
  tax: {
    type: null,
    rate: null,
    amount: 0
  },
  discount: 0,
  grand_total: 0,
  currency: null,
  amount_in_words: null,
  payment_terms: null,
  confidence_score: 0.0
};

/**
 * Item schema template
 */
const ITEM_SCHEMA = {
  description: null,
  quantity: 0,
  unit_price: 0,
  amount: 0
};

/**
 * Normalize numeric value
 * Handles strings, removes currency symbols, converts to float
 */
function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return parseFloat(value.toFixed(2));
  
  // Remove currency symbols, commas, spaces
  const cleaned = String(value)
    .replace(/[RM$€£¥₹,\s]/g, '')
    .trim();
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2));
}

/**
 * Normalize date string to ISO format
 * Supports various date formats
 */
function normalizeDate(value) {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value; // Return original if invalid
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch (e) {
    return value; // Return as-is if parsing fails
  }
}

/**
 * Normalize currency code
 */
function normalizeCurrency(value) {
  if (!value) return null;
  
  const currencyMap = {
    'RM': 'MYR',
    'RINGGIT': 'MYR',
    'USD': 'USD',
    'DOLLAR': 'USD',
    'EUR': 'EUR',
    'EURO': 'EUR',
    'GBP': 'GBP',
    'POUND': 'GBP'
  };
  
  const upper = String(value).toUpperCase().trim();
  return currencyMap[upper] || upper;
}

/**
 * Validate document type
 */
function normalizeDocumentType(value) {
  if (!value) return null;
  
  const lower = String(value).toLowerCase();
  if (lower.includes('invoice')) return 'invoice';
  if (lower.includes('bill')) return 'bill';
  if (lower.includes('purchase') && lower.includes('order')) return 'purchase_order';
  
  return value;
}

/**
 * Validate and normalize a single item
 */
function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null;
  
  return {
    description: item.description || null,
    quantity: normalizeNumber(item.quantity),
    unit_price: normalizeNumber(item.unit_price),
    amount: normalizeNumber(item.amount)
  };
}

/**
 * Main validation function
 * Takes raw LLM output and normalizes it to schema
 */
function validateAndNormalize(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: expected object');
  }
  
  // Start with base schema
  const normalized = JSON.parse(JSON.stringify(BASE_SCHEMA));
  
  // Document metadata
  normalized.document_type = normalizeDocumentType(data.document_type);
  normalized.invoice_number = data.invoice_number || null;
  normalized.purchase_order_number = data.purchase_order_number || null;
  normalized.invoice_date = normalizeDate(data.invoice_date);
  
  // Company info
  if (data.company && typeof data.company === 'object') {
    normalized.company.name = data.company.name || null;
    normalized.company.address = data.company.address || null;
    normalized.company.email = data.company.email || null;
    normalized.company.phone = data.company.phone || null;
  }
  
  // Bill to info
  if (data.bill_to && typeof data.bill_to === 'object') {
    normalized.bill_to.name = data.bill_to.name || null;
    normalized.bill_to.address = data.bill_to.address || null;
  }
  
  // Items
  if (Array.isArray(data.items)) {
    normalized.items = data.items
      .map(normalizeItem)
      .filter(item => item !== null);
  }
  
  // Financial data
  normalized.subtotal = normalizeNumber(data.subtotal);
  normalized.discount = normalizeNumber(data.discount);
  normalized.grand_total = normalizeNumber(data.grand_total);
  
  // Tax
  if (data.tax && typeof data.tax === 'object') {
    normalized.tax.type = data.tax.type || null;
    normalized.tax.rate = data.tax.rate || null;
    normalized.tax.amount = normalizeNumber(data.tax.amount);
  }
  
  // Currency and payment
  normalized.currency = normalizeCurrency(data.currency);
  normalized.amount_in_words = data.amount_in_words || null;
  normalized.payment_terms = data.payment_terms || null;
  
  // Confidence score
  const confidence = parseFloat(data.confidence_score);
  normalized.confidence_score = (isNaN(confidence) || confidence < 0 || confidence > 1) 
    ? 0.0 
    : parseFloat(confidence.toFixed(2));
  
  return normalized;
}

/**
 * Get empty schema (for error cases)
 */
function getEmptySchema() {
  return JSON.parse(JSON.stringify(BASE_SCHEMA));
}

module.exports = {
  BASE_SCHEMA,
  ITEM_SCHEMA,
  validateAndNormalize,
  getEmptySchema,
  normalizeNumber,
  normalizeDate,
  normalizeCurrency
};
