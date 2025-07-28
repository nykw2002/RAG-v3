# AI File Query System (RAG-v3)

<div align="center">

![Python](https://img.shields.io/badge/python-v3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude%20AI-000000?logo=anthropic)

*An intelligent system that uses Claude AI to analyze and query documents through dynamically generated Python scripts*

[Demo](#demo) • [Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation)

</div>

## 🎯 Overview

The AI File Query System is a powerful RAG (Retrieval-Augmented Generation) application that combines the intelligence of Claude AI with dynamic Python script generation to analyze and extract information from your documents. Simply ask questions in natural language, and watch as the system writes, executes, and refines Python code to find the answers.

### ✨ What makes this special?

- **🧠 Smart Script Generation**: Claude AI writes Python scripts tailored to your specific queries
- **🔄 Iterative Refinement**: Automatically improves its approach up to 10 times for better results
- **💬 Natural Language Interface**: Ask questions like you would to a human analyst
- **🌐 Modern Web UI**: Beautiful Next.js frontend with real-time updates
- **📊 Session Management**: Track, save, and review all your queries and results

## 🚀 Features

### Core Capabilities
- **Multi-format Support**: PDF, XML, and TXT files
- **Intelligent Analysis**: Context-aware document processing
- **Dynamic Code Generation**: Custom Python scripts for each query
- **Real-time Processing**: WebSocket-powered live updates
- **Session Persistence**: Save and revisit previous analyses

### Interface Options
- **🖥️ Web Interface**: Modern React/Next.js frontend
- **💻 CLI Interface**: Interactive command-line tool
- **🔌 API**: RESTful API for integration

### Advanced Features
- **📈 Progress Tracking**: Monitor analysis iterations in real-time
- **📝 Excel Export**: Export session data for evaluation
- **🔄 PDF Conversion**: Convert PDFs to TXT/XML formats
- **🎛️ Configurable Prompts**: Customize AI behavior
- **📊 Analytics Dashboard**: Review system performance

## 🎬 Demo

### Web Interface
```
🌐 Modern chat interface with real-time processing
📊 Session management and history
📁 File upload and management
⚙️ System configuration
```

### CLI Interface
```bash
$ python interactive.py

AI FILE QUERY SYSTEM - Interactive Mode
================================================
Ask questions about your documents and I'll analyze them!

💬 Enter your query: "What are the main topics discussed in the research papers?"

🔄 Processing query (Session: 20250128_143052_001)...
✅ Script executed successfully
📋 Final Result: Based on analysis of 3 research papers...
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+ (for web interface)
- Claude AI API Key

### 1. Clone the Repository
```bash
git clone https://github.com/nykw2002/RAG-v3.git
cd RAG-v3
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements_backend.txt

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Frontend Setup (Optional)
```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Add Your Files
```bash
# Place your documents in the files_to_query directory
cp your_documents.pdf files_to_query/
```

### 5. Start the Application

#### Option A: Web Interface (Recommended)
```bash
python backend_main.py
```
Then open http://localhost:8000 in your browser

#### Option B: Command Line Interface
```bash
python interactive.py
```

#### Option C: Single Query
```bash
python main.py "What are the key findings in the documents?"
```

## 📖 Documentation

### File Structure
```
RAG-v3/
├── 🗂️ Backend (Python/FastAPI)
│   ├── backend_main.py          # Main FastAPI server
│   ├── interactive.py           # CLI interface
│   ├── pdf_converter.py         # PDF processing
│   └── excel_integration.py     # Excel export
├── 🌐 Frontend (Next.js/React)
│   ├── app/                     # Next.js app router
│   ├── components/              # React components
│   └── lib/                     # Utilities
├── 📁 Data Directories
│   ├── files_to_query/          # Your documents
│   ├── query_sessions/          # Saved sessions
│   └── temp_scripts/            # Generated Python scripts
└── ⚙️ Configuration
    ├── .env                     # Environment variables
    ├── system_prompt.txt        # AI system prompt
    └── requirements*.txt        # Dependencies
```

### How It Works

1. **Query Processing**: Claude AI analyzes your natural language question
2. **Script Generation**: AI writes custom Python code to extract needed information
3. **Execution**: Scripts run automatically against your documents
4. **Iteration**: System refines its approach up to 10 times if needed
5. **Results**: You get comprehensive answers with source references

### Example Queries

```python
# Data extraction
"Extract all email addresses and phone numbers from the documents"

# Analysis
"What are the main themes discussed across all documents?"

# Comparison
"Compare the methodologies used in the research papers"

# Summary
"Create a timeline of events mentioned in the reports"

# Specific search
"Find all references to 'machine learning' and their context"
```

## 🛠️ Configuration

### Environment Variables (.env)
```env
# Required
ANTHROPIC_API_KEY=your_claude_api_key_here

# Optional
MAX_ITERATIONS=10
TEMP_SCRIPTS_DIR=temp_scripts
FILES_TO_QUERY_DIR=files_to_query
SYSTEM_PROMPT_FILE=system_prompt.txt
```

### System Prompt Customization
Edit `system_prompt.txt` to customize AI behavior:
- Analysis approach
- Output format preferences
- Domain-specific instructions
- Quality requirements

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Backend development
pip install -r requirements.txt
python backend_main.py

# Frontend development  
cd frontend
npm run dev
```

### Areas for Contribution
- 📄 Additional file format support
- 🧠 Enhanced AI prompting strategies
- 🎨 UI/UX improvements
- 🔧 Performance optimizations
- 📚 Documentation improvements

## 📊 Performance & Limitations

### Supported File Types
- ✅ PDF (text extraction)
- ✅ XML (structure parsing)
- ✅ TXT (plain text)
- 🔄 Coming: DOCX, HTML, CSV

### Performance Notes
- **File Size**: Works best with files under 10MB
- **Processing Time**: 10-60 seconds per query depending on complexity
- **Accuracy**: High accuracy for well-structured documents
- **Rate Limits**: Subject to Claude AI API limits

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** for the amazing Claude AI API
- **FastAPI** for the excellent web framework
- **Next.js** for the modern frontend framework
- **Community** for feedback and contributions

## 📞 Support

- 🐛 [Report Issues](https://github.com/nykw2002/RAG-v3/issues)
- 💬 [Discussions](https://github.com/nykw2002/RAG-v3/discussions)
- 📧 [Contact](mailto:your-email@example.com)

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by [nykw2002](https://github.com/nykw2002)

</div>
