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
  invoice_number: null, // refno - Nomor transaksi
  purchase_order_number: null, // pono - PO/Reference No.
  invoice_date: null, // wos_date - Date of Issue
  due_date: null, // due_date - Date of Due
  delivery_date: null,
  batch_number: null, // batchno
  so_number: null, // SO NO (Sales Order)
  do_number: null, // DO NO (Delivery Order)
  agent: null, // agent

  company: {
    name: null,
    company_registration_no: null,
    address: null,
    city: null,
    state: null,
    postcode: null,
    country: null,
    email: null,
    phone: null,
    fax: null,
    website: null,
    bank_name: null,
    bank_account_number: null
  },

  bill_to: {
    name: null,
    customer_number: null, // custno - Customer/Supplier number
    company_registration_no: null,
    tax_registration_no: null,
    address: null,
    city: null,
    state: null,
    postcode: null,
    country: null,
    email: null,
    phone: null
  },

  ship_to: {
    name: null,
    address: null,
    city: null,
    state: null,
    postcode: null,
    country: null
  },

  items: [],

  subtotal: 0, // gross_bil - Sub Total
  discount: {
    rate: null,
    amount: 0
  },
  net: 0, // net_bil
  tax: {
    type: null,
    rate: null,
    amount: 0
  },
  rounding_adjustment: 0,
  grand_total: 0, // grand_bil
  amount_paid: 0,
  balance_due: 0,
  currency: null,
  exchange_rate: null,
  amount_in_words: null,

  payment_terms: null,
  payment_method: null,
  notes: null, // rem11
  terms_and_conditions: null, // rem10

  metadata: {
    page_number: null,
    total_pages: null,
    ocr_engine: null,
    extracted_at: null,
    confidence_score: 0.0
  }
};

/**
 * Item schema template
 */
const ITEM_SCHEMA = {
  line_number: 0,
  item_code: null,
  item: null,
  description: null,
  quantity: 0,
  unit_of_measure: null,
  unit_price: 0,
  tax: null,
  discount_rate: null,
  discount_amount: 0,
  amount: 0
};

/**
 * Normalize numeric value
 * Handles strings, removes currency symbols, converts to float
 */
function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return parseFloat(value.toFixed(2));

  // Remove currency symbols, commas, spaces (SGD, MYR, etc.)
  const cleaned = String(value)
    .replace(/\b(SGD|MYR|USD|EUR|GBP)\b/gi, '')
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
  if (lower.includes('purchase') && lower.includes('order')) return 'purchase_order';
  if (lower.includes('purchase') && (lower.includes('receive') || lower.includes('receipt'))) return 'purchase_receive';
  if (lower.includes('bill')) return 'bill';

  return value;
}

/**
 * Validate and normalize a single item
 */
function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null;

  return {
    line_number: typeof item.line_number === 'number' ? item.line_number : 0,
    item_code: item.item_code || null,
    item: item.item || null,
    description: item.description || null,
    quantity: normalizeNumber(item.quantity),
    unit_of_measure: item.unit_of_measure || null,
    unit_price: normalizeNumber(item.unit_price),
    tax: item.tax || null,
    discount_rate: item.discount_rate || null,
    discount_amount: normalizeNumber(item.discount_amount),
    amount: normalizeNumber(item.amount)
  };
}

/**
 * Normalize address object fields (company, bill_to, ship_to)
 */
function normalizeAddress(source, fields) {
  const result = {};
  for (const field of fields) {
    result[field] = source[field] || null;
  }
  return result;
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
  normalized.due_date = normalizeDate(data.due_date);
  normalized.delivery_date = normalizeDate(data.delivery_date);
  normalized.batch_number = data.batch_number || null;
  normalized.so_number = data.so_number || null;
  normalized.do_number = data.do_number || null;
  normalized.agent = data.agent || null;

  // Company info
  if (data.company && typeof data.company === 'object') {
    normalized.company = {
      name: data.company.name || null,
      company_registration_no: data.company.company_registration_no || null,
      address: data.company.address || null,
      city: data.company.city || null,
      state: data.company.state || null,
      postcode: data.company.postcode || null,
      country: data.company.country || null,
      email: data.company.email || null,
      phone: data.company.phone || null,
      fax: data.company.fax || null,
      website: data.company.website || null,
      bank_name: data.company.bank_name || null,
      bank_account_number: data.company.bank_account_number || null
    };
  }

  // Bill to info
  if (data.bill_to && typeof data.bill_to === 'object') {
    normalized.bill_to = {
      name: data.bill_to.name || null,
      customer_number: data.bill_to.customer_number || null,
      company_registration_no: data.bill_to.company_registration_no || null,
      tax_registration_no: data.bill_to.tax_registration_no || null,
      address: data.bill_to.address || null,
      city: data.bill_to.city || null,
      state: data.bill_to.state || null,
      postcode: data.bill_to.postcode || null,
      country: data.bill_to.country || null,
      email: data.bill_to.email || null,
      phone: data.bill_to.phone || null
    };
  }

  // Ship to info
  if (data.ship_to && typeof data.ship_to === 'object') {
    normalized.ship_to = {
      name: data.ship_to.name || null,
      address: data.ship_to.address || null,
      city: data.ship_to.city || null,
      state: data.ship_to.state || null,
      postcode: data.ship_to.postcode || null,
      country: data.ship_to.country || null
    };
  } else {
    normalized.ship_to = null;
  }

  // Items
  if (Array.isArray(data.items)) {
    normalized.items = data.items
      .map(normalizeItem)
      .filter(item => item !== null);
  }

  // Financial data
  normalized.subtotal = normalizeNumber(data.subtotal);

  // Discount as object
  if (data.discount && typeof data.discount === 'object') {
    normalized.discount = {
      rate: data.discount.rate || null,
      amount: normalizeNumber(data.discount.amount)
    };
  } else {
    normalized.discount = {
      rate: null,
      amount: normalizeNumber(data.discount)
    };
  }

  normalized.net = normalizeNumber(data.net);
  normalized.rounding_adjustment = normalizeNumber(data.rounding_adjustment);
  normalized.grand_total = normalizeNumber(data.grand_total);
  normalized.amount_paid = normalizeNumber(data.amount_paid);
  normalized.balance_due = normalizeNumber(data.balance_due);
  normalized.exchange_rate = data.exchange_rate || null;

  // Tax
  if (data.tax && typeof data.tax === 'object') {
    normalized.tax = {
      type: data.tax.type || null,
      rate: data.tax.rate || null,
      amount: normalizeNumber(data.tax.amount)
    };
  }

  // Currency and payment
  normalized.currency = normalizeCurrency(data.currency);
  normalized.amount_in_words = data.amount_in_words || null;
  normalized.payment_terms = data.payment_terms || null;
  normalized.payment_method = data.payment_method || null;
  normalized.notes = data.notes || null;
  normalized.terms_and_conditions = data.terms_and_conditions || null;

  // Metadata
  const metaSrc = data.metadata || {};
  const confidence = parseFloat(metaSrc.confidence_score ?? data.confidence_score);
  normalized.metadata = {
    page_number: metaSrc.page_number || null,
    total_pages: metaSrc.total_pages || null,
    ocr_engine: metaSrc.ocr_engine || null,
    extracted_at: metaSrc.extracted_at || null,
    confidence_score: (isNaN(confidence) || confidence < 0 || confidence > 1)
      ? 0.0
      : parseFloat(confidence.toFixed(2))
  };

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