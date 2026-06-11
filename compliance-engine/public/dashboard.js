// ==========================================================================
// THAI CUSTOMS COMPLIANCE DASHBOARD CLIENT SCRIPT
// Handles: File Uploads, Form Submissions, Loader Statuses, and Markdown Rendering
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Form and input elements
    const auditForm = document.getElementById('audit-form');
    const fileInput = document.getElementById('fileAttachment');
    const dropzone = document.getElementById('upload-dropzone');
    const filePreview = document.getElementById('file-preview');
    const previewFilename = document.getElementById('preview-filename');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const submitBtn = document.getElementById('submit-btn');

    // Output panel elements
    const placeholder = document.getElementById('results-placeholder');
    const loader = document.getElementById('results-loader');
    const loaderStatus = document.getElementById('loader-status');
    const resultsContent = document.getElementById('results-content');
    const printBtn = document.getElementById('print-btn');

    // Currently staged file
    let stagedFile = null;

    // --- 1. File Upload & Drag-and-Drop Management ---

    // Open file selector when clicking the dropzone
    dropzone.addEventListener('click', (e) => {
        // Prevent click trigger if they clicked the remove file button
        if (e.target !== removeFileBtn && !filePreview.contains(e.target)) {
            fileInput.click();
        }
    });

    // File selected via dialog
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileSelection(fileInput.files[0]);
        }
    });

    // Drag-and-drop hover effects
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'dragend', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    // File dropped in dropzone
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
            
            // Sync with input element
            fileInput.files = files;
        }
    });

    // Handle file validation and preview
    function handleFileSelection(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
        
        if (!validExtensions.includes(ext)) {
            alert("❌ Unsupported file format. Please upload JPG, PNG, or PDF files only.");
            resetFileUploader();
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            alert("❌ File is too large. Maximum supported file size is 10MB.");
            resetFileUploader();
            return;
        }

        stagedFile = file;
        previewFilename.textContent = file.name;
        
        // Toggle view states inside dropzone
        dropzone.querySelector('.upload-icon').classList.add('hidden');
        dropzone.querySelector('.dropzone-text').classList.add('hidden');
        dropzone.querySelector('.dropzone-sub').classList.add('hidden');
        filePreview.classList.remove('hidden');
    }

    // Reset uploader state
    function resetFileUploader() {
        stagedFile = null;
        fileInput.value = "";
        
        dropzone.querySelector('.upload-icon').classList.remove('hidden');
        dropzone.querySelector('.dropzone-text').classList.remove('hidden');
        dropzone.querySelector('.dropzone-sub').classList.remove('hidden');
        filePreview.classList.add('hidden');
    }

    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileUploader();
    });


    // --- 2. Audit Form Submission & API Request ---

    auditForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get inputs
        const description = document.getElementById('commodityDescription').value.trim();
        const webLink = document.getElementById('webLink').value.trim();

        // Validate that there is at least one description input source
        if (!description && !stagedFile && !webLink) {
            alert("⚠️ Please enter a product description, upload a file/photo, or paste a product link to run the audit.");
            return;
        }

        // Setup form data
        const formData = new FormData();
        formData.append('commodityDescription', description);
        formData.append('originCountry', document.getElementById('originCountry').value);
        formData.append('tradeDirection', document.getElementById('tradeDirection').value);
        formData.append('webLink', webLink);
        
        // Get selected AI Provider
        const aiProvider = document.getElementById('aiProvider').value;
        formData.append('aiProvider', aiProvider);
        
        // Get selected language
        const language = document.querySelector('input[name="language"]:checked').value;
        formData.append('language', language);

        if (stagedFile) {
            formData.append('fileAttachment', stagedFile);
        }

        // Show loading screen and hide previous outputs
        placeholder.classList.add('hidden');
        resultsContent.classList.add('hidden');
        printBtn.classList.add('hidden');
        loader.classList.remove('hidden');
        submitBtn.setAttribute('disabled', 'true');

        // Map provider value to user-friendly name
        const providerNameMap = {
            'gemini': 'Google Gemini',
            'openai': 'OpenAI ChatGPT',
            'claude': 'Anthropic Claude',
            'minimax': 'MiniMax AI'
        };
        const providerName = providerNameMap[aiProvider] || 'AI Engine';

        // Update loader subtitle
        const loaderSub = document.getElementById('loader-sub');
        if (loaderSub) {
            loaderSub.textContent = `${providerName} is parsing cross-agency laws and analyzing attachments.`;
        }

        // Dynamic status changer during API call (gives a premium "processing" feel)
        const statusesEn = [
            "Analyzing product parameters...",
            "Checking local cross-agency RAG database...",
            "Consulting regulatory statutes...",
            `Invoking ${providerName}...`,
            "Drafting trade compliance audit report..."
        ];

        const statusesTh = [
            "กำลังประเมินคุณลักษณะของสินค้า...",
            "กำลังสืบค้นข้อกฎหมายหน่วยงานร่วม (RAG)...",
            "กำลังตรวจสอบข้อกำหนดเชิงนโยบาย...",
            `กำลังประมวลผลข้อมูลผ่านระบบปัญญาประดิษฐ์ (${providerName})...`,
            "กำลังร่างรายงานผลการตรวจสอบพิกัดและกฎหมายศุลกากร..."
        ];

        const statuses = language === 'th' ? statusesTh : statusesEn;
        let statusIndex = 0;
        loaderStatus.textContent = statuses[0];

        const statusInterval = setInterval(() => {
            if (statusIndex < statuses.length - 1) {
                statusIndex++;
                loaderStatus.textContent = statuses[statusIndex];
            }
        }, 1800);

        try {
            const response = await fetch('/api/audit', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            clearInterval(statusInterval);

            if (data.success) {
                // Render markdown using Marked.js library
                resultsContent.innerHTML = marked.parse(data.report);
                
                // Hide loader and show report
                loader.classList.add('hidden');
                resultsContent.classList.remove('hidden');
                printBtn.classList.remove('hidden');
            } else {
                showError(data.error || "An error occurred while compiling the report.");
            }

        } catch (err) {
            clearInterval(statusInterval);
            showError("Network connection error. Please verify the backend server is running.");
        } finally {
            submitBtn.removeAttribute('disabled');
        }
    });

    // Display error card in report panel
    function showError(message) {
        loader.classList.add('hidden');
        resultsContent.innerHTML = `
            <div style="background: rgba(255, 77, 77, 0.08); border-left: 4px solid #FF4D4D; padding: 20px; border-radius: 4px; margin-top: 20px;">
                <h3 style="color: #FF4D4D; margin-top: 0; margin-bottom: 10px;">❌ Audit Failed</h3>
                <p style="color: var(--text-secondary); margin-bottom: 0;">${message}</p>
            </div>
        `;
        resultsContent.classList.remove('hidden');
    }

    // --- 3. Print Integration ---
    printBtn.addEventListener('click', () => {
        window.print();
    });
});
