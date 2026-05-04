# OCRDS_AMS

Duplicate of OCRDS for **OCRDS_AMS**. Modify this copy as needed (schema, prompts, UI).

- **Inventory system** (original): `ocrds/` — port 3000  
- **OCRDS_AMS** (this): `ocrds-ams/` — port 3001  

## Overview
Post-OCR processor that transforms raw OCR text into structured business documents using DeepSeek LLM.

## Run from repo root
```bash
npm run start:ams
```
Or from this folder:
```bash
npm install
npm start
```
Access: `http://localhost:3001`

## Environment
Create `.env` in this folder (copy `ocrds-ams/.env.example` to `.env`, or reuse keys from `ocrds/.env`):
```
DEEPSEEK_API_KEY=your_api_key_here
PORT=3001
```

## File structure
Same as `ocrds/`: index.js, ocr.js, deepseekProcessor.js, schema.js, index.html, script.js, style.css.
