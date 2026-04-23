# OCRDS_AMS - Quick Start

Default port: **3001**.

## From repo root
```bash
npm run start:ams
```

## From this folder
```bash
cd ocrds-ams
npm install
# Copy .env from ocrds/ or create with DEEPSEEK_API_KEY=
npm start
```

Open: `http://localhost:3001`

Endpoints: same as ocrds (GET /, /health, POST /process, /process-text, /extract).
