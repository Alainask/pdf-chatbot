const API_URL = 'http://localhost:5000';

let isPdfUploaded = false;
let currentPdfName = '';

const pdfInput = document.getElementById('pdfInput');
const uploadBtn = document.getElementById('uploadBtn');
const questionInput = document.getElementById('questionInput');
const askBtn = document.getElementById('askBtn');
const chatMessages = document.getElementById('chatMessages');
const uploadStatus = document.getElementById('uploadStatus');

// Check if backend is running on page load
async function checkBackend() {
    try {
        const response = await fetch(`${API_URL}/test`);
        if (response.ok) {
            addMessage('bot', '✅ Backend connected! Ready to upload PDFs.');
            
            // Check if there's already a PDF loaded
            const statusRes = await fetch(`${API_URL}/status`);
            const status = await statusRes.json();
            if (status.pdfLoaded) {
                isPdfUploaded = true;
                currentPdfName = status.fileName;
                questionInput.disabled = false;
                askBtn.disabled = false;
                addMessage('bot', `✅ Welcome back! PDF "${status.fileName}" is already loaded (${status.textLength} characters). Ask me anything!`);
            }
        }
    } catch (error) {
        console.log('Backend not running');
        addMessage('bot', '⚠️ Backend not connected. Please run "node server.js" in the backend folder.');
    }
}

// Upload PDF
uploadBtn.addEventListener('click', async () => {
    const file = pdfInput.files[0];
    
    if (!file) {
        showStatus('Please select a PDF file first!', 'error');
        return;
    }
    
    if (file.type !== 'application/pdf') {
        showStatus('Please upload a valid PDF file!', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('pdf', file);
    
    showStatus('📤 Uploading and processing PDF...', '');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    questionInput.disabled = true;
    askBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Upload response:', data);
        
        if (response.ok && data.success) {
            currentPdfName = file.name;
            showStatus(`✅ PDF uploaded! ${data.pages} pages, ${data.textLength} characters`, 'success');
            isPdfUploaded = true;
            questionInput.disabled = false;
            askBtn.disabled = false;
            
            let message = `✅ **PDF Upload Successful!**\n\n`;
            message += `📄 **File Name:** ${file.name}\n`;
            message += `📑 **Pages:** ${data.pages}\n`;
            message += `📝 **Text Extracted:** ${data.textLength} characters\n\n`;
            
            if (data.textLength < 100) {
                message += `⚠️ **Warning:** Very little text was extracted. This PDF might be a scanned image. For best results, use a PDF with selectable text (from Word/Google Docs).\n\n`;
            }
            
            message += `💡 **Try asking:**\n`;
            message += `• "What is this PDF about?"\n`;
            message += `• "What is the PDF name?"\n`;
            message += `• Any specific question about the content`;
            
            addMessage('bot', message);
            
            // Check status to confirm
            await checkStatus();
        } else {
            showStatus('Error: ' + (data.error || 'Upload failed'), 'error');
            addMessage('bot', '❌ Upload failed: ' + (data.error || 'Unknown error'));
            questionInput.disabled = true;
            askBtn.disabled = true;
        }
    } catch (error) {
        console.error('Upload error:', error);
        showStatus('Failed to upload. Make sure backend server is running on port 5000!', 'error');
        addMessage('bot', '❌ Cannot connect to server. Please make sure backend is running with "node server.js"');
        questionInput.disabled = true;
        askBtn.disabled = true;
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload PDF';
    }
});

// Ask question
askBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    
    if (!question) {
        alert('Please enter a question!');
        return;
    }
    
    if (!isPdfUploaded) {
        alert('Please upload a PDF first!');
        return;
    }
    
    addMessage('user', question);
    questionInput.value = '';
    
    const loadingId = addLoadingMessage();
    
    try {
        const response = await fetch(`${API_URL}/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });
        
        const data = await response.json();
        console.log('Answer response:', data);
        
        removeLoadingMessage(loadingId);
        
        if (response.ok) {
            addMessage('bot', data.answer);
        } else {
            addMessage('bot', '❌ Error: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        removeLoadingMessage(loadingId);
        console.error('Ask error:', error);
        addMessage('bot', '❌ Failed to get answer. Check if backend is running.');
    }
});

// Check status
async function checkStatus() {
    try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        console.log('Status:', data);
        return data;
    } catch (error) {
        console.error('Status check failed:', error);
        return null;
    }
}

// Allow Enter key
questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !askBtn.disabled && isPdfUploaded) {
        askBtn.click();
    }
});

function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    // Convert newlines to <br> for better formatting
    const formattedText = escapeHtml(text).replace(/\n/g, '<br>');
    messageDiv.innerHTML = `<div class="message-content">${formattedText}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLoadingMessage() {
    const id = 'loading-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = id;
    messageDiv.className = 'message bot';
    messageDiv.innerHTML = `<div class="message-content">🤔 Thinking... <span class="dots"></span></div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeLoadingMessage(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

function showStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = 'status-message';
    if (type) {
        uploadStatus.classList.add(type);
    }
    
    setTimeout(() => {
        if (uploadStatus.textContent === message) {
            uploadStatus.textContent = '';
            uploadStatus.className = 'status-message';
        }
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Check backend on page load
checkBackend();

// Also check status every 5 seconds (for automatic updates)
setInterval(async () => {
    if (!isPdfUploaded) {
        const status = await checkStatus();
        if (status && status.pdfLoaded && !isPdfUploaded) {
            // PDF was loaded from another session
            isPdfUploaded = true;
            currentPdfName = status.fileName;
            questionInput.disabled = false;
            askBtn.disabled = false;
            addMessage('bot', `✅ PDF "${status.fileName}" is loaded! Ask me anything about it.`);
        }
    }
}, 5000);