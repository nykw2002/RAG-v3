#!/usr/bin/env python3
"""
AI File Query System - Interactive Version
Conversational interface for querying files with Claude AI
"""

import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import anthropic
import re

class InteractiveAIFileQuerySystem:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in .env file")
        
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.max_iterations = int(os.getenv('MAX_ITERATIONS', 10))
        
        # Set up paths
        self.base_dir = Path(__file__).parent
        self.files_dir = self.base_dir / os.getenv('FILES_TO_QUERY_DIR', 'files_to_query')
        self.scripts_dir = self.base_dir / os.getenv('TEMP_SCRIPTS_DIR', 'temp_scripts')
        self.system_prompt_file = self.base_dir / os.getenv('SYSTEM_PROMPT_FILE', 'system_prompt.txt')
        self.sessions_dir = self.base_dir / 'query_sessions'
        
        # Create sessions directory if it doesn't exist
        self.sessions_dir.mkdir(exist_ok=True)
        
        # Load system prompt
        self.system_prompt = self.load_system_prompt()
        
    def load_system_prompt(self):
        """Load the system prompt from file"""
        try:
            with open(self.system_prompt_file, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except FileNotFoundError:
            return """You are an AI assistant specialized in analyzing and querying files. Your task is to help users find information from uploaded documents (PDF, XML, TXT files) by writing and executing Python scripts.

When you find a satisfactory answer, respond with 'QUERY_COMPLETE:' followed by your final answer to clearly indicate you're done.

## Your Capabilities:
- Write Python scripts to parse and analyze PDF, XML, and TXT files
- Use libraries like PyPDF2, pdfplumber, xml.etree.ElementTree, BeautifulSoup, pandas, etc.
- Execute scripts to extract specific information requested by the user
- Stop early when you have a complete answer

## Guidelines:
1. Always start by understanding what files are available
2. Write clear, well-commented Python scripts that handle errors gracefully
3. Focus on extracting the specific information the user is asking for
4. If you get a good result, say 'QUERY_COMPLETE:' and provide the final answer
5. Only continue iterating if you need to refine or get better results"""
    
    def get_available_files(self):
        """Get list of available files to query"""
        files = []
        for file_path in self.files_dir.glob('*'):
            if file_path.is_file() and file_path.suffix.lower() in ['.pdf', '.xml', '.txt']:
                files.append(str(file_path.relative_to(self.base_dir)))
        return files
    
    def execute_python_script(self, script_content, script_name):
        """Execute a Python script and return the output"""
        script_path = self.scripts_dir / f"{script_name}.py"
        
        try:
            # Write script to file
            with open(script_path, 'w', encoding='utf-8') as f:
                f.write(script_content)
            
            # Execute script
            result = subprocess.run(
                [sys.executable, str(script_path)],
                capture_output=True,
                text=True,
                cwd=self.base_dir,
                timeout=60  # Increased timeout
            )
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'script_path': str(script_path),
                'script_content': script_content
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Script execution timed out (60 seconds)',
                'script_path': str(script_path),
                'script_content': script_content
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': f'Error executing script: {str(e)}',
                'script_path': str(script_path),
                'script_content': script_content
            }
    
    def extract_files_accessed(self, script_content):
        """Extract which files the script is trying to access"""
        files_accessed = []
        
        try:
            # Pattern 1: open('files_to_query/filename.ext') or open("files_to_query/filename.ext")
            pattern1 = r"open\s*\(\s*['\"]files_to_query[/\\\\]([^'\"]+)['\"]"
            matches1 = re.findall(pattern1, script_content)
            files_accessed.extend([f"files_to_query/{match}" for match in matches1])
            
            # Pattern 2: Any string containing 'files_to_query/filename.ext'
            pattern2 = r"['\"]files_to_query[/\\\\]([^'\"\s]+)['\"]"
            matches2 = re.findall(pattern2, script_content)
            files_accessed.extend([f"files_to_query/{match}" for match in matches2])
            
        except re.error as e:
            # If regex fails, fall back to simple string detection
            print(f"Regex error in file detection: {e}")
            lines = script_content.split('\n')
            for line in lines:
                if 'files_to_query/' in line:
                    # Simple extraction for common cases
                    if '.txt' in line or '.pdf' in line or '.xml' in line:
                        files_accessed.append("files_to_query/ (detected but pattern failed)")
                        break
        
        # Pattern 3: files_dir.glob or similar directory operations
        if 'files_to_query' in script_content.lower():
            # If script mentions the directory but not specific files, 
            # it might be doing directory scanning
            if not files_accessed:
                files_accessed.append("files_to_query/ (directory scan)")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_files = []
        for file in files_accessed:
            if file not in seen:
                seen.add(file)
                unique_files.append(file)
        
        return unique_files
    
    def save_session(self, user_query, iterations, final_answer, session_id, files_accessed=None):
        """Save the query session to a file"""
        session_data = {
            'session_id': session_id,
            'timestamp': datetime.now().isoformat(),
            'user_query': user_query,
            'final_answer': final_answer,
            'total_iterations': len(iterations),
            'max_iterations_allowed': self.max_iterations,
            'files_accessed': files_accessed or [],
            'available_files': self.get_available_files(),
            'system_prompt': self.system_prompt,  # Store the actual system prompt used
            'iterations': iterations
        }
        
        session_file = self.sessions_dir / f"session_{session_id}.json"
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2, ensure_ascii=False)
        
        return session_file
    
    def query_files(self, user_query, session_id):
        """Main method to process user query using Claude"""
        available_files = self.get_available_files()
        
        if not available_files:
            return "No files found in the files_to_query directory. Please add PDF, XML, or TXT files to query.", []
        
        conversation_history = []
        iterations = []
        all_files_accessed = set()  # Track all files accessed across iterations
        
        # Initial message with context
        initial_message = f"""
User Query: {user_query}

Available files to query: {', '.join(available_files)}

Please write a Python script to help answer this query. The script should:
1. Read and analyze the relevant files from the files_to_query directory
2. Extract the information needed to answer the user's question
3. Print the results clearly

When you have a complete answer, start your response with 'QUERY_COMPLETE:' followed by the final answer.
You have up to {self.max_iterations} iterations if needed, but you can stop early when satisfied.
"""
        
        conversation_history.append({"role": "user", "content": initial_message})
        
        for iteration in range(self.max_iterations):
            print(f"\\n Iteration {iteration + 1}/{self.max_iterations}")
            
            try:
                # Call Claude API
                response = self.client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=4000,
                    system=self.system_prompt,
                    messages=conversation_history
                )
                
                claude_response = response.content[0].text
                print(f"Claude is working...")
                
                # Check if Claude indicates completion
                is_complete = "QUERY_COMPLETE:" in claude_response
                
                # CRITICAL FIX: If Claude wrote a script AND used QUERY_COMPLETE in the same response,
                # this is invalid - Claude cannot complete without seeing script results first
                if "```python" in claude_response and is_complete:
                    print(f"  Claude attempted to complete before seeing script results - continuing to next iteration")
                    is_complete = False  # Override the completion flag
                
                iteration_data = {
                    'iteration_number': iteration + 1,
                    'claude_response': claude_response,
                    'script_executed': False,
                    'execution_result': None,
                    'is_complete': is_complete,
                    'files_accessed_this_iteration': []
                }
                
                # Extract Python code from response
                if "```python" in claude_response:
                    code_start = claude_response.find("```python") + 9
                    code_end = claude_response.find("```", code_start)
                    script_content = claude_response[code_start:code_end].strip()
                    
                    # Extract files accessed by this script
                    files_this_iteration = self.extract_files_accessed(script_content)
                    iteration_data['files_accessed_this_iteration'] = files_this_iteration
                    all_files_accessed.update(files_this_iteration)
                    
                    # Execute the script
                    script_name = f"query_{session_id}_iteration_{iteration + 1}"
                    execution_result = self.execute_python_script(script_content, script_name)
                    
                    iteration_data['script_executed'] = True
                    iteration_data['execution_result'] = execution_result
                    
                    if execution_result['success']:
                        print(f" Script executed successfully")
                        if execution_result['output']:
                            print(f" Output preview: {execution_result['output'][:200]}...")
                    else:
                        print(f" Script failed: {execution_result['error'][:100]}...")
                    
                    # Add to conversation history
                    conversation_history.append({"role": "assistant", "content": claude_response})
                    
                    if execution_result['success'] and execution_result['output']:
                        if is_complete:
                            # This should rarely happen now due to our fix above, but just in case
                            final_answer_start = claude_response.find("QUERY_COMPLETE:") + 15
                            final_answer = claude_response[final_answer_start:].strip()
                            
                            iterations.append(iteration_data)
                            return final_answer, iterations, list(all_files_accessed)
                        else:
                            # This is the correct flow: ask Claude to interpret results in next iteration
                            interpretation_request = f"""
The script executed successfully with the following output:
{execution_result['output']}

Based on this EXACT output from the script, please provide your final analysis of the user's query: "{user_query}"

IMPORTANT: Trust the script results completely. If the script says "14", report "14". Do not override with mental calculations.

If you now have a complete answer based on these script results, start your response with 'QUERY_COMPLETE:' followed by your analysis.
"""
                            conversation_history.append({"role": "user", "content": interpretation_request})
                    
                    else:
                        # Script failed, ask Claude to fix it  
                        error_message = f"""
The script encountered an error:
Error: {execution_result['error']}
Output: {execution_result['output']}

Please write an improved script to solve the issue. Do NOT use 'QUERY_COMPLETE:' until you have seen successful script results.
"""
                        conversation_history.append({"role": "user", "content": error_message})
                
                else:
                    # No code found, check if it's a final answer
                    if is_complete:
                        final_answer_start = claude_response.find("QUERY_COMPLETE:") + 15
                        final_answer = claude_response[final_answer_start:].strip()
                        
                        iterations.append(iteration_data)
                        return final_answer, iterations, list(all_files_accessed)
                    else:
                        # Ask for clarification but prevent premature completion
                        conversation_history.append({"role": "assistant", "content": claude_response})
                        conversation_history.append({
                            "role": "user", 
                            "content": "Please provide a Python script to analyze the files and answer the query. Do NOT use 'QUERY_COMPLETE:' until you have executed a script and seen the results."
                        })
                
                iterations.append(iteration_data)
            
            except Exception as e:
                error_iteration = {
                    'iteration_number': iteration + 1,
                    'error': str(e),
                    'script_executed': False,
                    'execution_result': None,
                    'is_complete': False,
                    'files_accessed_this_iteration': []
                }
                iterations.append(error_iteration)
                return f"Error during iteration {iteration + 1}: {str(e)}", iterations, list(all_files_accessed)
        
        return f"Unable to complete the query after {self.max_iterations} iterations. Please try a more specific query or check your files.", iterations, list(all_files_accessed)

def display_welcome():
    """Display welcome message"""
    print("\\n" + "=" * 60)
    print(" AI FILE QUERY SYSTEM - Interactive Mode")
    print("=" * 60)
    print("Ask questions about your documents and I'll analyze them!")
    print("\\nCommands:")
    print("  'quit' or 'exit' - Exit the program")
    print("  'files' - Show available files")
    print("  'sessions' - Show recent query sessions")
    print("=" * 60)

def show_files(system):
    """Show available files"""
    files = system.get_available_files()
    if files:
        print(f"\\n Available files ({len(files)}):")
        for i, file in enumerate(files, 1):
            print(f"  {i}. {file}")
    else:
        print("\\n No files found in files_to_query/ directory")
        print("   Add PDF, XML, or TXT files to start querying")

def show_recent_sessions(sessions_dir, limit=5):
    """Show recent query sessions"""
    session_files = list(sessions_dir.glob("session_*.json"))
    session_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    
    if not session_files:
        print("\\n No previous sessions found")
        return
    
    print(f"\\n Recent sessions (showing last {limit}):")
    for i, session_file in enumerate(session_files[:limit], 1):
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
            
            timestamp = datetime.fromisoformat(session_data['timestamp']).strftime("%Y-%m-%d %H:%M")
            query_preview = session_data['user_query'][:50] + "..." if len(session_data['user_query']) > 50 else session_data['user_query']
            iterations = session_data['total_iterations']
            
            # Show files accessed if available
            files_info = ""
            if 'files_accessed' in session_data and session_data['files_accessed']:
                files_count = len(session_data['files_accessed'])
                files_info = f" | {files_count} files"
            
            print(f"  {i}. {timestamp} | {iterations} iterations{files_info} | {query_preview}")
        except Exception:
            continue

def main():
    """Main interactive function"""
    try:
        system = InteractiveAIFileQuerySystem()
        display_welcome()
        
        # Show available files initially
        show_files(system)
        
        session_counter = 1
        
        while True:
            print("\\n" + "-" * 60)
            user_input = input("\\n Enter your query (or 'help' for commands): ").strip()
            
            if not user_input:
                continue
                
            # Handle commands
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("\\n Goodbye!")
                break
            elif user_input.lower() == 'help':
                print("\\nCommands:")
                print("  'quit' or 'exit' - Exit the program")
                print("  'files' - Show available files")
                print("  'sessions' - Show recent query sessions")
                continue
            elif user_input.lower() == 'files':
                show_files(system)
                continue
            elif user_input.lower() == 'sessions':
                show_recent_sessions(system.sessions_dir)
                continue
            
            # Process query
            session_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{session_counter:03d}"
            print(f"\\n Processing query (Session: {session_id})...")
            
            try:
                result, iterations, files_accessed = system.query_files(user_input, session_id)
                
                # Save session with files accessed info
                session_file = system.save_session(user_input, iterations, result, session_id, files_accessed)
                
                # Display results
                print("\\n" + "=" * 60)
                print(" FINAL RESULT")
                print("=" * 60)
                print(result)
                print("\\n" + "=" * 60)
                print(f" Session saved: {session_file.name}")
                print(f"Iterations used: {len(iterations)}/{system.max_iterations}")
                if files_accessed:
                    print(f" Files accessed: {', '.join(files_accessed)}")
                
                session_counter += 1
                
            except KeyboardInterrupt:
                print("\\n\\n  Query interrupted by user")
                continue
            except Exception as e:
                print(f"\\n Error processing query: {str(e)}")
                continue
                
    except Exception as e:
        print(f" System initialization error: {str(e)}")
        print("\\nPlease check:")
        print("1. Your API key is set in .env file")
        print("2. Dependencies are installed: pip install -r requirements.txt")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
