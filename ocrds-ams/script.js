// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const previewCard = document.getElementById('previewCard');
const previewContent = document.getElementById('previewContent');
const clearBtn = document.getElementById('clearBtn');
const processBtn = document.getElementById('processBtn');
const loadingCard = document.getElementById('loadingCard');
const statusMessage = document.getElementById('statusMessage');
const resultsGrid = document.getElementById('resultsGrid');
const ocrText = document.getElementById('ocrText');
const jsonOutput = document.getElementById('jsonOutput');
const charCount = document.getElementById('charCount');
const docType = document.getElementById('docType');
const confidence = document.getElementById('confidence');

let selectedFile = null;

// Initialize
function init() {
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileInput);
    
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    
    clearBtn.addEventListener('click', handleClear);
    processBtn.addEventListener('click', handleProcess);
}

// File Input Handler
function handleFileInput(e) {
    const file = e.target.files[0];
    if (file) {
        handleFileSelect(file);
    }
}

// Drag & Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
}

function handleDragLeave() {
    uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        handleFileSelect(file);
    }
}

// File Selection Logic
function handleFileSelect(file) {
    selectedFile = file;
    showPreview(file);
    hideResults();
    clearStatus();
}

// Show File Preview
function showPreview(file) {
    const fileType = detectFileType(file);
    
    previewContent.innerHTML = '';
    
    if (fileType === 'image') {
        showImagePreview(file);
    } else if (fileType === 'pdf') {
        showPDFPreview(file);
    } else if (fileType === 'word') {
        showWordPreview(file);
    } else {
        showFileInfo(file, fileType);
    }
    
    previewCard.classList.remove('hidden');
    processBtn.disabled = false;
}

// Image Preview
function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = file.name;
        
        preview.appendChild(img);
        previewContent.appendChild(preview);
    };
    reader.readAsDataURL(file);
}

// PDF Preview
function showPDFPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.createElement('div');
        preview.className = 'pdf-preview';
        
        const blob = new Blob([e.target.result], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.className = 'pdf-iframe';
        
        preview.appendChild(iframe);
        
        // Add file info below preview
        const info = document.createElement('div');
        info.className = 'preview-info';
        info.innerHTML = `
            <strong>${file.name}</strong>
            <span>${formatFileSize(file.size)}</span>
        `;
        preview.appendChild(info);
        
        previewContent.appendChild(preview);
    };
    reader.readAsArrayBuffer(file);
}

// Word Preview
function showWordPreview(file) {
    const preview = document.createElement('div');
    preview.className = 'document-preview';
    
    // Create large icon with file info
    const icon = createFileIcon('word');
    icon.style.width = '80px';
    icon.style.height = '80px';
    
    const info = document.createElement('div');
    info.className = 'document-info';
    info.innerHTML = `
        <h3>${file.name}</h3>
        <p>Microsoft Word Document</p>
        <p class="file-size">${formatFileSize(file.size)}</p>
        <p class="preview-note">Preview will be generated after OCR processing</p>
    `;
    
    preview.appendChild(icon);
    preview.appendChild(info);
    previewContent.appendChild(preview);
}

// File Info Preview (PDF/Word)
function showFileInfo(file, fileType) {
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    
    // File Icon SVG
    const icon = createFileIcon(fileType);
    fileInfo.appendChild(icon);
    
    // File Details
    const details = document.createElement('div');
    details.className = 'file-details';
    
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name;
    
    const fileMeta = document.createElement('div');
    fileMeta.className = 'file-meta';
    fileMeta.textContent = `${fileType.toUpperCase()} • ${formatFileSize(file.size)}`;
    
    details.appendChild(fileName);
    details.appendChild(fileMeta);
    
    fileInfo.appendChild(details);
    previewContent.appendChild(fileInfo);
}

// Create File Icon SVG
function createFileIcon(fileType) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'file-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    
    if (fileType === 'pdf') {
        // PDF icon
        svg.innerHTML = `
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            <path d="M14 2v6h6"/>
            <path d="M10 12h4M10 16h4"/>
        `;
    } else if (fileType === 'word') {
        // Word icon
        svg.innerHTML = `
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            <path d="M14 2v6h6"/>
            <path d="M9 13l1 3 1-3 1 3 1-3"/>
        `;
    } else {
        // Generic file icon
        svg.innerHTML = `
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            <path d="M14 2v6h6"/>
        `;
    }
    
    return svg;
}

// Detect File Type
function detectFileType(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'].includes(ext)) {
        return 'image';
    } else if (ext === 'pdf') {
        return 'pdf';
    } else if (['doc', 'docx'].includes(ext)) {
        return 'word';
    }
    
    return 'file';
}

// Clear Selection
function handleClear() {
    selectedFile = null;
    fileInput.value = '';
    previewCard.classList.add('hidden');
    processBtn.disabled = true;
    hideResults();
    clearStatus();
}

// Process Document
async function handleProcess() {
    if (!selectedFile) return;
    
    // Show loading
    loadingCard.classList.remove('hidden');
    hideResults();
    clearStatus();
    
    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await fetch('/process', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        loadingCard.classList.add('hidden');
        
        if (result.success) {
            displayResults(result);
            showStatus('Processing completed successfully', 'success');
        } else {
            showStatus(result.error || 'Processing failed', 'error');
        }
    } catch (error) {
        loadingCard.classList.add('hidden');
        showStatus(`Error: ${error.message}`, 'error');
    }
}

// Display Results
function displayResults(result) {
    // OCR Text
    ocrText.textContent = result.ocr_text || 'No text extracted';
    charCount.textContent = `${(result.ocr_text || '').length} chars`;
    
    // Structured Data
    const data = result.structured_data || {};
    jsonOutput.innerHTML = syntaxHighlight(JSON.stringify(data, null, 2));
    
    // Badges
    docType.textContent = `Type: ${data.document_type || 'Unknown'}`;
    const conf = Math.round((data.confidence_score || 0) * 100);
    confidence.textContent = `Confidence: ${conf}%`;
    
    // Show results
    resultsGrid.classList.remove('hidden');
}

// JSON Syntax Highlighting
function syntaxHighlight(json) {
    json = json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'json-key' : 'json-string';
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

// Show Status Message
function showStatus(message, type) {
    const className = type === 'success' ? 'message-success' : 'message-error';
    statusMessage.innerHTML = `<div class="message ${className}">${message}</div>`;
}

// Clear Status
function clearStatus() {
    statusMessage.innerHTML = '';
}

// Hide Results
function hideResults() {
    resultsGrid.classList.add('hidden');
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Initialize on load
init();
