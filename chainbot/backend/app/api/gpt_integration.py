"""
GPT Integration API Routes

Provides endpoints for:
- OpenAI API integration
- MacLink local LLM integration
- Agent brain completion generation
- Provider status and health checks
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

from ..services.agent_brain import BrainRequest, BrainResponse, AgentPersona, CompletionProvider, AgentBrain
from ..services import get_agent_brain, get_openai_key_manager, get_maclink_manager
from ..services.auth_dependencies import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/gpt", tags=["gpt-integration"])

# Pydantic models for API requests/responses
class CompletionRequest(BaseModel):
    prompt: str
    agent_id: str
    provider: Optional[str] = None
    model: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None
    context_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class CompletionResponse(BaseModel):
    content: str
    provider: str
    model: str
    agent_id: str
    tokens_used: int
    processing_time: float
    confidence_score: float
    metadata: Dict[str, Any]

class PersonaRequest(BaseModel):
    name: str
    description: str
    system_prompt: str
    preferred_provider: str
    preferred_model: str
    temperature: float = 0.7
    max_tokens: int = 2048
    capabilities: List[str] = []

class ProviderStatusResponse(BaseModel):
    openai: Dict[str, Any]
    maclink: Dict[str, Any]

class HealthCheckResponse(BaseModel):
    overall: str
    providers: Dict[str, str]

def get_agent_brain_dependency():
    """Get agent brain instance"""
    agent_brain = get_agent_brain()
    if not agent_brain:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent brain not initialized"
        )
    return agent_brain

@router.post("/completion", response_model=CompletionResponse)
async def generate_completion(
    request: CompletionRequest,
    current_user: User = Depends(get_current_user),
    brain: AgentBrain = Depends(get_agent_brain_dependency)
):
    """Generate completion using agent brain"""
    try:
        # Convert provider string to enum
        provider = None
        if request.provider:
            try:
                provider = CompletionProvider(request.provider)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid provider: {request.provider}"
                )
        
        # Create brain request
        brain_request = BrainRequest(
            prompt=request.prompt,
            agent_id=request.agent_id,
            provider=provider,
            model=request.model,
            conversation_history=request.conversation_history or [],
            context_data=request.context_data or {},
            metadata=request.metadata or {}
        )
        
        # Generate completion
        brain_response = await brain.generate_completion(brain_request)
        
        # Convert to API response
        return CompletionResponse(
            content=brain_response.content,
            provider=brain_response.provider.value,
            model=brain_response.model,
            agent_id=brain_response.agent_id,
            tokens_used=brain_response.tokens_used,
            processing_time=brain_response.processing_time,
            confidence_score=brain_response.confidence_score,
            metadata=brain_response.metadata
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Completion generation failed: {str(e)}"
        )

@router.get("/providers/status", response_model=ProviderStatusResponse)
async def get_provider_status(
    brain: AgentBrain = Depends(get_agent_brain_dependency)
):
    """Get status of all providers"""
    try:
        status_data = brain.get_provider_status()
        return ProviderStatusResponse(**status_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get provider status: {str(e)}"
        )

@router.get("/health", response_model=HealthCheckResponse)
async def health_check(
    brain: AgentBrain = Depends(get_agent_brain_dependency)
):
    """Check health of all providers"""
    try:
        health_data = await brain.health_check()
        return HealthCheckResponse(**health_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )

@router.get("/personas")
async def list_personas(
    brain: AgentBrain = Depends(get_agent_brain_dependency)
):
    """List all available personas"""
    try:
        personas = brain.list_personas()
        return {
            "personas": [
                {
                    "name": p.name,
                    "description": p.description,
                    "preferred_provider": p.preferred_provider.value,
                    "preferred_model": p.preferred_model,
                    "temperature": p.temperature,
                    "max_tokens": p.max_tokens,
                    "capabilities": p.capabilities
                }
                for p in personas
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list personas: {str(e)}"
        )

@router.post("/personas")
async def add_persona(
    request: PersonaRequest,
    brain: AgentBrain = Depends(get_agent_brain_dependency)
):
    """Add a new persona"""
    try:
        # Convert provider string to enum
        try:
            provider = CompletionProvider(request.preferred_provider)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {request.preferred_provider}"
            )
        
        # Create persona
        persona = AgentPersona(
            name=request.name,
            description=request.description,
            system_prompt=request.system_prompt,
            preferred_provider=provider,
            preferred_model=request.preferred_model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            capabilities=request.capabilities
        )
        
        # Add to brain
        brain.add_persona(persona)
        
        return {"message": f"Persona {request.name} added successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add persona: {str(e)}"
        )

@router.get("/conversation/{agent_id}")
async def get_conversation_history(
    agent_id: str,
    brain: AgentBrain = Depends(get_agent_brain_dependency)
):
    """Get conversation history for an agent"""
    try:
        history = brain.get_conversation_history(agent_id)
        return {
            "agent_id": agent_id,
            "conversation_history": history
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation history: {str(e)}"
        )

@router.delete("/conversation/{agent_id}")
async def clear_conversation_history(
    agent_id: str,
    brain: AgentBrain = Depends(get_agent_brain_dependency)
):
    """Clear conversation history for an agent"""
    try:
        brain.clear_conversation_history(agent_id)
        return {"message": f"Conversation history cleared for agent {agent_id}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear conversation history: {str(e)}"
        )

@router.post("/openai/keys")
async def add_openai_key(
    key_id: str,
    api_key: str,
    organization_id: Optional[str] = None
):
    """Add OpenAI API key"""
    try:
        key_manager = get_openai_key_manager()
        if not key_manager:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI key manager not initialized"
            )
        
        success = key_manager.add_key(key_id, api_key, organization_id)
        if success:
            return {"message": f"OpenAI key {key_id} added successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add OpenAI key"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add OpenAI key: {str(e)}"
        )

@router.get("/openai/keys/status")
async def get_openai_key_status():
    """Get OpenAI key status"""
    try:
        key_manager = get_openai_key_manager()
        if not key_manager:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI key manager not initialized"
            )
        
        return key_manager.get_key_status()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get OpenAI key status: {str(e)}"
        )

@router.post("/openai/keys/rotate")
async def rotate_openai_key():
    """Rotate OpenAI API key"""
    try:
        key_manager = get_openai_key_manager()
        if not key_manager:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI key manager not initialized"
            )
        
        success = key_manager.rotate_key()
        if success:
            return {"message": "OpenAI key rotated successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No additional keys available for rotation"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rotate OpenAI key: {str(e)}"
        )

@router.post("/maclink/connections")
async def add_maclink_connection(
    client_id: str,
    macbook_url: str,
    api_key: Optional[str] = None
):
    """Add MacLink connection"""
    try:
        connection_manager = get_maclink_manager()
        if not connection_manager:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="MacLink manager not initialized"
            )
        
        success = connection_manager.add_connection(client_id, macbook_url, api_key)
        if success:
            return {"message": f"MacLink connection {client_id} added successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add MacLink connection"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add MacLink connection: {str(e)}"
        )

@router.get("/maclink/connections/status")
async def get_maclink_connection_status():
    """Get MacLink connection status"""
    try:
        connection_manager = get_maclink_manager()
        if not connection_manager:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="MacLink manager not initialized"
            )
        
        return connection_manager.get_connection_status()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get MacLink connection status: {str(e)}"
        )

@router.get("/maclink/models")
async def get_maclink_models():
    """Get available MacLink models"""
    try:
        from ..services import get_maclink_client
        
        maclink_client = get_maclink_client()
        if not maclink_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="MacLink client not initialized"
            )
        
        models = await maclink_client.get_available_models()
        return {
            "models": [
                {
                    "name": model.name,
                    "type": model.type.value,
                    "status": model.status,
                    "capabilities": model.capabilities
                }
                for model in models
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get MacLink models: {str(e)}"
        ) 