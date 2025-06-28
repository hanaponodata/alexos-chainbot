"""
OpenAI API Client for ChainBot

Provides secure, robust integration with OpenAI's GPT models.
Handles API key management, rate limiting, error recovery, and model selection.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import aiohttp
from enum import Enum

logger = logging.getLogger(__name__)

class GPTModel(Enum):
    """Supported GPT models"""
    GPT_4 = "gpt-4"
    GPT_4_TURBO = "gpt-4-turbo-preview"
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_3_5_TURBO = "gpt-3.5-turbo"
    GPT_3_5_TURBO_16K = "gpt-3.5-turbo-16k"

@dataclass
class CompletionRequest:
    """OpenAI completion request"""
    prompt: str
    model: GPTModel = GPTModel.GPT_4O
    max_tokens: int = 2048
    temperature: float = 0.7
    top_p: float = 0.9
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stop_sequences: List[str] = field(default_factory=list)
    system_message: Optional[str] = None
    conversation_history: List[Dict[str, str]] = field(default_factory=list)

@dataclass
class CompletionResponse:
    """OpenAI completion response"""
    content: str
    model: str
    tokens_used: int
    finish_reason: str
    processing_time: float
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class RateLimitInfo:
    """Rate limit tracking"""
    requests_per_minute: int = 0
    tokens_per_minute: int = 0
    last_request_time: Optional[datetime] = None
    reset_time: Optional[datetime] = None

class OpenAIError(Exception):
    """OpenAI API error"""
    def __init__(self, message: str, status_code: int = None, retry_after: int = None):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after

class OpenAIClient:
    """
    Robust OpenAI API client with:
    - Secure API key management
    - Rate limiting and quota enforcement
    - Error recovery and retry logic
    - Model selection and configuration
    - Conversation history management
    """
    
    def __init__(self, api_key: str, organization_id: Optional[str] = None):
        self.api_key = api_key
        self.organization_id = organization_id
        self.base_url = "https://api.openai.com/v1"
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limit_info = RateLimitInfo()
        self.max_retries = 3
        self.retry_delay = 1.0
        self.timeout = 30.0
        
        # Model-specific configurations
        self.model_configs = {
            GPTModel.GPT_4: {"max_tokens": 8192, "cost_per_1k_tokens": 0.03},
            GPTModel.GPT_4_TURBO: {"max_tokens": 128000, "cost_per_1k_tokens": 0.01},
            GPTModel.GPT_4O: {"max_tokens": 128000, "cost_per_1k_tokens": 0.005},
            GPTModel.GPT_4O_MINI: {"max_tokens": 128000, "cost_per_1k_tokens": 0.00015},
            GPTModel.GPT_3_5_TURBO: {"max_tokens": 4096, "cost_per_1k_tokens": 0.002},
            GPTModel.GPT_3_5_TURBO_16K: {"max_tokens": 16384, "cost_per_1k_tokens": 0.003},
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.cleanup()
    
    async def initialize(self):
        """Initialize the client"""
        if not self.session:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self.session = aiohttp.ClientSession(timeout=timeout)
        
        # Validate API key
        await self._validate_api_key()
    
    async def cleanup(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def generate_completion(
        self,
        request: CompletionRequest
    ) -> CompletionResponse:
        """Generate completion with OpenAI API"""
        start_time = time.time()
        
        # Check rate limits
        await self._check_rate_limits()
        
        # Prepare messages
        messages = self._prepare_messages(request)
        
        # Make API request with retry logic
        for attempt in range(self.max_retries):
            try:
                response = await self._make_api_request(request, messages)
                
                # Update rate limit info
                self._update_rate_limit_info(response)
                
                processing_time = time.time() - start_time
                
                return CompletionResponse(
                    content=response["choices"][0]["message"]["content"],
                    model=response["model"],
                    tokens_used=response["usage"]["total_tokens"],
                    finish_reason=response["choices"][0]["finish_reason"],
                    processing_time=processing_time,
                    metadata={
                        "model": request.model.value,
                        "temperature": request.temperature,
                        "max_tokens": request.max_tokens,
                        "attempt": attempt + 1
                    }
                )
                
            except OpenAIError as e:
                if e.status_code == 429:  # Rate limit
                    retry_after = e.retry_after or 60
                    logger.warning(f"Rate limit hit, retrying in {retry_after} seconds")
                    await asyncio.sleep(retry_after)
                    continue
                elif e.status_code in [500, 502, 503, 504]:  # Server errors
                    if attempt < self.max_retries - 1:
                        delay = self.retry_delay * (2 ** attempt)
                        logger.warning(f"Server error, retrying in {delay} seconds")
                        await asyncio.sleep(delay)
                        continue
                raise
            except Exception as e:
                logger.error(f"Unexpected error in completion generation: {e}")
                raise OpenAIError(f"Unexpected error: {str(e)}")
        
        raise OpenAIError("Max retries exceeded")
    
    async def _validate_api_key(self):
        """Validate the API key"""
        try:
            headers = self._get_headers()
            async with self.session.get(f"{self.base_url}/models", headers=headers) as response:
                if response.status == 401:
                    raise OpenAIError("Invalid API key", 401)
                elif response.status != 200:
                    raise OpenAIError(f"API validation failed: {response.status}", response.status)
                
                # Store rate limit info
                self._extract_rate_limit_info(response.headers)
                
        except Exception as e:
            logger.error(f"API key validation failed: {e}")
            raise
    
    async def _make_api_request(
        self,
        request: CompletionRequest,
        messages: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Make the actual API request"""
        headers = self._get_headers()
        
        data = {
            "model": request.model.value,
            "messages": messages,
            "max_tokens": min(request.max_tokens, self.model_configs[request.model]["max_tokens"]),
            "temperature": request.temperature,
            "top_p": request.top_p,
            "frequency_penalty": request.frequency_penalty,
            "presence_penalty": request.presence_penalty,
            "stream": False
        }
        
        if request.stop_sequences:
            data["stop"] = request.stop_sequences
        
        async with self.session.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=data
        ) as response:
            if response.status == 200:
                return await response.json()
            elif response.status == 429:
                retry_after = int(response.headers.get("Retry-After", 60))
                raise OpenAIError("Rate limit exceeded", 429, retry_after)
            elif response.status == 401:
                raise OpenAIError("Invalid API key", 401)
            elif response.status == 402:
                raise OpenAIError("Quota exceeded", 402)
            elif response.status in [500, 502, 503, 504]:
                raise OpenAIError(f"Server error: {response.status}", response.status)
            else:
                error_data = await response.json()
                error_message = error_data.get("error", {}).get("message", "Unknown error")
                raise OpenAIError(f"API error: {error_message}", response.status)
    
    def _prepare_messages(self, request: CompletionRequest) -> List[Dict[str, str]]:
        """Prepare messages for the API request"""
        messages = []
        
        # Add system message if provided
        if request.system_message:
            messages.append({"role": "system", "content": request.system_message})
        
        # Add conversation history
        messages.extend(request.conversation_history)
        
        # Add current prompt
        messages.append({"role": "user", "content": request.prompt})
        
        return messages
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        if self.organization_id:
            headers["OpenAI-Organization"] = self.organization_id
        
        return headers
    
    async def _check_rate_limits(self):
        """Check and enforce rate limits"""
        if self.rate_limit_info.last_request_time:
            time_since_last = datetime.utcnow() - self.rate_limit_info.last_request_time
            if time_since_last.total_seconds() < 60:  # Rate limit window
                if self.rate_limit_info.requests_per_minute >= 60:  # OpenAI's default limit
                    wait_time = 60 - time_since_last.total_seconds()
                    logger.warning(f"Rate limit approaching, waiting {wait_time} seconds")
                    await asyncio.sleep(wait_time)
    
    def _update_rate_limit_info(self, response: Dict[str, Any]):
        """Update rate limit information from response"""
        self.rate_limit_info.last_request_time = datetime.utcnow()
        self.rate_limit_info.requests_per_minute += 1
        self.rate_limit_info.tokens_per_minute += response["usage"]["total_tokens"]
    
    def _extract_rate_limit_info(self, headers):
        """Extract rate limit information from response headers"""
        if "X-RateLimit-Reset" in headers:
            reset_time = int(headers["X-RateLimit-Reset"])
            self.rate_limit_info.reset_time = datetime.fromtimestamp(reset_time)
    
    def get_model_info(self, model: GPTModel) -> Dict[str, Any]:
        """Get information about a specific model"""
        return self.model_configs.get(model, {})
    
    def estimate_cost(self, model: GPTModel, tokens: int) -> float:
        """Estimate cost for a completion"""
        config = self.model_configs.get(model, {})
        cost_per_1k = config.get("cost_per_1k_tokens", 0)
        return (tokens / 1000) * cost_per_1k
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models"""
        try:
            headers = self._get_headers()
            async with self.session.get(f"{self.base_url}/models", headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("data", [])
                else:
                    raise OpenAIError(f"Failed to list models: {response.status}", response.status)
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            raise

class OpenAIKeyManager:
    """Secure API key management"""
    
    def __init__(self):
        self.keys: Dict[str, Dict[str, Any]] = {}
        self.active_key_id: Optional[str] = None
    
    def add_key(self, key_id: str, api_key: str, organization_id: Optional[str] = None) -> bool:
        """Add a new API key"""
        try:
            self.keys[key_id] = {
                "api_key": api_key,
                "organization_id": organization_id,
                "created_at": datetime.utcnow(),
                "last_used": None,
                "usage_count": 0,
                "is_active": True
            }
            
            if not self.active_key_id:
                self.active_key_id = key_id
            
            return True
        except Exception as e:
            logger.error(f"Failed to add API key: {e}")
            return False
    
    def remove_key(self, key_id: str) -> bool:
        """Remove an API key"""
        if key_id in self.keys:
            del self.keys[key_id]
            
            if self.active_key_id == key_id:
                self.active_key_id = next(iter(self.keys.keys()), None)
            
            return True
        return False
    
    def get_active_key(self) -> Optional[Dict[str, Any]]:
        """Get the currently active API key"""
        if self.active_key_id and self.active_key_id in self.keys:
            key_info = self.keys[self.active_key_id]
            key_info["last_used"] = datetime.utcnow()
            key_info["usage_count"] += 1
            return key_info
        return None
    
    def rotate_key(self) -> bool:
        """Rotate to the next available key"""
        if len(self.keys) > 1:
            key_ids = list(self.keys.keys())
            current_index = key_ids.index(self.active_key_id) if self.active_key_id else -1
            next_index = (current_index + 1) % len(key_ids)
            self.active_key_id = key_ids[next_index]
            return True
        return False
    
    def get_key_status(self) -> Dict[str, Any]:
        """Get status of all keys"""
        return {
            "active_key_id": self.active_key_id,
            "total_keys": len(self.keys),
            "keys": {
                key_id: {
                    "created_at": key_info["created_at"].isoformat(),
                    "last_used": key_info["last_used"].isoformat() if key_info["last_used"] else None,
                    "usage_count": key_info["usage_count"],
                    "is_active": key_info["is_active"]
                }
                for key_id, key_info in self.keys.items()
            }
        } 