# OCR Data Structuring (OCRDS)

## Overview
Post-OCR processor that transforms raw OCR text into structured business documents using DeepSeek LLM reasoning.

## Architecture
```
User Upload → OCR Extraction → DeepSeek Processor → Validated JSON → Output
```

## Core Components
- **ocr.js**: Raw text extraction from images/PDFs/Word docs
- **deepseekProcessor.js**: LLM-based semantic interpretation and structuring
- **schema.js**: Output validation and normalization
- **index.js**: HTTP server entry point
- **index.html**: Web UI

## Usage

### Install
```bash
npm install
```

### Run
```bash
node index.js
```

Access: `http://localhost:3000`

### Environment
Create `.env` file:
```
DEEPSEEK_API_KEY=your_api_key_here
PORT=3000
```

## Document Types Supported
- Invoices
- Bills
- Purchase Orders

## Output Format
Strict JSON schema with financial entities, items, totals, and metadata.

## Design Principles
1. No hallucination - missing data = null
2. OCR-agnostic - handles noisy input
3. Pluggable - can integrate with any OCR engine
4. Validated - schema enforcement at output layer
