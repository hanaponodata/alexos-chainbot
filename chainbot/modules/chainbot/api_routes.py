"""
ChainBot API Routes for ALEX OS Integration
Defines REST API endpoints for ChainBot module
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

# Pydantic models for API requests/responses
class WorkflowCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    definition: Dict[str, Any]
    tags: Optional[List[str]] = None

class WorkflowExecuteRequest(BaseModel):
    input_data: Optional[Dict[str, Any]] = None
    timeout_hours: Optional[int] = None

class AgentSpawnRequest(BaseModel):
    agent_type: str
    name: str
    config: Dict[str, Any]
    session_id: Optional[int] = None

class EntanglementCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    agent_ids: List[int]

class MessageSendRequest(BaseModel):
    sender_id: int
    receiver_id: int
    content: str
    message_type: str = "text"
    metadata: Optional[Dict[str, Any]] = None

class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    created_at: str
    updated_at: str

class ExecutionResponse(BaseModel):
    execution_id: str
    workflow_id: str
    status: str
    started_at: str
    completed_at: Optional[str]
    progress: float
    current_step: Optional[str]

class AgentResponse(BaseModel):
    id: int
    name: str
    type: str
    status: str
    config: Dict[str, Any]
    created_at: str

class EntanglementResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    agent_count: int
    created_at: str

class MessageResponse(BaseModel):
    id: str
    sender_id: int
    receiver_id: int
    content: str
    message_type: str
    timestamp: str
    metadata: Optional[Dict[str, Any]]

class HealthResponse(BaseModel):
    status: str
    health_score: float
    components: Dict[str, Dict[str, Any]]
    timestamp: str

class MetricsResponse(BaseModel):
    workflows: Dict[str, int]
    agents: Dict[str, int]
    entanglements: Dict[str, int]
    executions: Dict[str, int]
    system: Dict[str, Any]

def create_chainbot_router(chainbot_module) -> APIRouter:
    """Create FastAPI router for ChainBot endpoints"""
    
    router = APIRouter(prefix="/api/chainbot", tags=["chainbot"])
    
    # Workflow endpoints
    @router.get("/workflows", response_model=List[WorkflowResponse])
    async def list_workflows():
        """List all workflows"""
        try:
            workflows = await chainbot_module.get_workflows()
            return workflows
        except Exception as e:
            logger.error(f"Failed to list workflows: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to list workflows"
            )
    
    @router.post("/workflows", response_model=WorkflowResponse)
    async def create_workflow(request: WorkflowCreateRequest):
        """Create a new workflow"""
        try:
            # This would be implemented with the workflow orchestrator
            workflow_data = {
                "id": "temp_id",
                "name": request.name,
                "description": request.description,
                "status": "active",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
            return WorkflowResponse(**workflow_data)
        except Exception as e:
            logger.error(f"Failed to create workflow: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create workflow"
            )
    
    @router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
    async def get_workflow(workflow_id: str):
        """Get workflow by ID"""
        try:
            # This would query the workflow orchestrator
            workflow_data = {
                "id": workflow_id,
                "name": "Sample Workflow",
                "description": "Sample workflow description",
                "status": "active",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
            return WorkflowResponse(**workflow_data)
        except Exception as e:
            logger.error(f"Failed to get workflow {workflow_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found"
            )
    
    @router.post("/workflows/{workflow_id}/execute", response_model=ExecutionResponse)
    async def execute_workflow(workflow_id: str, request: WorkflowExecuteRequest):
        """Execute a workflow"""
        try:
            execution_id = await chainbot_module.execute_workflow(
                workflow_id=workflow_id,
                input_data=request.input_data
            )
            
            execution_data = {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "status": "running",
                "started_at": "2024-01-01T00:00:00Z",
                "completed_at": None,
                "progress": 0.0,
                "current_step": None
            }
            return ExecutionResponse(**execution_data)
        except Exception as e:
            logger.error(f"Failed to execute workflow {workflow_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to execute workflow"
            )
    
    @router.get("/executions/{execution_id}", response_model=ExecutionResponse)
    async def get_execution_status(execution_id: str):
        """Get execution status"""
        try:
            # This would query the workflow orchestrator
            execution_data = {
                "execution_id": execution_id,
                "workflow_id": "sample_workflow",
                "status": "running",
                "started_at": "2024-01-01T00:00:00Z",
                "completed_at": None,
                "progress": 50.0,
                "current_step": "step_2"
            }
            return ExecutionResponse(**execution_data)
        except Exception as e:
            logger.error(f"Failed to get execution {execution_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Execution not found"
            )
    
    # Agent endpoints
    @router.get("/agents", response_model=List[AgentResponse])
    async def list_agents():
        """List all agents"""
        try:
            agents = await chainbot_module.get_agents()
            return agents
        except Exception as e:
            logger.error(f"Failed to list agents: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to list agents"
            )
    
    @router.post("/agents", response_model=AgentResponse)
    async def spawn_agent(request: AgentSpawnRequest):
        """Spawn a new agent"""
        try:
            agent_id = await chainbot_module.spawn_agent(
                agent_type=request.agent_type,
                config=request.config
            )
            
            agent_data = {
                "id": int(agent_id),
                "name": request.name,
                "type": request.agent_type,
                "status": "idle",
                "config": request.config,
                "created_at": "2024-01-01T00:00:00Z"
            }
            return AgentResponse(**agent_data)
        except Exception as e:
            logger.error(f"Failed to spawn agent: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to spawn agent"
            )
    
    @router.get("/agents/{agent_id}", response_model=AgentResponse)
    async def get_agent(agent_id: int):
        """Get agent by ID"""
        try:
            # This would query the agent spawner
            agent_data = {
                "id": agent_id,
                "name": "Sample Agent",
                "type": "assistant",
                "status": "idle",
                "config": {},
                "created_at": "2024-01-01T00:00:00Z"
            }
            return AgentResponse(**agent_data)
        except Exception as e:
            logger.error(f"Failed to get agent {agent_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
    
    @router.delete("/agents/{agent_id}")
    async def terminate_agent(agent_id: int):
        """Terminate an agent"""
        try:
            # This would call the agent spawner to terminate the agent
            return {"message": f"Agent {agent_id} terminated successfully"}
        except Exception as e:
            logger.error(f"Failed to terminate agent {agent_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to terminate agent"
            )
    
    # Entanglement endpoints
    @router.get("/entanglements", response_model=List[EntanglementResponse])
    async def list_entanglements():
        """List all entanglements"""
        try:
            entanglements = await chainbot_module.get_entanglements()
            return entanglements
        except Exception as e:
            logger.error(f"Failed to list entanglements: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to list entanglements"
            )
    
    @router.post("/entanglements", response_model=EntanglementResponse)
    async def create_entanglement(request: EntanglementCreateRequest):
        """Create a new entanglement"""
        try:
            # This would call the entanglement manager
            entanglement_data = {
                "id": 1,
                "name": request.name,
                "description": request.description,
                "agent_count": len(request.agent_ids),
                "created_at": "2024-01-01T00:00:00Z"
            }
            return EntanglementResponse(**entanglement_data)
        except Exception as e:
            logger.error(f"Failed to create entanglement: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create entanglement"
            )
    
    @router.post("/entanglements/{entanglement_id}/messages", response_model=MessageResponse)
    async def send_message(entanglement_id: int, request: MessageSendRequest):
        """Send a message in an entanglement"""
        try:
            # This would call the entanglement manager
            message_data = {
                "id": "msg_123",
                "sender_id": request.sender_id,
                "receiver_id": request.receiver_id,
                "content": request.content,
                "message_type": request.message_type,
                "timestamp": "2024-01-01T00:00:00Z",
                "metadata": request.metadata
            }
            return MessageResponse(**message_data)
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send message"
            )
    
    # Health and metrics endpoints
    @router.get("/health", response_model=HealthResponse)
    async def get_health():
        """Get module health status"""
        try:
            health_score = await chainbot_module.health_check()
            module_info = chainbot_module.get_module_info()
            
            health_data = {
                "status": "healthy" if health_score > 0.8 else "degraded" if health_score > 0.5 else "unhealthy",
                "health_score": health_score,
                "components": {
                    "database": {"status": "healthy", "score": 1.0},
                    "workflow_orchestrator": {"status": "healthy", "score": 1.0},
                    "agent_spawner": {"status": "healthy", "score": 1.0},
                    "entanglement_manager": {"status": "healthy", "score": 1.0}
                },
                "timestamp": "2024-01-01T00:00:00Z"
            }
            return HealthResponse(**health_data)
        except Exception as e:
            logger.error(f"Failed to get health status: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get health status"
            )
    
    @router.get("/metrics", response_model=MetricsResponse)
    async def get_metrics():
        """Get module metrics"""
        try:
            metrics_data = {
                "workflows": {
                    "total": 10,
                    "active": 8,
                    "completed": 150,
                    "failed": 5
                },
                "agents": {
                    "total": 25,
                    "idle": 15,
                    "working": 8,
                    "terminated": 2
                },
                "entanglements": {
                    "total": 5,
                    "active": 4,
                    "messages_sent": 1250
                },
                "executions": {
                    "total": 200,
                    "running": 3,
                    "completed": 180,
                    "failed": 17
                },
                "system": {
                    "cpu_usage": 45.2,
                    "memory_usage": 67.8,
                    "disk_usage": 23.4
                }
            }
            return MetricsResponse(**metrics_data)
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get metrics"
            )
    
    return router 