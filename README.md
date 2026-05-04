# OCR System - Tesseract.js Enhanced

Sistem OCR berbasis Tesseract.js yang dapat membaca teks dari gambar, PDF, dan dokumen Word dalam 100+ bahasa.

## Fitur Utama

- **OCR dari Gambar** - PNG, JPG, BMP, GIF, TIFF, dan format lainnya
- **OCR dari PDF** - Ekstrak teks dari PDF (scan & native)
- **OCR dari Word** - Ekstrak teks dari dokumen .docx
- **100+ Bahasa** - Indonesia, Inggris, Mandarin, Jepang, Korea, Arab, dll
- **Auto-Detect Format** - Deteksi otomatis format file
- **Batch Processing** - Proses banyak file sekaligus

---

## Dua Sistem OCRDS (Satu Repo)

Repo ini berisi **dua sistem** OCR Data Structuring (OCR + DeepSeek):

| Sistem        | Folder       | Port | Kegunaan    |
|---------------|--------------|------|-------------|
| **Inventory** | `ocrds/`     | 3000 | Sistem asli |
| **OCRDS_AMS** | `ocrds-ams/` | 3001 | Duplikat untuk modifikasi |

Jalankan dari **root**:

```bash
npm run start:inventory   # http://localhost:3000
npm run start:ams        # http://localhost:3001
```

Masing-masing punya `package.json` dan dependency sendiri. Untuk OCRDS_AMS, install dulu: `cd ocrds-ams && npm install`. Setelah itu bisa diubah-ubah (schema, prompt, UI) di folder `ocrds-ams/` tanpa mengganggu inventory.

---

## Quick Start

### Instalasi

```bash
npm install

# Untuk Windows, jika error:
npm install --global windows-build-tools
npm install
```

### Cara Menggunakan

```bash
# OCR dari gambar
node examples/node/recognize.js image.png

# OCR dari PDF
node examples/node/recognize-pdf.js document.pdf ind

# OCR dari Word
node examples/node/recognize-word.js document.docx ind

# Auto-detect format (REKOMENDASI)
node examples/node/recognize-advanced.js file.pdf ind
```

---

## Contoh Kode

### OCR dari Gambar

```javascript
const { createWorker } = require('tesseract.js');

(async () => {
  const worker = await createWorker('ind'); // Bahasa Indonesia
  const { data: { text } } = await worker.recognize('image.png');
  console.log(text);
  await worker.terminate();
})();
```

### OCR dari PDF

```javascript
const { createWorker, pdfProcessor } = require('tesseract.js');

(async () => {
  // Ekstrak gambar dari PDF
  const { images } = await pdfProcessor.convertPDFToImages('document.pdf', {
    scale: 2.0 // Kualitas tinggi
  });
  
  // OCR setiap halaman
  const worker = await createWorker('ind');
  for (const img of images) {
    const { data: { text } } = await worker.recognize(img.data);
    console.log(`Halaman ${img.page}:`, text);
  }
  await worker.terminate();
})();
```

### OCR dari Word

```javascript
const { createWorker, wordProcessor } = require('tesseract.js');

(async () => {
  // Ekstrak teks dan gambar
  const { extractedText, images } = await wordProcessor.processWordForOCR('document.docx');
  
  console.log('Teks:', extractedText);
  
  // OCR gambar di dokumen
  const worker = await createWorker('ind');
  for (const img of images) {
    const { data: { text } } = await worker.recognize(img.data);
    console.log('Gambar:', text);
  }
  await worker.terminate();
})();
```

---

## Bahasa yang Didukung

| Kode | Bahasa | Kode | Bahasa |
|------|--------|------|--------|
| `ind` | Indonesia | `eng` | Inggris |
| `jpn` | Jepang | `kor` | Korea |
| `chi_sim` | Mandarin Sederhana | `chi_tra` | Mandarin Tradisional |
| `ara` | Arab | `tha` | Thailand |
| `vie` | Vietnam | `spa` | Spanyol |
| `fra` | Perancis | `deu` | Jerman |

**Multiple Bahasa:**
```javascript
const worker = await createWorker('eng+ind'); // Inggris + Indonesia
```

Lihat [docs/tesseract_lang_list.md](docs/tesseract_lang_list.md) untuk daftar lengkap.

---

## Format File yang Didukung

| Format | Extension | Status |
|--------|-----------|--------|
| Gambar | .png, .jpg, .jpeg, .bmp, .gif, .tiff | Didukung |
| PDF | .pdf | Didukung |
| Word | .docx | Didukung |
| Word Lama | .doc | Convert ke .docx dulu |

---

## Tips Meningkatkan Akurasi

### 1. Kualitas Gambar
- Gunakan resolusi minimum 300 DPI
- Pastikan teks jelas dan tidak blur
- Kontras baik antara teks dan background

### 2. Page Segmentation Mode (PSM)

```javascript
const { PSM, createWorker } = require('tesseract.js');

const worker = await createWorker('eng');

// PSM.SINGLE_BLOCK - Untuk satu blok teks
// PSM.SINGLE_LINE - Untuk satu baris
// PSM.SINGLE_WORD - Untuk satu kata
// PSM.AUTO - Otomatis (default)

await worker.setParameters({
  tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
});

const { data: { text } } = await worker.recognize(image);
```

### 3. Batch Processing dengan Scheduler

```javascript
const { createScheduler, createWorker } = require('tesseract.js');

const scheduler = createScheduler();

// Buat 4 worker parallel
for (let i = 0; i < 4; i++) {
  const worker = await createWorker('eng');
  scheduler.addWorker(worker);
}

// Proses multiple images
const results = await Promise.all(
  images.map(img => scheduler.addJob('recognize', img))
);

await scheduler.terminate();
```

### 4. Confidence Score

```javascript
const worker = await createWorker('eng');
const { data } = await worker.recognize('image.png');

console.log('Confidence:', data.confidence, '%');

// Per-word confidence
data.words.forEach(word => {
  console.log(`${word.text} (${word.confidence.toFixed(2)}%)`);
});
```

---

## Troubleshooting

### Error saat npm install

**Windows:**
```bash
npm install --global windows-build-tools
npm install
```

**Canvas error:**
```bash
npm rebuild canvas --build-from-source
```

**Alternatif (prebuilt binary):**
```bash
npm install canvas --canvas_binary_host_mirror=https://npm.taobao.org/mirrors/canvas-prebuilt/
```

### PDF Tidak Bisa Dibaca

- Pastikan PDF tidak terenkripsi/password protected
- Gunakan PDF yang tidak corrupt
- Untuk PDF besar, proses per halaman:

```javascript
const images = await convertPDFToImages(pdfPath, {
  scale: 1.5, // Kurangi scale untuk hemat memory
  pageNumbers: [1, 2, 3], // Proses halaman tertentu
});
```

### Word .doc Tidak Bisa Dibaca

Convert ke .docx menggunakan Microsoft Word atau LibreOffice

### Memory Error pada File Besar

Proses per halaman atau kurangi scale/resolusi:

```javascript
const { images } = await processPDFForOCR(pdfFile, {
  scale: 1.5, // Default: 2.0
  pageNumbers: [1, 2, 3] // Proses halaman spesifik
});
```

### Training Data Download Gagal

Download manual dari GitHub:
1. https://github.com/naptha/tessdata
2. Download file `.traineddata` bahasa yang diinginkan
3. Simpan di: `node_modules/tesseract.js/tessdata/`

---

## Persyaratan Sistem

- Node.js versi 14+
- npm package manager
- Build tools:
  - **Windows**: Windows Build Tools atau Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: gcc, g++, make

---

## Struktur Project

```
OCR-system/
├── ocrds/                  # Sistem Inventory (port 3000)
│   ├── index.js            # Server entry
│   ├── ocr.js, deepseekProcessor.js, schema.js
│   ├── index.html, script.js, style.css
│   └── package.json
├── ocrds-ams/               # OCRDS_AMS (port 3001) — duplikat untuk modifikasi
│   └── (struktur sama seperti ocrds/)
├── src/
│   ├── utils/
│   │   ├── pdfProcessor.js      # Utility PDF
│   │   ├── wordProcessor.js     # Utility Word
│   │   └── ...
│   └── index.js
├── examples/
│   └── node/
│       ├── recognize.js          # OCR gambar
│       ├── recognize-pdf.js      # OCR PDF
│       ├── recognize-word.js     # OCR Word
│       └── recognize-advanced.js # Auto-detect
└── docs/                         # Dokumentasi teknis
```

---

## Contoh Lengkap - Batch Processing

```javascript
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const { processPDFForOCR } = require('./src/utils/pdfProcessor');
const { processWordForOCR } = require('./src/utils/wordProcessor');

async function processFiles(folderPath) {
  const files = fs.readdirSync(folderPath);
  const worker = await createWorker('eng+ind');
  
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const ext = path.extname(file).toLowerCase();
    
    console.log(`Processing: ${file}`);
    
    try {
      if (ext === '.pdf') {
        const { images } = await processPDFForOCR(filePath);
        for (const img of images) {
          const { data: { text } } = await worker.recognize(img.data);
          console.log(text);
        }
      } else if (ext === '.docx') {
        const { extractedText, images } = await processWordForOCR(filePath);
        console.log(extractedText);
        for (const img of images) {
          const { data: { text } } = await worker.recognize(img.data);
          console.log(text);
        }
      } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        const { data: { text } } = await worker.recognize(filePath);
        console.log(text);
      }
    } catch (error) {
      console.error(`Error: ${file}`, error.message);
    }
  }
  
  await worker.terminate();
}

processFiles('./documents');
```

---

## Teknologi yang Digunakan

- [Tesseract.js](https://github.com/naptha/tesseract.js) - OCR Engine
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF text extraction
- [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) - PDF to image conversion
- [mammoth](https://www.npmjs.com/package/mammoth) - Word document processing
- [canvas](https://www.npmjs.com/package/canvas) - Image processing

---

## Use Cases

- Digitalisasi dokumen fisik (scan)
- Ekstrak teks dari PDF scan
- Membaca teks dari screenshot
- Konversi dokumen Word ke plain text
- Data entry otomatis
- Arsip digital dokumen

---

## Dokumentasi Tambahan

- API Documentation: [docs/api.md](docs/api.md)
- FAQ: [docs/faq.md](docs/faq.md)
- Examples: [examples/](examples/)
- Workers vs. Schedulers: [docs/workers_vs_schedulers.md](docs/workers_vs_schedulers.md)

---

## License

Apache License 2.0 - Lihat [LICENSE.md](LICENSE.md)

---

## Contributing

```bash
# Clone repository
git clone https://github.com/sulthandhafirr/OCR-system.git
cd OCR-system

# Install dependencies
npm install

# Start development server
npm start

# Build
npm run build

# Run tests
npm run lint
npm run test
```
