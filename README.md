# 📚 PDF Question Answering Chatbot

A RAG (Retrieval-Augmented Generation) chatbot that allows users to upload a PDF and ask questions about its content using AI.

## Features
-  Upload PDF files and extract text
-  Ask questions in natural language
-  AI-powered answers using Groq API (Llama 3.1)
-  Clean and responsive chat interface
-  RAG implementation for relevant context retrieval

## Technologies Used
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **PDF Processing:** pdf-parse
- **AI API:** Groq (Llama 3.1 8B) - Free tier
- **RAG:** Keyword-based context retrieval

## Prerequisites
- Node.js (v14 or higher)
- Groq API key (free from console.groq.com)

## Installation

### 1. Clone the repository

git clone https://github.com/Alainask/pdf-chatbot.git
cd pdf-chatbot

### 2. Install backend dependencies
  cd backend
  npm install

### 3. Set up environment variables
 Create a .env file in the backend folder:
  GROQ_API_KEY=your_groq_api_key_here

### 4. Start the backend server
  node server.js

### 5. Open the frontend
 Open frontend/index.html in your browser (double-click the file from the main pdf-chatbot folder)
   
