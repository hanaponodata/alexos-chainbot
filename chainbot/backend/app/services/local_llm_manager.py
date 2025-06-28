"""
Local LLM Manager for ChainBot

Manages local LLM inference through MacLink integration.
Supports llama.cpp, Ollama, LM Studio, and other local model runtimes.
"""

import asyncio
import json
import logging
import subprocess
import aiohttp
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import os
import platform

logger = logging.getLogger(__name__)

class LocalLLMType(Enum):
    """Supported local LLM types"""
    LLAMA_CPP = "llama_cpp"
    OLLAMA = "ollama"
    LM_STUDIO = "lm_studio"
    TEXT_GENERATION_WEBUI = "text_generation_webui"
    VLLM = "vllm"
    CUSTOM = "custom"

class LLMStatus(Enum):
    """LLM status states"""
    OFFLINE = "offline"
    STARTING = "starting"
    ONLINE = "online"
    BUSY = "busy"
    ERROR = "error"

@dataclass
class LocalModel:
    """Local model configuration"""
    name: str
    type: LocalLLMType
    model_path: str
    api_endpoint: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    capabilities: List[str] = field(default_factory=list)
    status: LLMStatus = LLMStatus.OFFLINE
    last_used: Optional[datetime] = None

@dataclass
class InferenceRequest:
    """Inference request structure"""
    prompt: str
    model_name: str
    max_tokens: int = 2048
    temperature: float = 0.7
    top_p: float = 0.9
    stop_sequences: List[str] = field(default_factory=list)
    context: Optional[Dict[str, Any]] = None

@dataclass
class InferenceResponse:
    """Inference response structure"""
    content: str
    model_name: str
    tokens_used: int
    processing_time: float
    metadata: Dict[str, Any] = field(default_factory=dict)

class LocalLLMManager:
    """
    Manages local LLM inference through MacLink integration
    
    Features:
    - Automatic model discovery
    - Multiple runtime support (llama.cpp, Ollama, etc.)
    - Connection pooling and load balancing
    - Model health monitoring
    - MacLink integration for remote inference
    """
    
    def __init__(self):
        self.models: Dict[str, LocalModel] = {}
        self.active_connections: Dict[str, Any] = {}
        self.maclink_config: Dict[str, Any] = {}
        self.health_check_interval: int = 30  # seconds
        self.max_retries: int = 3
        
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize the local LLM manager"""
        try:
            logger.info("Initializing Local LLM Manager...")
            
            # Load MacLink configuration
            self.maclink_config = config.get("maclink", {})
            
            # Discover available models
            await self._discover_models()
            
            # Start health monitoring
            asyncio.create_task(self._health_monitor_loop())
            
            logger.info("Local LLM Manager initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Local LLM Manager: {e}")
            return False
    
    async def add_model(
        self,
        name: str,
        model_type: LocalLLMType,
        model_path: str,
        api_endpoint: str,
        parameters: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Add a new local model"""
        try:
            model = LocalModel(
                name=name,
                type=model_type,
                model_path=model_path,
                api_endpoint=api_endpoint,
                parameters=parameters or {},
                status=LLMStatus.OFFLINE
            )
            
            # Test connection
            if await self._test_model_connection(model):
                model.status = LLMStatus.ONLINE
                self.models[name] = model
                logger.info(f"Added local model: {name} ({model_type.value})")
                return True
            else:
                logger.warning(f"Failed to connect to model: {name}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to add model {name}: {e}")
            return False
    
    async def remove_model(self, name: str) -> bool:
        """Remove a local model"""
        try:
            if name in self.models:
                # Close any active connections
                if name in self.active_connections:
                    await self._close_model_connection(name)
                
                del self.models[name]
                logger.info(f"Removed local model: {name}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to remove model {name}: {e}")
            return False
    
    async def generate_completion(
        self,
        request: InferenceRequest
    ) -> InferenceResponse:
        """Generate completion using local LLM"""
        try:
            if request.model_name not in self.models:
                raise ValueError(f"Model {request.model_name} not found")
            
            model = self.models[request.model_name]
            
            # Update model status
            model.status = LLMStatus.BUSY
            model.last_used = datetime.utcnow()
            
            start_time = datetime.utcnow()
            
            # Generate completion based on model type
            if model.type == LocalLLMType.OLLAMA:
                response = await self._call_ollama_api(request, model)
            elif model.type == LocalLLMType.LLAMA_CPP:
                response = await self._call_llama_cpp_api(request, model)
            elif model.type == LocalLLMType.LM_STUDIO:
                response = await self._call_lm_studio_api(request, model)
            elif model.type == LocalLLMType.TEXT_GENERATION_WEBUI:
                response = await self._call_textgen_webui_api(request, model)
            else:
                response = await self._call_generic_api(request, model)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Update model status
            model.status = LLMStatus.ONLINE
            
            return InferenceResponse(
                content=response["content"],
                model_name=request.model_name,
                tokens_used=response.get("tokens_used", 0),
                processing_time=processing_time,
                metadata=response.get("metadata", {})
            )
            
        except Exception as e:
            logger.error(f"Failed to generate completion: {e}")
            if request.model_name in self.models:
                self.models[request.model_name].status = LLMStatus.ERROR
            
            raise
    
    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models"""
        return [
            {
                "name": model.name,
                "type": model.type.value,
                "status": model.status.value,
                "capabilities": model.capabilities,
                "last_used": model.last_used.isoformat() if model.last_used else None,
                "parameters": model.parameters
            }
            for model in self.models.values()
        ]
    
    async def get_model_status(self, model_name: str) -> Optional[LLMStatus]:
        """Get status of a specific model"""
        if model_name in self.models:
            return self.models[model_name].status
        return None
    
    async def _discover_models(self):
        """Discover available local models"""
        try:
            # Check for Ollama
            await self._discover_ollama_models()
            
            # Check for llama.cpp
            await self._discover_llama_cpp_models()
            
            # Check for LM Studio
            await self._discover_lm_studio_models()
            
            # Check for Text Generation WebUI
            await self._discover_textgen_webui_models()
            
            logger.info(f"Discovered {len(self.models)} local models")
            
        except Exception as e:
            logger.error(f"Failed to discover models: {e}")
    
    async def _discover_ollama_models(self):
        """Discover Ollama models"""
        try:
            # Check if Ollama is running
            async with aiohttp.ClientSession() as session:
                async with session.get("http://localhost:11434/api/tags") as response:
                    if response.status == 200:
                        data = await response.json()
                        for model in data.get("models", []):
                            model_name = model["name"]
                            if model_name not in self.models:
                                await self.add_model(
                                    name=model_name,
                                    model_type=LocalLLMType.OLLAMA,
                                    model_path=model_name,
                                    api_endpoint="http://localhost:11434/api/generate",
                                    parameters={
                                        "temperature": 0.7,
                                        "top_p": 0.9,
                                        "max_tokens": 2048
                                    }
                                )
        except Exception as e:
            logger.debug(f"Ollama not available: {e}")
    
    async def _discover_llama_cpp_models(self):
        """Discover llama.cpp models"""
        try:
            # Check common llama.cpp endpoints
            endpoints = [
                "http://localhost:8080/completion",
                "http://localhost:8081/completion"
            ]
            
            for endpoint in endpoints:
                async with aiohttp.ClientSession() as session:
                    async with session.get(endpoint.replace("/completion", "/model")) as response:
                        if response.status == 200:
                            model_name = f"llama_cpp_{endpoint.split(':')[1]}"
                            if model_name not in self.models:
                                await self.add_model(
                                    name=model_name,
                                    model_type=LocalLLMType.LLAMA_CPP,
                                    model_path="",
                                    api_endpoint=endpoint,
                                    parameters={
                                        "temperature": 0.7,
                                        "top_p": 0.9,
                                        "max_tokens": 2048
                                    }
                                )
        except Exception as e:
            logger.debug(f"llama.cpp not available: {e}")
    
    async def _discover_lm_studio_models(self):
        """Discover LM Studio models"""
        try:
            # Check LM Studio API endpoint
            async with aiohttp.ClientSession() as session:
                async with session.get("http://localhost:1234/v1/models") as response:
                    if response.status == 200:
                        data = await response.json()
                        for model in data.get("data", []):
                            model_name = model["id"]
                            if model_name not in self.models:
                                await self.add_model(
                                    name=model_name,
                                    model_type=LocalLLMType.LM_STUDIO,
                                    model_path=model_name,
                                    api_endpoint="http://localhost:1234/v1/chat/completions",
                                    parameters={
                                        "temperature": 0.7,
                                        "max_tokens": 2048
                                    }
                                )
        except Exception as e:
            logger.debug(f"LM Studio not available: {e}")
    
    async def _discover_textgen_webui_models(self):
        """Discover Text Generation WebUI models"""
        try:
            # Check Text Generation WebUI API
            async with aiohttp.ClientSession() as session:
                async with session.get("http://localhost:7860/api/v1/model") as response:
                    if response.status == 200:
                        data = await response.json()
                        model_name = data.get("model_name", "textgen_webui")
                        if model_name not in self.models:
                            await self.add_model(
                                name=model_name,
                                model_type=LocalLLMType.TEXT_GENERATION_WEBUI,
                                model_path=model_name,
                                api_endpoint="http://localhost:7860/api/v1/generate",
                                parameters={
                                    "temperature": 0.7,
                                    "top_p": 0.9,
                                    "max_new_tokens": 2048
                                }
                            )
        except Exception as e:
            logger.debug(f"Text Generation WebUI not available: {e}")
    
    async def _call_ollama_api(
        self,
        request: InferenceRequest,
        model: LocalModel
    ) -> Dict[str, Any]:
        """Call Ollama API"""
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "model": request.model_name,
                    "prompt": request.prompt,
                    "stream": False,
                    "options": {
                        "temperature": request.temperature,
                        "top_p": request.top_p,
                        "num_predict": request.max_tokens
                    }
                }
                
                async with session.post(
                    model.api_endpoint,
                    json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "content": result["response"],
                            "tokens_used": result.get("eval_count", 0),
                            "metadata": {
                                "model": request.model_name,
                                "type": "ollama"
                            }
                        }
                    else:
                        raise Exception(f"Ollama API error: {response.status}")
                        
        except Exception as e:
            logger.error(f"Ollama API call failed: {e}")
            raise
    
    async def _call_llama_cpp_api(
        self,
        request: InferenceRequest,
        model: LocalModel
    ) -> Dict[str, Any]:
        """Call llama.cpp API"""
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "prompt": request.prompt,
                    "n_predict": request.max_tokens,
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "stop": request.stop_sequences
                }
                
                async with session.post(
                    model.api_endpoint,
                    json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "content": result["content"],
                            "tokens_used": result.get("tokens_predicted", 0),
                            "metadata": {
                                "model": request.model_name,
                                "type": "llama_cpp"
                            }
                        }
                    else:
                        raise Exception(f"llama.cpp API error: {response.status}")
                        
        except Exception as e:
            logger.error(f"llama.cpp API call failed: {e}")
            raise
    
    async def _call_lm_studio_api(
        self,
        request: InferenceRequest,
        model: LocalModel
    ) -> Dict[str, Any]:
        """Call LM Studio API"""
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "model": request.model_name,
                    "messages": [{"role": "user", "content": request.prompt}],
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens,
                    "stream": False
                }
                
                async with session.post(
                    model.api_endpoint,
                    json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result["choices"][0]["message"]["content"]
                        return {
                            "content": content,
                            "tokens_used": result.get("usage", {}).get("total_tokens", 0),
                            "metadata": {
                                "model": request.model_name,
                                "type": "lm_studio"
                            }
                        }
                    else:
                        raise Exception(f"LM Studio API error: {response.status}")
                        
        except Exception as e:
            logger.error(f"LM Studio API call failed: {e}")
            raise
    
    async def _call_textgen_webui_api(
        self,
        request: InferenceRequest,
        model: LocalModel
    ) -> Dict[str, Any]:
        """Call Text Generation WebUI API"""
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "prompt": request.prompt,
                    "max_new_tokens": request.max_tokens,
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "stop": request.stop_sequences
                }
                
                async with session.post(
                    model.api_endpoint,
                    json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "content": result["results"][0]["text"],
                            "tokens_used": result.get("usage", {}).get("total_tokens", 0),
                            "metadata": {
                                "model": request.model_name,
                                "type": "textgen_webui"
                            }
                        }
                    else:
                        raise Exception(f"Text Generation WebUI API error: {response.status}")
                        
        except Exception as e:
            logger.error(f"Text Generation WebUI API call failed: {e}")
            raise
    
    async def _call_generic_api(
        self,
        request: InferenceRequest,
        model: LocalModel
    ) -> Dict[str, Any]:
        """Call generic API endpoint"""
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "prompt": request.prompt,
                    "max_tokens": request.max_tokens,
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "stop": request.stop_sequences
                }
                
                async with session.post(
                    model.api_endpoint,
                    json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "content": result.get("content", result.get("response", "")),
                            "tokens_used": result.get("tokens_used", 0),
                            "metadata": {
                                "model": request.model_name,
                                "type": "generic"
                            }
                        }
                    else:
                        raise Exception(f"Generic API error: {response.status}")
                        
        except Exception as e:
            logger.error(f"Generic API call failed: {e}")
            raise
    
    async def _test_model_connection(self, model: LocalModel) -> bool:
        """Test connection to a model"""
        try:
            # Create a simple test request
            test_request = InferenceRequest(
                prompt="Hello",
                model_name=model.name,
                max_tokens=10
            )
            
            # Try to generate a completion
            await self.generate_completion(test_request)
            return True
            
        except Exception as e:
            logger.debug(f"Model connection test failed for {model.name}: {e}")
            return False
    
    async def _health_monitor_loop(self):
        """Monitor health of all models"""
        while True:
            try:
                for model_name, model in self.models.items():
                    if model.status != LLMStatus.OFFLINE:
                        # Test connection
                        if not await self._test_model_connection(model):
                            model.status = LLMStatus.ERROR
                            logger.warning(f"Model {model_name} health check failed")
                        else:
                            if model.status == LLMStatus.ERROR:
                                model.status = LLMStatus.ONLINE
                                logger.info(f"Model {model_name} recovered")
                
                await asyncio.sleep(self.health_check_interval)
                
            except Exception as e:
                logger.error(f"Health monitor error: {e}")
                await asyncio.sleep(self.health_check_interval)
    
    async def _close_model_connection(self, model_name: str):
        """Close connection to a model"""
        if model_name in self.active_connections:
            try:
                # Close any active connections
                del self.active_connections[model_name]
            except Exception as e:
                logger.error(f"Failed to close connection for {model_name}: {e}") 