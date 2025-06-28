"""
MacLink Client for ChainBot

Provides integration with local LLMs running on MacBook via MacLink.
Handles model discovery, health monitoring, and inference requests.
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

class LocalModelType(Enum):
    """Supported local model types"""
    OLLAMA = "ollama"
    LLAMA_CPP = "llama_cpp"
    LM_STUDIO = "lm_studio"
    TEXT_GENERATION_WEBUI = "textgen_webui"
    CUSTOM = "custom"

@dataclass
class LocalModelInfo:
    """Local model information"""
    name: str
    type: LocalModelType
    status: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    capabilities: List[str] = field(default_factory=list)
    last_used: Optional[datetime] = None

@dataclass
class MacLinkRequest:
    """MacLink inference request"""
    prompt: str
    model_name: str
    max_tokens: int = 2048
    temperature: float = 0.7
    top_p: float = 0.9
    stop_sequences: List[str] = field(default_factory=list)
    system_message: Optional[str] = None
    conversation_history: List[Dict[str, str]] = field(default_factory=list)

@dataclass
class MacLinkResponse:
    """MacLink inference response"""
    content: str
    model_name: str
    tokens_used: int
    processing_time: float
    metadata: Dict[str, Any] = field(default_factory=dict)

class MacLinkError(Exception):
    """MacLink API error"""
    def __init__(self, message: str, status_code: int = None, retry_after: int = None):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after

class MacLinkClient:
    """
    MacLink client for local LLM inference
    
    Features:
    - Model discovery and health monitoring
    - Secure communication with MacBook
    - Error recovery and retry logic
    - Conversation history management
    - Performance monitoring
    """
    
    def __init__(self, macbook_url: str = "http://localhost:8080", api_key: Optional[str] = None):
        self.macbook_url = macbook_url.rstrip('/')
        self.api_key = api_key
        self.session: Optional[aiohttp.ClientSession] = None
        self.max_retries = 3
        self.retry_delay = 1.0
        self.timeout = 60.0  # Longer timeout for local models
        self.health_check_interval = 30
        self.available_models: Dict[str, LocalModelInfo] = {}
        self.last_health_check = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.cleanup()
    
    async def initialize(self):
        """Initialize the MacLink client"""
        if not self.session:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self.session = aiohttp.ClientSession(timeout=timeout)
        
        # Discover available models
        await self.discover_models()
        
        # Start health monitoring
        asyncio.create_task(self._health_monitor_loop())
    
    async def cleanup(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def discover_models(self) -> List[LocalModelInfo]:
        """Discover available local models"""
        try:
            headers = self._get_headers()
            async with self.session.get(f"{self.macbook_url}/api/models", headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    models = []
                    
                    for model_data in data.get("models", []):
                        model_info = LocalModelInfo(
                            name=model_data["name"],
                            type=LocalModelType(model_data.get("type", "custom")),
                            status=model_data.get("status", "unknown"),
                            parameters=model_data.get("parameters", {}),
                            capabilities=model_data.get("capabilities", [])
                        )
                        
                        self.available_models[model_info.name] = model_info
                        models.append(model_info)
                    
                    logger.info(f"Discovered {len(models)} local models via MacLink")
                    return models
                else:
                    logger.warning(f"Failed to discover models: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Model discovery failed: {e}")
            return []
    
    async def generate_completion(
        self,
        request: MacLinkRequest
    ) -> MacLinkResponse:
        """Generate completion using local LLM via MacLink"""
        start_time = time.time()
        
        # Validate model availability
        if request.model_name not in self.available_models:
            raise MacLinkError(f"Model {request.model_name} not available")
        
        # Check model health
        model_info = self.available_models[request.model_name]
        if model_info.status != "ready":
            raise MacLinkError(f"Model {request.model_name} is not ready (status: {model_info.status})")
        
        # Make inference request with retry logic
        for attempt in range(self.max_retries):
            try:
                response = await self._make_inference_request(request)
                
                # Update model usage
                model_info.last_used = datetime.utcnow()
                
                processing_time = time.time() - start_time
                
                return MacLinkResponse(
                    content=response["content"],
                    model_name=request.model_name,
                    tokens_used=response.get("tokens_used", 0),
                    processing_time=processing_time,
                    metadata={
                        "model_type": model_info.type.value,
                        "temperature": request.temperature,
                        "max_tokens": request.max_tokens,
                        "attempt": attempt + 1,
                        "macbook_url": self.macbook_url
                    }
                )
                
            except MacLinkError as e:
                if e.status_code in [500, 502, 503, 504]:  # Server errors
                    if attempt < self.max_retries - 1:
                        delay = self.retry_delay * (2 ** attempt)
                        logger.warning(f"MacLink server error, retrying in {delay} seconds")
                        await asyncio.sleep(delay)
                        continue
                raise
            except Exception as e:
                logger.error(f"Unexpected error in MacLink completion: {e}")
                raise MacLinkError(f"Unexpected error: {str(e)}")
        
        raise MacLinkError("Max retries exceeded")
    
    async def _make_inference_request(self, request: MacLinkRequest) -> Dict[str, Any]:
        """Make the actual inference request to MacLink"""
        headers = self._get_headers()
        
        data = {
            "prompt": request.prompt,
            "model_name": request.model_name,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p,
            "stop_sequences": request.stop_sequences,
            "system_message": request.system_message,
            "conversation_history": request.conversation_history
        }
        
        async with self.session.post(
            f"{self.macbook_url}/api/generate",
            headers=headers,
            json=data
        ) as response:
            if response.status == 200:
                return await response.json()
            elif response.status == 404:
                raise MacLinkError(f"Model {request.model_name} not found", 404)
            elif response.status == 503:
                raise MacLinkError(f"Model {request.model_name} not ready", 503)
            elif response.status in [500, 502, 503, 504]:
                raise MacLinkError(f"MacLink server error: {response.status}", response.status)
            else:
                try:
                    error_data = await response.json()
                    error_message = error_data.get("error", "Unknown error")
                except:
                    error_message = f"HTTP {response.status}"
                raise MacLinkError(f"MacLink error: {error_message}", response.status)
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers"""
        headers = {
            "Content-Type": "application/json"
        }
        
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        return headers
    
    async def get_model_status(self, model_name: str) -> Optional[LocalModelInfo]:
        """Get status of a specific model"""
        try:
            headers = self._get_headers()
            async with self.session.get(
                f"{self.macbook_url}/api/models/{model_name}/status",
                headers=headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if model_name in self.available_models:
                        self.available_models[model_name].status = data.get("status", "unknown")
                        return self.available_models[model_name]
                    else:
                        # Model not in our cache, create new info
                        model_info = LocalModelInfo(
                            name=model_name,
                            type=LocalModelType(data.get("type", "custom")),
                            status=data.get("status", "unknown"),
                            parameters=data.get("parameters", {}),
                            capabilities=data.get("capabilities", [])
                        )
                        self.available_models[model_name] = model_info
                        return model_info
                else:
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get model status for {model_name}: {e}")
            return None
    
    async def get_available_models(self) -> List[LocalModelInfo]:
        """Get list of available models"""
        return list(self.available_models.values())
    
    async def health_check(self) -> bool:
        """Check MacLink health"""
        try:
            headers = self._get_headers()
            async with self.session.get(f"{self.macbook_url}/api/health", headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("status") == "healthy"
                return False
        except Exception as e:
            logger.error(f"MacLink health check failed: {e}")
            return False
    
    async def _health_monitor_loop(self):
        """Monitor MacLink health and model status"""
        while True:
            try:
                # Check MacLink health
                is_healthy = await self.health_check()
                
                if not is_healthy:
                    logger.warning("MacLink health check failed")
                
                # Update model statuses
                for model_name in list(self.available_models.keys()):
                    await self.get_model_status(model_name)
                
                self.last_health_check = datetime.utcnow()
                
                await asyncio.sleep(self.health_check_interval)
                
            except Exception as e:
                logger.error(f"Health monitor error: {e}")
                await asyncio.sleep(self.health_check_interval)
    
    async def start_model(self, model_name: str) -> bool:
        """Start a local model"""
        try:
            headers = self._get_headers()
            async with self.session.post(
                f"{self.macbook_url}/api/models/{model_name}/start",
                headers=headers
            ) as response:
                if response.status == 200:
                    logger.info(f"Started model: {model_name}")
                    return True
                else:
                    logger.error(f"Failed to start model {model_name}: {response.status}")
                    return False
        except Exception as e:
            logger.error(f"Failed to start model {model_name}: {e}")
            return False
    
    async def stop_model(self, model_name: str) -> bool:
        """Stop a local model"""
        try:
            headers = self._get_headers()
            async with self.session.post(
                f"{self.macbook_url}/api/models/{model_name}/stop",
                headers=headers
            ) as response:
                if response.status == 200:
                    logger.info(f"Stopped model: {model_name}")
                    return True
                else:
                    logger.error(f"Failed to stop model {model_name}: {response.status}")
                    return False
        except Exception as e:
            logger.error(f"Failed to stop model {model_name}: {e}")
            return False
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Get connection information"""
        return {
            "macbook_url": self.macbook_url,
            "last_health_check": self.last_health_check.isoformat() if self.last_health_check else None,
            "available_models": len(self.available_models),
            "api_key_configured": bool(self.api_key)
        }

class MacLinkManager:
    """MacLink connection manager"""
    
    def __init__(self):
        self.clients: Dict[str, MacLinkClient] = {}
        self.active_client_id: Optional[str] = None
    
    def add_connection(
        self,
        client_id: str,
        macbook_url: str,
        api_key: Optional[str] = None
    ) -> bool:
        """Add a new MacLink connection"""
        try:
            client = MacLinkClient(macbook_url, api_key)
            self.clients[client_id] = client
            
            if not self.active_client_id:
                self.active_client_id = client_id
            
            return True
        except Exception as e:
            logger.error(f"Failed to add MacLink connection: {e}")
            return False
    
    def remove_connection(self, client_id: str) -> bool:
        """Remove a MacLink connection"""
        if client_id in self.clients:
            # Cleanup client
            client = self.clients[client_id]
            asyncio.create_task(client.cleanup())
            del self.clients[client_id]
            
            if self.active_client_id == client_id:
                self.active_client_id = next(iter(self.clients.keys()), None)
            
            return True
        return False
    
    def get_active_client(self) -> Optional[MacLinkClient]:
        """Get the currently active MacLink client"""
        if self.active_client_id and self.active_client_id in self.clients:
            return self.clients[self.active_client_id]
        return None
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Get status of all connections"""
        return {
            "active_client_id": self.active_client_id,
            "total_connections": len(self.clients),
            "connections": {
                client_id: client.get_connection_info()
                for client_id, client in self.clients.items()
            }
        } 