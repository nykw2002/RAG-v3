#!/usr/bin/env python3
"""
Azure OpenAI Client Module
Handles authentication and API calls to Azure OpenAI
Replaces the Anthropic Claude client
"""

import os
import time
import requests
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class AzureOpenAIAuth:
    """Handle Azure OpenAI authentication using PingFed OAuth2"""
    
    def __init__(self):
        self.ping_fed_url = os.getenv('PING_FED_URL')
        self.kgw_client_id = os.getenv('KGW_CLIENT_ID')
        self.kgw_client_secret = os.getenv('KGW_CLIENT_SECRET')
        self.access_token = None
        self.token_expires_at = None
        
        if not all([self.ping_fed_url, self.kgw_client_id, self.kgw_client_secret]):
            raise ValueError("Missing required authentication configuration. Check PING_FED_URL, KGW_CLIENT_ID, and KGW_CLIENT_SECRET in .env")
    
    def get_access_token(self) -> str:
        """Get or refresh access token"""
        if self.access_token and self.token_expires_at and time.time() < self.token_expires_at:
            return self.access_token
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        data = {
            'grant_type': 'client_credentials',
            'client_id': self.kgw_client_id,
            'client_secret': self.kgw_client_secret
        }
        
        try:
            response = requests.post(self.ping_fed_url, headers=headers, data=data, timeout=30)
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access_token']
                self.token_expires_at = time.time() + token_data.get('expires_in', 3600) - 300  # 5 min buffer
                return self.access_token
            else:
                raise Exception(f"Failed to get access token: {response.status_code} - {response.text}")
        except requests.RequestException as e:
            raise Exception(f"Network error during authentication: {str(e)}")

class AzureOpenAIClient:
    """Azure OpenAI client that mimics the Anthropic client interface"""
    
    def __init__(self):
        self.auth = AzureOpenAIAuth()
        self.endpoint = os.getenv('KGW_ENDPOINT')
        self.api_version = os.getenv('AOAI_API_VERSION')
        self.chat_deployment = os.getenv('CHAT_MODEL_DEPLOYMENT_NAME')
        self.o3_mini_deployment = os.getenv('GPT_O3_MINI_DEPLOYMENT_NAME')
        self.use_o3_mini = os.getenv('USE_O3_MINI', 'false').lower() == 'true'
        
        if not all([self.endpoint, self.api_version, self.chat_deployment]):
            raise ValueError("Missing required Azure OpenAI configuration. Check KGW_ENDPOINT, AOAI_API_VERSION, and CHAT_MODEL_DEPLOYMENT_NAME in .env")
        
        # Choose deployment based on configuration (prefer gpt-4o over o3-mini)
        self.current_deployment = self.chat_deployment
        
        print(f"✅ Azure OpenAI client initialized")
        print(f"   - Endpoint: {self.endpoint}")
        print(f"   - Deployment: {self.current_deployment}")
        print(f"   - API Version: {self.api_version}")
    
    def create_message(self, system_prompt: str, user_message: str, max_tokens: int = 4000, temperature: float = 0.1) -> 'MockResponse':
        """Create a message (mimics anthropic.messages.create interface)"""
        access_token = self.auth.get_access_token()
        
        url = f"{self.endpoint}/openai/deployments/{self.current_deployment}/chat/completions?api-version={self.api_version}"
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        
        payload = {
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_message}
            ],
            'max_completion_tokens': max_tokens,  # Use max_completion_tokens for newer models
            'temperature': temperature
        }
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=120)
                
                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content']
                    return MockResponse(content)
                elif response.status_code == 429:
                    wait_time = (2 ** attempt) + 3
                    print(f"   Rate limit hit, waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    error_msg = f"API Error: {response.status_code} - {response.text}"
                    return MockResponse(error_msg)
                    
            except Exception as e:
                if attempt == max_retries - 1:
                    error_msg = f"Request failed after {max_retries} attempts: {str(e)}"
                    return MockResponse(error_msg)
                wait_time = (2 ** attempt) + 2
                print(f"   Request error, retrying in {wait_time} seconds...")
                time.sleep(wait_time)
        
        return MockResponse(f"Failed to get response after {max_retries} attempts")
    
    def create_message_with_conversation(self, messages: List[Dict], max_tokens: int = 4000, temperature: float = 0.1) -> 'MockResponse':
        """Create a message with full conversation history (proper OpenAI format)"""
        access_token = self.auth.get_access_token()
        
        url = f"{self.endpoint}/openai/deployments/{self.current_deployment}/chat/completions?api-version={self.api_version}"
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        
        payload = {
            'messages': messages,
            'max_completion_tokens': max_tokens,  # Use max_completion_tokens for newer models
            'temperature': temperature
        }
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=120)
                
                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content']
                    return MockResponse(content)
                elif response.status_code == 429:
                    wait_time = (2 ** attempt) + 3
                    print(f"   Rate limit hit, waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    error_msg = f"API Error: {response.status_code} - {response.text}"
                    print(f"DEBUG: API Error - {error_msg}")
                    return MockResponse(error_msg)
                    
            except Exception as e:
                if attempt == max_retries - 1:
                    error_msg = f"Request failed after {max_retries} attempts: {str(e)}"
                    print(f"DEBUG: Request Error - {error_msg}")
                    return MockResponse(error_msg)
                wait_time = (2 ** attempt) + 2
                print(f"   Request error, retrying in {wait_time} seconds...")
                time.sleep(wait_time)
        
        return MockResponse(f"Failed to get response after {max_retries} attempts")

class MockResponse:
    """Mock response object to mimic Anthropic's response structure"""
    
    def __init__(self, content: str):
        self.content = [MockContent(content)]

class MockContent:
    """Mock content object to mimic Anthropic's content structure"""
    
    def __init__(self, text: str):
        self.text = text

class Messages:
    """Messages class to mimic Anthropic's messages interface"""
    
    def __init__(self, client: AzureOpenAIClient):
        self.client = client
    
    def create(self, model: str, max_tokens: int, system: str, messages: List[Dict[str, str]]) -> MockResponse:
        """Create method that mimics Anthropic's interface"""
        # Convert Anthropic message format to OpenAI format
        # Anthropic: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        # OpenAI: same format but we need to handle the conversation properly
        
        # Build the full conversation for OpenAI
        openai_messages = []
        
        # Add system message first (OpenAI format)
        if system:
            openai_messages.append({"role": "system", "content": system})
        
        # Add all conversation messages
        for msg in messages:
            openai_messages.append({
                "role": msg.get('role', 'user'),
                "content": msg.get('content', '')
            })
        
        # Make the API call with full conversation
        return self.client.create_message_with_conversation(
            messages=openai_messages,
            max_tokens=max_tokens
        )

# Create a client instance that mimics the Anthropic client interface
class AzureOpenAIAnthropicMimic:
    """Main client class that mimics Anthropic client interface"""
    
    def __init__(self, api_key: str = None):
        # api_key parameter is ignored since we use OAuth2
        self.azure_client = AzureOpenAIClient()
        self.messages = Messages(self.azure_client)

# Factory function to create client (replaces anthropic.Anthropic())
def create_azure_openai_client(api_key: str = None) -> AzureOpenAIAnthropicMimic:
    """Factory function to create Azure OpenAI client"""
    return AzureOpenAIAnthropicMimic(api_key)

# For backward compatibility, create a module-level client
def Anthropic(api_key: str = None) -> AzureOpenAIAnthropicMimic:
    """Drop-in replacement for anthropic.Anthropic()"""
    return create_azure_openai_client(api_key)
