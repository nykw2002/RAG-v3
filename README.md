# AI File Query System

An intelligent system that uses Claude AI to analyze and query PDF, XML, and TXT files through dynamically generated Python scripts.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure your API key:**
   - Open `.env` file
   - Replace `your_claude_api_key_here` with your actual Anthropic API key

3. **Add files to query:**
   - Place your PDF, XML, or TXT files in the `files_to_query` folder

## Usage

### Quick Start (Easiest)
For first-time users, use the quick start script:

```bash
python start.py
```

This will:
- Check your setup automatically
- Guide you through any missing requirements
- Start the interactive mode when ready

### Interactive Mode (Recommended)
Run the interactive conversational interface:

```bash
python interactive.py
```

This starts a conversational session where you can:
- Ask multiple questions in a natural chat interface
- View available files and recent sessions  
- Get automatic session saving
- AI stops early when it finds complete answers

### Command Line Mode
Run single queries from the command line:

```bash
python main.py "What are the main topics discussed in the documents?"
python main.py "Extract all dates mentioned in the files"
python main.py "Summarize the key findings from the research papers"
```

## Project Structure

```
tests/
├── .env                    # Environment variables (API key)
├── start.py                # Quick start script (run this first!)
├── interactive.py          # Interactive conversational interface (recommended)
├── main.py                 # Command-line application script
├── system_prompt.txt       # System prompt for Claude
├── requirements.txt        # Python dependencies
├── test_setup.py          # Setup verification script
├── files_to_query/         # Place your files here (PDF, XML, TXT)
├── temp_scripts/           # Temporary Python scripts (auto-generated)
├── query_sessions/         # Saved query sessions and results
└── README.md              # This file
```

## How It Works

1. **User Query**: You provide a natural language query about your files
2. **AI Analysis**: Claude analyzes your query and available files
3. **Script Generation**: Claude writes Python scripts to extract the needed information
4. **Execution**: Scripts are executed automatically to process your files
5. **Iteration**: Claude can refine its approach up to 10 times for better results
6. **Final Answer**: You receive a comprehensive answer to your query

## Supported File Types

- **PDF**: Text extraction and analysis
- **XML**: Structure parsing and content extraction  
- **TXT**: Plain text analysis

## Configuration

Edit `.env` to customize:
- `MAX_ITERATIONS`: Maximum refinement attempts (default: 10)
- `TEMP_SCRIPTS_DIR`: Directory for temporary scripts
- `FILES_TO_QUERY_DIR`: Directory containing files to analyze
- `SYSTEM_PROMPT_FILE`: Path to system prompt file

## Examples

**Query:** "What are all the email addresses mentioned in the documents?"

**Query:** "Create a summary of each document with key dates and names"

**Query:** "Find all references to 'machine learning' and list the context"

## Troubleshooting

- **No files found**: Make sure your files are in `files_to_query/` directory
- **API errors**: Check your API key in `.env` file
- **Script errors**: Check the `temp_scripts/` folder for generated scripts
- **Timeout errors**: Large files may need longer processing time

## Security Notes

- API keys are stored locally in `.env` (add to .gitignore)
- Generated scripts are temporary and stored in `temp_scripts/`
- No data is sent to external services except Claude API calls
