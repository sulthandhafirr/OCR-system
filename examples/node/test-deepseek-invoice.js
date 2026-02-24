#!/usr/bin/env node

'use strict';

/**
 * Test DeepSeek Integration with Sample Invoice OCR Text
 * 
 * This test uses realistic noisy OCR text to validate
 * the DeepSeek AI post-processing capabilities.
 */

require('dotenv').config();
const { processInvoiceOCR } = require('../../src/utils/deepseekProcessor');

// Sample noisy OCR text (simulating real-world OCR output)
const SAMPLE_INVOICE_OCR = `
AB C CORPORATION
123 Main Street, Suite 500
New York, NY 10001
Tel: +1-555-123-4567
Email: billing@abccorp.com

IN VOICE

Invoice #: INV-2024-00 12
Date: February 24, 2024
PO Number: PO-2024-500

BILL TO:
XYZ Company Ltd
456 Customer Ave
Los Angeles, CA 90001

ITEM DESCRIPTION         QTY    UNIT PRICE    AMOUNT
-------------------------------------------------------
Professional Services     10       $150.00   $1,500.00
Consulting Hours          25       $200.00   $5,000.00
Software License           1     $1,200.00   $1,200.00

                               Subtotal:    $7,700.00
                              Tax (10%):      $770.00
                               Discount:        $0.00
-------------------------------------------------------
                          GRAND TOTAL:    $8,470.00

Amount in Words: Eight Thousand Four Hundred Seventy Dollars

Payment Terms: Net 30 days
Due Date: March 25, 2024

Thank you for your business!
`;

// Another sample with more noise
const SAMPLE_NOISY_INVOICE = `
TECH SOL UTIONS INC.
789 Tech Park Dr
San Francisco, C A 94102

INV#: TS-24-0089
Date: 15-Feb-2024

Bill To:
Customer Corp
321 Business Rd

Items:
1. Web Development - 40 hrs @ RM 250/hr = RM 10,000
2. Server Hosting - 12 months @ RM 500/mo = RM 6,000

Sub total: RM 16,000
SST 6%: RM 960
--------------------------------
Total: RM 16,960

Amt: Sixteen Thousand Nine Hundred Sixty Ringgit Malaysia

Terms: 30 days
`;

// Test validation helper
function validateStructuredData(data, testName) {
  console.log(`\n✓ Test: ${testName}`);
  console.log('='.repeat(50));
  
  // Check required fields
  const checks = {
    'Has document type': data.document_type !== null,
    'Has grand total': data.grand_total !== null && data.grand_total > 0,
    'Has currency': data.currency !== null && data.currency.length > 0,
    'Has items array': Array.isArray(data.items),
    'Has confidence score': data.confidence_score >= 0 && data.confidence_score <= 1,
  };
  
  let passed = 0;
  let failed = 0;
  
  for (const [check, result] of Object.entries(checks)) {
    if (result) {
      console.log(`  ✓ ${check}`);
      passed++;
    } else {
      console.log(`  ✗ ${check}`);
      failed++;
    }
  }
  
  console.log('='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  // Show key extracted data
  console.log('\nExtracted Data:');
  console.log(`  Document Type: ${data.document_type || 'N/A'}`);
  console.log(`  Invoice #: ${data.invoice_number || 'N/A'}`);
  console.log(`  Date: ${data.invoice_date || 'N/A'}`);
  console.log(`  Company: ${data.company?.name || 'N/A'}`);
  console.log(`  Bill To: ${data.bill_to?.name || 'N/A'}`);
  console.log(`  Items: ${data.items?.length || 0}`);
  console.log(`  Total: ${data.currency || ''} ${data.grand_total || 0}`);
  console.log(`  Confidence: ${Math.round((data.confidence_score || 0) * 100)}%`);
  
  return failed === 0;
}

// Main test function
async function runTests() {
  const apiKey = process.env.deepseek_api_key;
  
  if (!apiKey) {
    console.error('❌ Error: deepseek_api_key not found in .env file');
    console.error('Please set your DeepSeek API key in .env');
    console.error('Get API key from: https://platform.deepseek.com');
    process.exit(1);
  }
  
  console.log('='.repeat(50));
  console.log('  DeepSeek Invoice OCR Integration Tests');
  console.log('='.repeat(50));
  
  let allPassed = true;
  
  // Test 1: Clean invoice
  try {
    console.log('\n[Test 1/2] Processing clean invoice OCR...');
    const result1 = await processInvoiceOCR(SAMPLE_INVOICE_OCR, {
      apiKey,
      temperature: 0,
    });
    
    const passed1 = validateStructuredData(result1, 'Clean Invoice');
    allPassed = allPassed && passed1;
    
    // Show full JSON
    console.log('\nFull JSON Output:');
    console.log(JSON.stringify(result1, null, 2).substring(0, 800) + '...');
    
  } catch (error) {
    console.error(`\n❌ Test 1 Failed: ${error.message}`);
    allPassed = false;
  }
  
  // Test 2: Noisy invoice
  try {
    console.log('\n[Test 2/2] Processing noisy invoice OCR...');
    const result2 = await processInvoiceOCR(SAMPLE_NOISY_INVOICE, {
      apiKey,
      temperature: 0,
    });
    
    const passed2 = validateStructuredData(result2, 'Noisy Invoice');
    allPassed = allPassed && passed2;
    
    // Show full JSON
    console.log('\nFull JSON Output:');
    console.log(JSON.stringify(result2, null, 2).substring(0, 800) + '...');
    
  } catch (error) {
    console.error(`\n❌ Test 2 Failed: ${error.message}`);
    allPassed = false;
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✓ All tests passed!');
    console.log('='.repeat(50));
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    console.log('='.repeat(50));
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test suite error:', error.message);
  process.exit(1);
});
