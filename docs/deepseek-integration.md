# DeepSeek integration (OCRDS / OCRDS-AMS)

## Overview

Each app (`ocrds/`, `ocrds-ams/`) is a small Node HTTP server. Upload flow:

1. **OCR** — `ocr.js` extracts plain text from images (via `tesseract.js`), PDFs (`pdf-parse`), or Word (`.docx` via `mammoth`).
2. **Structuring** — `deepseekProcessor.js` sends that text to the DeepSeek chat API and expects **JSON only**, then validates it with `schema.js`.

There is **no** DeepSeek module inside `tesseract.js`; integration lives entirely in these local files.

## Setup

```bash
cd ocrds          # or ocrds-ams
npm install
cp .env.example .env   # on Windows: copy .env.example .env
```

Set in `.env`:

```env
DEEPSEEK_API_KEY=sk-...
PORT=3000
```

(`ocrds-ams` defaults to port `3001` in code if `PORT` is unset.)

## HTTP API

Same routes in both apps (only the base URL/port differs).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Web UI |
| `GET` | `/health` | JSON health check |
| `POST` | `/process` | Multipart file upload → OCR + DeepSeek → JSON response |
| `POST` | `/extract` | Multipart upload → OCR text only (no LLM) |

### `POST /process`

`Content-Type: multipart/form-data` with a file field containing the document.

**Requires** `DEEPSEEK_API_KEY` in the environment.

**Success response (shape):**

```json
{
  "success": true,
  "filename": "invoice.pdf",
  "ocr_text": "...",
  "structured_data": { },
  "processing_timestamp": "2026-05-04T12:00:00.000Z"
}
```

On failure: `success: false`, `error` message, HTTP 500 when appropriate.

### `POST /extract`

Same multipart upload; returns `ocr_text` and `character_count` without calling DeepSeek.

## Programmatic use (same repo)

From within an app directory, you can require the modules:

```javascript
require('dotenv').config();
const { extractTextSafe } = require('./ocr');
const { processSafe } = require('./deepseekProcessor');

(async () => {
  const fs = require('fs').promises;
  const buf = await fs.readFile('sample.pdf');
  const text = await extractTextSafe(buf, 'sample.pdf');
  const structured = await processSafe(text, process.env.DEEPSEEK_API_KEY);
  console.log(structured);
})();
```

## Output schema

The LLM is instructed to return JSON aligned with `schema.js` (invoice / bill / purchase order fields: totals, line items, parties, dates, `confidence_score`, etc.). Missing values should be `null`, not invented.

See `schema.js` and the system prompt in `deepseekProcessor.js` for the canonical field list and rules.

## Troubleshooting

- **`DEEPSEEK_API_KEY not configured`** — create `.env` in the app folder you are running, not only at repo root (unless you load dotenv from there).
- **API errors** — check quota, key validity, and DeepSeek service status; errors are logged and `processSafe` may return an empty schema with an `error` field instead of throwing.
