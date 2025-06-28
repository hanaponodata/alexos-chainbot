"""
Agent Brain Service for ChainBot

Unified completion generation service that integrates:
- OpenAI GPT models (remote)
- MacLink local LLMs (local)
- Conversation history and context management
- Persona and prompt engineering
- Response validation and retry logic
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from .openai_client import OpenAIClient, CompletionRequest as OpenAIRequest, CompletionResponse as OpenAIResponse, GPTModel, OpenAIError
from .maclink_client import MacLinkClient, MacLinkRequest, MacLinkResponse, MacLinkError

logger = logging.getLogger(__name__)

class CompletionProvider(Enum):
    """Available completion providers"""
    OPENAI = "openai"
    MACLINK = "maclink"

@dataclass
class AgentPersona:
    """Agent persona configuration"""
    name: str
    description: str
    system_prompt: str
    preferred_provider: CompletionProvider
    preferred_model: str
    temperature: float = 0.7
    max_tokens: int = 2048
    capabilities: List[str] = field(default_factory=list)

@dataclass
class BrainRequest:
    """Unified brain request"""
    prompt: str
    agent_id: str
    persona: Optional[AgentPersona] = None
    provider: Optional[CompletionProvider] = None
    model: Optional[str] = None
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    context_data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BrainResponse:
    """Unified brain response"""
    content: str
    provider: CompletionProvider
    model: str
    agent_id: str
    tokens_used: int
    processing_time: float
    confidence_score: float
    metadata: Dict[str, Any] = field(default_factory=dict)

class BrainError(Exception):
    """Brain service error"""
    def __init__(self, message: str, provider: Optional[CompletionProvider] = None):
        super().__init__(message)
        self.provider = provider

class AgentBrain:
    """
    Unified agent brain service
    
    Features:
    - Multi-provider completion generation (OpenAI + MacLink)
    - Persona management and prompt engineering
    - Conversation history and context management
    - Intelligent provider selection and fallback
    - Response validation and quality assessment
    - Performance monitoring and optimization
    """
    
    def __init__(self):
        self.openai_client: Optional[OpenAIClient] = None
        self.maclink_client: Optional[MacLinkClient] = None
        self.personas: Dict[str, AgentPersona] = {}
        self.conversation_store: Dict[str, List[Dict[str, str]]] = {}
        self.provider_stats: Dict[CompletionProvider, Dict[str, Any]] = {
            CompletionProvider.OPENAI: {"requests": 0, "errors": 0, "avg_response_time": 0},
            CompletionProvider.MACLINK: {"requests": 0, "errors": 0, "avg_response_time": 0}
        }
        
        # Initialize default personas
        self._initialize_default_personas()
    
    def _initialize_default_personas(self):
        """Initialize default agent personas"""
        default_personas = [
            AgentPersona(
                name="general_assistant",
                description="General purpose AI assistant",
                system_prompt="You are a helpful AI assistant. Provide clear, accurate, and helpful responses.",
                preferred_provider=CompletionProvider.OPENAI,
                preferred_model="gpt-4o",
                temperature=0.7,
                max_tokens=2048,
                capabilities=["general_knowledge", "conversation", "problem_solving"]
            ),
            AgentPersona(
                name="code_assistant",
                description="Specialized coding assistant",
                system_prompt="You are an expert software developer. Write clean, efficient, and well-documented code. Follow best practices and provide explanations for your solutions.",
                preferred_provider=CompletionProvider.OPENAI,
                preferred_model="gpt-4o",
                temperature=0.3,
                max_tokens=4096,
                capabilities=["coding", "debugging", "code_review", "architecture"]
            ),
            AgentPersona(
                name="creative_writer",
                description="Creative writing and storytelling assistant",
                system_prompt="You are a creative writer with a vivid imagination. Create engaging stories, poems, and creative content.",
                preferred_provider=CompletionProvider.MACLINK,
                preferred_model="llama2",
                temperature=0.9,
                max_tokens=2048,
                capabilities=["creative_writing", "storytelling", "poetry", "character_development"]
            ),
            AgentPersona(
                name="analyst",
                description="Data analysis and research assistant",
                system_prompt="You are a data analyst and researcher. Provide detailed analysis, insights, and evidence-based recommendations.",
                preferred_provider=CompletionProvider.OPENAI,
                preferred_model="gpt-4o",
                temperature=0.2,
                max_tokens=3072,
                capabilities=["data_analysis", "research", "critical_thinking", "reporting"]
            )
        ]
        
        for persona in default_personas:
            self.personas[persona.name] = persona
    
    async def initialize(self, openai_api_key: Optional[str] = None, maclink_url: Optional[str] = None):
        """Initialize the brain with providers"""
        # Initialize OpenAI client
        if openai_api_key:
            try:
                self.openai_client = OpenAIClient(openai_api_key)
                await self.openai_client.initialize()
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
        
        # Initialize MacLink client
        if maclink_url:
            try:
                self.maclink_client = MacLinkClient(maclink_url)
                await self.maclink_client.initialize()
                logger.info("MacLink client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize MacLink client: {e}")
    
    async def cleanup(self):
        """Clean up resources"""
        if self.openai_client:
            await self.openai_client.cleanup()
        
        if self.maclink_client:
            await self.maclink_client.cleanup()
    
    async def generate_completion(self, request: BrainRequest) -> BrainResponse:
        """Generate completion using the best available provider"""
        start_time = time.time()
        
        # Determine provider and model
        provider, model = self._select_provider_and_model(request)
        
        # Prepare conversation history
        conversation_history = self._prepare_conversation_history(request.agent_id, request.conversation_history)
        
        # Generate completion based on provider
        if provider == CompletionProvider.OPENAI:
            response = await self._generate_openai_completion(request, model, conversation_history)
        elif provider == CompletionProvider.MACLINK:
            response = await self._generate_maclink_completion(request, model, conversation_history)
        else:
            raise BrainError(f"Unsupported provider: {provider}")
        
        # Update conversation history
        self._update_conversation_history(request.agent_id, request.prompt, response.content)
        
        # Update provider statistics
        self._update_provider_stats(provider, time.time() - start_time)
        
        return response
    
    def _select_provider_and_model(self, request: BrainRequest) -> tuple[CompletionProvider, str]:
        """Select the best provider and model for the request"""
        # Use explicit provider if specified
        if request.provider:
            provider = request.provider
        elif request.persona:
            provider = request.persona.preferred_provider
        else:
            # Default to OpenAI if available, otherwise MacLink
            provider = CompletionProvider.OPENAI if self.openai_client else CompletionProvider.MACLINK
        
        # Use explicit model if specified
        if request.model:
            model = request.model
        elif request.persona:
            model = request.persona.preferred_model
        else:
            # Default models
            if provider == CompletionProvider.OPENAI:
                model = "gpt-4o"
            else:
                model = "llama2"
        
        # Validate provider availability
        if provider == CompletionProvider.OPENAI and not self.openai_client:
            if self.maclink_client:
                logger.warning("OpenAI not available, falling back to MacLink")
                provider = CompletionProvider.MACLINK
            else:
                raise BrainError("No completion providers available")
        
        if provider == CompletionProvider.MACLINK and not self.maclink_client:
            if self.openai_client:
                logger.warning("MacLink not available, falling back to OpenAI")
                provider = CompletionProvider.OPENAI
            else:
                raise BrainError("No completion providers available")
        
        return provider, model
    
    async def _generate_openai_completion(
        self,
        request: BrainRequest,
        model: str,
        conversation_history: List[Dict[str, str]]
    ) -> BrainResponse:
        """Generate completion using OpenAI"""
        if not self.openai_client:
            raise BrainError("OpenAI client not initialized", CompletionProvider.OPENAI)
        
        try:
            # Prepare OpenAI request
            openai_request = OpenAIRequest(
                prompt=request.prompt,
                model=GPTModel(model) if hasattr(GPTModel, model.upper().replace("-", "_")) else GPTModel.GPT_4O,
                max_tokens=request.persona.max_tokens if request.persona else 2048,
                temperature=request.persona.temperature if request.persona else 0.7,
                system_message=request.persona.system_prompt if request.persona else None,
                conversation_history=conversation_history
            )
            
            # Generate completion
            openai_response = await self.openai_client.generate_completion(openai_request)
            
            # Calculate confidence score (simplified)
            confidence_score = self._calculate_confidence_score(openai_response.content)
            
            return BrainResponse(
                content=openai_response.content,
                provider=CompletionProvider.OPENAI,
                model=model,
                agent_id=request.agent_id,
                tokens_used=openai_response.tokens_used,
                processing_time=openai_response.processing_time,
                confidence_score=confidence_score,
                metadata={
                    "finish_reason": openai_response.finish_reason,
                    "openai_metadata": openai_response.metadata
                }
            )
            
        except OpenAIError as e:
            logger.error(f"OpenAI completion error: {e}")
            raise BrainError(f"OpenAI error: {str(e)}", CompletionProvider.OPENAI)
        except Exception as e:
            logger.error(f"Unexpected OpenAI error: {e}")
            raise BrainError(f"Unexpected error: {str(e)}", CompletionProvider.OPENAI)
    
    async def _generate_maclink_completion(
        self,
        request: BrainRequest,
        model: str,
        conversation_history: List[Dict[str, str]]
    ) -> BrainResponse:
        """Generate completion using MacLink"""
        if not self.maclink_client:
            raise BrainError("MacLink client not initialized", CompletionProvider.MACLINK)
        
        try:
            # Prepare MacLink request
            maclink_request = MacLinkRequest(
                prompt=request.prompt,
                model_name=model,
                max_tokens=request.persona.max_tokens if request.persona else 2048,
                temperature=request.persona.temperature if request.persona else 0.7,
                system_message=request.persona.system_prompt if request.persona else None,
                conversation_history=conversation_history
            )
            
            # Generate completion
            maclink_response = await self.maclink_client.generate_completion(maclink_request)
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence_score(maclink_response.content)
            
            return BrainResponse(
                content=maclink_response.content,
                provider=CompletionProvider.MACLINK,
                model=model,
                agent_id=request.agent_id,
                tokens_used=maclink_response.tokens_used,
                processing_time=maclink_response.processing_time,
                confidence_score=confidence_score,
                metadata={
                    "maclink_metadata": maclink_response.metadata
                }
            )
            
        except MacLinkError as e:
            logger.error(f"MacLink completion error: {e}")
            raise BrainError(f"MacLink error: {str(e)}", CompletionProvider.MACLINK)
        except Exception as e:
            logger.error(f"Unexpected MacLink error: {e}")
            raise BrainError(f"Unexpected error: {str(e)}", CompletionProvider.MACLINK)
    
    def _prepare_conversation_history(self, agent_id: str, additional_history: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Prepare conversation history for the request"""
        # Get stored conversation history
        stored_history = self.conversation_store.get(agent_id, [])
        
        # Combine with additional history
        full_history = stored_history + additional_history
        
        # Limit history length to prevent token overflow
        max_history_length = 20  # Adjust based on model context limits
        if len(full_history) > max_history_length:
            full_history = full_history[-max_history_length:]
        
        return full_history
    
    def _update_conversation_history(self, agent_id: str, user_message: str, assistant_response: str):
        """Update conversation history for an agent"""
        if agent_id not in self.conversation_store:
            self.conversation_store[agent_id] = []
        
        # Add the new exchange
        self.conversation_store[agent_id].extend([
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_response}
        ])
        
        # Limit history length
        max_history_length = 20
        if len(self.conversation_store[agent_id]) > max_history_length:
            self.conversation_store[agent_id] = self.conversation_store[agent_id][-max_history_length:]
    
    def _calculate_confidence_score(self, content: str) -> float:
        """Calculate confidence score for a response (simplified)"""
        # Simple heuristic-based confidence scoring
        score = 0.5  # Base score
        
        # Length factor
        if len(content) > 50:
            score += 0.1
        
        # Completeness factor (check for incomplete sentences)
        if content.strip().endswith(('.', '!', '?')):
            score += 0.1
        
        # Coherence factor (check for repeated words)
        words = content.lower().split()
        if len(words) > 10:
            unique_words = len(set(words))
            word_diversity = unique_words / len(words)
            score += word_diversity * 0.2
        
        return min(score, 1.0)
    
    def _update_provider_stats(self, provider: CompletionProvider, response_time: float):
        """Update provider statistics"""
        stats = self.provider_stats[provider]
        stats["requests"] += 1
        
        # Update average response time
        current_avg = stats["avg_response_time"]
        request_count = stats["requests"]
        stats["avg_response_time"] = (current_avg * (request_count - 1) + response_time) / request_count
    
    def add_persona(self, persona: AgentPersona):
        """Add a new persona"""
        self.personas[persona.name] = persona
        logger.info(f"Added persona: {persona.name}")
    
    def get_persona(self, name: str) -> Optional[AgentPersona]:
        """Get a persona by name"""
        return self.personas.get(name)
    
    def list_personas(self) -> List[AgentPersona]:
        """List all available personas"""
        return list(self.personas.values())
    
    def clear_conversation_history(self, agent_id: str):
        """Clear conversation history for an agent"""
        if agent_id in self.conversation_store:
            del self.conversation_store[agent_id]
    
    def get_conversation_history(self, agent_id: str) -> List[Dict[str, str]]:
        """Get conversation history for an agent"""
        return self.conversation_store.get(agent_id, [])
    
    def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all providers"""
        return {
            "openai": {
                "available": self.openai_client is not None,
                "stats": self.provider_stats[CompletionProvider.OPENAI]
            },
            "maclink": {
                "available": self.maclink_client is not None,
                "stats": self.provider_stats[CompletionProvider.MACLINK]
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all providers"""
        health_status = {
            "overall": "healthy",
            "providers": {}
        }
        
        # Check OpenAI
        if self.openai_client:
            try:
                # Simple health check - try to list models
                await self.openai_client.list_models()
                health_status["providers"]["openai"] = "healthy"
            except Exception as e:
                health_status["providers"]["openai"] = f"unhealthy: {str(e)}"
                health_status["overall"] = "degraded"
        else:
            health_status["providers"]["openai"] = "not_configured"
        
        # Check MacLink
        if self.maclink_client:
            try:
                is_healthy = await self.maclink_client.health_check()
                health_status["providers"]["maclink"] = "healthy" if is_healthy else "unhealthy"
                if not is_healthy:
                    health_status["overall"] = "degraded"
            except Exception as e:
                health_status["providers"]["maclink"] = f"unhealthy: {str(e)}"
                health_status["overall"] = "degraded"
        else:
            health_status["providers"]["maclink"] = "not_configured"
        
        return health_status 