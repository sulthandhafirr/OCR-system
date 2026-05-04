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
# cp .env.example .env   (macOS/Linux)
copy .env.example .env
# Edit .env: DEEPSEEK_API_KEY=... and PORT=3001
npm start
```

Open: `http://localhost:3001`

Endpoints match `ocrds`: `GET /`, `GET /health`, `POST /process`, `POST /extract`.
