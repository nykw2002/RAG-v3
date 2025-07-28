#!/usr/bin/env python3
"""
Startup script for AI File Query Backend
Handles proper initialization and prevents file watching issues
"""

import os
import sys
import uvicorn
from pathlib import Path

def main():
    print("Starting AI File Query Backend...")
    
    # Change to the project directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Ensure necessary directories exist
    dirs_to_create = [
        "files_to_query",
        "query_sessions", 
        "temp_scripts",
        "frontend_chats",
        "__pycache__"
    ]
    
    for dir_name in dirs_to_create:
        Path(dir_name).mkdir(exist_ok=True)
        print(f"✓ Directory {dir_name} ready")
    
    print("\nBackend Configuration:")
    print("- File watching: DISABLED (prevents interruption during AI processing)")
    print("- Host: 0.0.0.0:8000")
    print("- Frontend should connect to: http://localhost:8000")
    print("- API docs available at: http://localhost:8000/docs")
    print("- WebSocket endpoint: ws://localhost:8000/ws")
    
    print("\n" + "="*60)
    print("Backend starting... Press CTRL+C to stop")
    print("="*60)
    
    try:
        uvicorn.run(
            "backend_main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,  # Disabled to prevent interruption during AI processing
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n\nBackend stopped by user")
    except Exception as e:
        print(f"\nError starting backend: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
