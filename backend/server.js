const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Store PDF data
let currentPdfText = '';
let currentPdfName = '';

// Initialize Groq if API key exists
let groq = null;
if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('✅ Groq API initialized');
}

// Upload endpoint
app.post('/upload', async (req, res) => {
    console.log('📤 Upload request received');
    
    upload.single('pdf')(req, res, async (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(500).json({ error: 'Upload failed: ' + err.message });
        }
        
        try {
            if (!req.file) {
                console.log('❌ No file in request');
                return res.status(400).json({ error: 'No file uploaded' });
            }
            
            console.log('📄 File received:', req.file.originalname);
            console.log('📏 File size:', req.file.size, 'bytes');
            
            // Read and parse PDF
            const dataBuffer = fs.readFileSync(req.file.path);
            const pdfData = await pdfParse(dataBuffer);
            currentPdfText = pdfData.text;
            currentPdfName = req.file.originalname;
            
            // Clean up - delete uploaded file
            fs.unlinkSync(req.file.path);
            
            console.log('✅ PDF processed successfully!');
            console.log('📝 Text length:', currentPdfText.length, 'characters');
            console.log('📖 First 100 chars:', currentPdfText.substring(0, 100));
            
            res.json({
                success: true,
                message: 'PDF uploaded successfully!',
                pages: pdfData.numpages,
                textLength: currentPdfText.length,
                fileName: currentPdfName
            });
            
        } catch (error) {
            console.error('Error processing PDF:', error);
            res.status(500).json({ error: 'Failed to process PDF: ' + error.message });
        }
    });
});

// Helper function to find relevant context
function findRelevantContext(question, text) {
    if (!text || text.length === 0) {
        return "No text content found in PDF.";
    }
    
    const questionLower = question.toLowerCase();
    const words = questionLower.split(/\s+/).filter(w => w.length > 3);
    
    if (words.length === 0) {
        return text.substring(0, 500);
    }
    
    const sentences = text.split(/[.!?]+/);
    const scored = sentences.map(sentence => {
        const sentenceLower = sentence.toLowerCase();
        let score = 0;
        words.forEach(word => {
            if (sentenceLower.includes(word)) score++;
        });
        return { sentence: sentence.trim(), score };
    });
    
    const top = scored.sort((a, b) => b.score - a.score).slice(0, 3);
    const relevant = top.filter(s => s.score > 0).map(s => s.sentence);
    
    if (relevant.length === 0) {
        return text.substring(0, 500);
    }
    
    return relevant.join('. ');
}

// Ask endpoint
app.post('/ask', async (req, res) => {
    const { question } = req.body;
    
    console.log('📝 Question received:', question);
    
    if (!currentPdfText || currentPdfText.length === 0) {
        return res.json({ 
            answer: '❌ Please upload a PDF first. Use the "Choose PDF File" button above.' 
        });
    }
    
    // Handle PDF name question
    if (question.toLowerCase().includes('pdf name') || question.toLowerCase().includes('file name')) {
        return res.json({ answer: `📄 **PDF Name:** ${currentPdfName}` });
    }
    
    const context = findRelevantContext(question, currentPdfText);
    console.log('📚 Context length:', context.length);
    
    // If Groq is not configured, return the context directly
    if (!groq) {
        return res.json({ 
            answer: `📚 **Here's what I found in "${currentPdfName}":**\n\n${context}\n\n💡 To enable AI answers, add GROQ_API_KEY to .env file.`
        });
    }
    
    try {
        const prompt = `Answer the question based ONLY on this context from a PDF. If the answer is not in the context, say "I cannot find this information in the PDF."

Context: ${context}

Question: ${question}

Answer:`;
        
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 500
        });
        
        const answer = completion.choices[0]?.message?.content;
        console.log('✅ AI answer generated');
        res.json({ answer: answer });
        
    } catch (error) {
        console.error('Groq error:', error.message);
        res.json({ 
            answer: `📚 **From your PDF (AI temporarily unavailable):**\n\n${context}`
        });
    }
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        pdfLoaded: currentPdfText.length > 0,
        textLength: currentPdfText.length,
        fileName: currentPdfName || 'None'
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is running!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`✅ Server is running!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🧪 Test: http://localhost:${PORT}/test`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    console.log(`========================================\n`);
});