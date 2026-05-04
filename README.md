# OCR system (OCRDS)

This repository contains two **OCR Data Structuring** web apps: they run OCR on uploads (images, PDF, Word), then call the **DeepSeek** API to produce validated structured JSON (invoices, bills, purchase orders).

| Application | Folder       | Default port | Role |
|-------------|--------------|--------------|------|
| **OCRDS** (inventory) | `ocrds/`     | 3000 | Original app |
| **OCRDS-AMS**        | `ocrds-ams/` | 3001 | Separate copy for experiments (schema, prompts, UI) without touching inventory |

Each app has its own `package.json` and dependencies (`tesseract.js`, `pdf-parse`, `mammoth`, etc.).

## Prerequisites

- Node.js 14 or newer  
- A [DeepSeek](https://platform.deepseek.com) API key  

## Setup

From the repository root:

```bash
npm run install:apps
```

Or install each app once:

```bash
cd ocrds; npm install; cd ..
cd ocrds-ams; npm install; cd ..
```

Configure environment variables (see `.env.example` in each app folder). Examples:

```bash
# macOS / Linux
cp ocrds/.env.example ocrds/.env
cp ocrds-ams/.env.example ocrds-ams/.env
```

```powershell
# Windows (PowerShell)
copy ocrds\.env.example ocrds\.env
copy ocrds-ams\.env.example ocrds-ams\.env
```

Edit the `.env` files and set `DEEPSEEK_API_KEY`. Use `PORT=3000` for `ocrds` and `PORT=3001` for `ocrds-ams` if you run both locally.

## Run

From the repository root:

```bash
npm run start:ocrds      # http://localhost:3000
npm run start:ocrds-ams  # http://localhost:3001
```

Aliases:

```bash
npm run start:ims   # same as start:ocrds
npm run start:ams   # same as start:ocrds-ams
```

Or run from an app directory:

```bash
cd ocrds; npm start
# or
cd ocrds-ams; npm start
```

## Project layout

```
ocrds/           # Inventory app — port 3000
ocrds-ams/       # AMS variant — port 3001
docs/            # Integration notes (DeepSeek pipeline)
```

Core files in each app: `index.js` (HTTP server), `ocr.js`, `deepseekProcessor.js`, `schema.js`, `index.html`, `script.js`, `style.css`.

## Documentation

- [docs/deepseek-integration.md](docs/deepseek-integration.md) — DeepSeek post-OCR pipeline and behaviour  
- Per-app: `ocrds/README.md`, `ocrds/QUICKSTART.md`, `ocrds-ams/README.md`, `ocrds-ams/QUICKSTART.md`  

## License

The repository default is [MIT](LICENSE). Each app also declares `MIT` in its `package.json`. Dependencies under `node_modules/` keep their own licenses.
