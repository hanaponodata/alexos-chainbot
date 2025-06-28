from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import json
import logging
from datetime import datetime

from ..db import SessionLocal
from ..models.workflow import Workflow
from ..models.user import User
from ..schemas.workflow import WorkflowCreate, WorkflowRead, WorkflowUpdate
from ..schemas.agent import AgentCreate, AgentResponse
from ..services.auth_dependencies import get_current_user
from ..services.workflow_engine import WorkflowEngine
from ..services.workflow_orchestrator import WorkflowOrchestrator
from ..services.websocket_manager import WebSocketManager, WindowType
from ..services.audit import log_action, AuditService
from ..services.ai_agent_manager import AIAgentManager, AgentType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])

# Global instances (in production, these should be dependency injected)
websocket_manager = WebSocketManager()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=WorkflowRead)
async def create_workflow(
    workflow: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new workflow"""
    try:
        # Create workflow
        db_workflow = Workflow(
            name=workflow.name,
            description=workflow.description,
            definition=workflow.definition,
            user_id=current_user.id,
            session_id=workflow.session_id,
            entanglement_id=workflow.entanglement_id,
            status=workflow.status
        )
        db.add(db_workflow)
        db.commit()
        db.refresh(db_workflow)
        
        # Log audit event
        log_action(
            db=db,
            action="workflow_created",
            actor_id=current_user.id,
            target_type="workflow",
            target_id=db_workflow.id,
            meta={"workflow_name": workflow.name}
        )
        
        return WorkflowRead.from_orm(db_workflow)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create workflow: {str(e)}"
        )

@router.get("/", response_model=List[WorkflowRead])
async def get_workflows(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workflows for the current user"""
    workflows = db.query(Workflow).filter(
        Workflow.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return [WorkflowRead.from_orm(w) for w in workflows]

@router.get("/{workflow_id}", response_model=WorkflowRead)
async def get_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific workflow by ID"""
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    return WorkflowRead.from_orm(workflow)

@router.put("/{workflow_id}", response_model=WorkflowRead)
async def update_workflow(
    workflow_id: int,
    workflow_update: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a workflow"""
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    try:
        # Update workflow
        update_data = workflow_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workflow, field, value)
        
        db.commit()
        db.refresh(workflow)
        
        # Log audit event
        log_action(
            db=db,
            action="workflow_updated",
            actor_id=current_user.id,
            target_type="workflow",
            target_id=workflow_id,
            meta={"workflow_name": workflow.name}
        )
        
        return WorkflowRead.from_orm(workflow)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update workflow: {str(e)}"
        )

@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workflow"""
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    try:
        db.delete(workflow)
        db.commit()
        
        # Log audit event
        log_action(
            db=db,
            action="workflow_deleted",
            actor_id=current_user.id,
            target_type="workflow",
            target_id=workflow_id,
            meta={"workflow_name": workflow.name}
        )
        
        return {"message": "Workflow deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete workflow: {str(e)}"
        )

@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: int,
    input_data: Dict[str, Any] = {},
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute a workflow"""
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    try:
        # Use the advanced workflow orchestrator
        audit_service = AuditService(db)
        orchestrator = WorkflowOrchestrator(db, websocket_manager, audit_service)
        execution_id = await orchestrator.execute_workflow(
            workflow_id=str(workflow_id),
            user_id=str(current_user.id),
            input_data=input_data
        )
        
        return {
            "execution_id": execution_id,
            "workflow_id": workflow_id,
            "status": "started",
            "message": "Workflow execution started successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to execute workflow: {str(e)}"
        )

@router.get("/{workflow_id}/status")
async def get_workflow_status(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current status of a workflow"""
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    engine = WorkflowEngine(db)
    status_info = engine.get_workflow_status(workflow_id)
    
    return {
        "workflow_id": workflow_id,
        "status": getattr(workflow, 'status', 'unknown'),
        "engine_status": status_info
    }

@router.post("/{workflow_id}/stop")
async def stop_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stop a running workflow"""
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.user_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    engine = WorkflowEngine(db)
    success = engine.stop_workflow(workflow_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop workflow"
        )
    
    return {"message": "Workflow stopped successfully"}

@router.get("/executions/active")
async def get_active_executions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active executions for the current user"""
    audit_service = AuditService(db)
    orchestrator = WorkflowOrchestrator(db, websocket_manager, audit_service)
    all_executions = orchestrator.get_all_executions()
    
    # Filter executions for current user's workflows
    user_workflow_ids = [
        str(w.id) for w in db.query(Workflow).filter(Workflow.user_id == current_user.id).all()
    ]
    
    user_executions = [
        exec_info for exec_info in all_executions
        if exec_info and exec_info.get('workflow_id') in user_workflow_ids
    ]
    
    return user_executions

@router.get("/templates")
async def get_workflow_templates(
    current_user: User = Depends(get_current_user)
):
    """Get available workflow templates"""
    templates = [
        {
            "id": "data-processing",
            "name": "Data Processing Pipeline",
            "description": "Process and transform data through multiple stages",
            "category": "data",
            "complexity": "intermediate"
        },
        {
            "id": "api-integration",
            "name": "API Integration Workflow",
            "description": "Integrate multiple APIs with error handling",
            "category": "integration",
            "complexity": "advanced"
        },
        {
            "id": "monitoring-alert",
            "name": "Monitoring and Alerting",
            "description": "Monitor systems and send alerts based on conditions",
            "category": "monitoring",
            "complexity": "beginner"
        },
        {
            "id": "agent-orchestration",
            "name": "Agent Orchestration",
            "description": "Coordinate multiple AI agents for complex tasks",
            "category": "ai",
            "complexity": "advanced"
        }
    ]
    
    return templates

@router.get("/templates/{template_id}")
async def get_workflow_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific workflow template"""
    templates = {
        "data-processing": {
            "id": "data-processing",
            "name": "Data Processing Pipeline",
            "description": "Process and transform data through multiple stages",
            "definition": {
                "name": "Data Processing Pipeline",
                "type": "sequential",
                "steps": [
                    {
                        "id": "extract",
                        "name": "Extract Data",
                        "type": "api_call",
                        "config": {
                            "url": "https://api.example.com/data",
                            "method": "GET"
                        }
                    },
                    {
                        "id": "transform",
                        "name": "Transform Data",
                        "type": "transform",
                        "config": {
                            "type": "template",
                            "input": "${extract.data}",
                            "template": "Processed: ${input}"
                        }
                    },
                    {
                        "id": "load",
                        "name": "Load Data",
                        "type": "api_call",
                        "config": {
                            "url": "https://api.example.com/upload",
                            "method": "POST",
                            "data": "${transform.transformed}"
                        }
                    }
                ]
            }
        },
        "api-integration": {
            "id": "api-integration",
            "name": "API Integration Workflow",
            "description": "Integrate multiple APIs with error handling",
            "definition": {
                "name": "API Integration Workflow",
                "type": "sequential",
                "steps": [
                    {
                        "id": "fetch_user",
                        "name": "Fetch User Data",
                        "type": "api_call",
                        "config": {
                            "url": "https://api.example.com/users/${user_id}",
                            "method": "GET"
                        }
                    },
                    {
                        "id": "check_status",
                        "name": "Check User Status",
                        "type": "condition",
                        "config": {
                            "condition": "${fetch_user.data.status == 'active'}"
                        }
                    },
                    {
                        "id": "process_user",
                        "name": "Process User",
                        "type": "api_call",
                        "config": {
                            "url": "https://api.example.com/process",
                            "method": "POST",
                            "data": "${fetch_user.data}"
                        }
                    }
                ]
            }
        }
    }
    
    template = templates.get(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return template

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time workflow updates"""
    await websocket_manager.connect(websocket)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "subscribe_execution":
                execution_id = message.get("execution_id")
                if execution_id:
                    # Simple subscription for now
                    await websocket.send_json({
                        "type": "subscribed",
                        "execution_id": execution_id
                    })
                    
            elif message.get("type") == "unsubscribe_execution":
                execution_id = message.get("execution_id")
                if execution_id:
                    # Simple unsubscription for now
                    await websocket.send_json({
                        "type": "unsubscribed",
                        "execution_id": execution_id
                    })
                    
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket)

@router.post("/visual", response_model=Dict[str, Any])
async def create_visual_workflow(
    workflow_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a visual workflow from GUI builder
    
    Expected payload:
    {
        "name": "Workflow Name",
        "description": "Workflow Description", 
        "nodes": [
            {
                "id": "node1",
                "type": "ai_agent",
                "agent_id": "agent123",
                "message": "Hello, how can I help?",
                "position": {"x": 100, "y": 100}
            },
            {
                "id": "node2", 
                "type": "condition",
                "condition": "response contains 'error'",
                "position": {"x": 300, "y": 100}
            }
        ],
        "edges": [
            {
                "id": "edge1",
                "source": "node1",
                "target": "node2"
            }
        ]
    }
    """
    try:
        workflow_name = workflow_data.get("name")
        workflow_description = workflow_data.get("description", "")
        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])
        
        if not workflow_name:
            raise HTTPException(status_code=400, detail="Workflow name is required")
        
        # Initialize services
        audit_service = AuditService(db)
        orchestrator = WorkflowOrchestrator(db, websocket_manager, audit_service)
        
        # Create visual workflow
        workflow_id = await orchestrator.create_visual_workflow(
            workflow_name=workflow_name,
            workflow_description=workflow_description,
            nodes=nodes,
            edges=edges,
            user_id=str(current_user.id),
            session_id=current_user.id  # Using user ID as session ID for now
        )
        
        return {
            "workflow_id": workflow_id,
            "name": workflow_name,
            "status": "created",
            "nodes_count": len(nodes),
            "edges_count": len(edges)
        }
        
    except Exception as e:
        logger.error(f"Failed to create visual workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/execute", response_model=Dict[str, Any])
async def execute_visual_workflow(
    workflow_id: str,
    execution_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute a visual workflow with intelligent routing
    
    Expected payload:
    {
        "input_data": {
            "user_input": "Hello world",
            "parameters": {"param1": "value1"}
        }
    }
    """
    try:
        input_data = execution_data.get("input_data", {})
        input_data.update({
            "user_id": current_user.id,
            "session_id": current_user.id
        })
        
        # Initialize services
        audit_service = AuditService(db)
        orchestrator = WorkflowOrchestrator(db, websocket_manager, audit_service)
        
        # Execute workflow
        execution_id = await orchestrator.execute_visual_workflow(
            workflow_id=workflow_id,
            input_data=input_data,
            user_id=str(current_user.id),
            session_id=current_user.id
        )
        
        return {
            "execution_id": execution_id,
            "workflow_id": workflow_id,
            "status": "started"
        }
        
    except Exception as e:
        logger.error(f"Failed to execute visual workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}/executions", response_model=List[Dict[str, Any]])
async def get_workflow_executions(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all executions for a workflow"""
    try:
        audit_service = AuditService(db)
        orchestrator = WorkflowOrchestrator(db, websocket_manager, audit_service)
        
        return []
        
    except Exception as e:
        logger.error(f"Failed to get workflow executions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}/conversation-history", response_model=List[Dict[str, Any]])
async def get_workflow_conversation_history(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get conversation history for a workflow"""
    try:
        audit_service = AuditService(db)
        orchestrator = WorkflowOrchestrator(db, websocket_manager, audit_service)
        
        return []
        
    except Exception as e:
        logger.error(f"Failed to get workflow conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# AI Agent Management Routes

@router.post("/agents", response_model=Dict[str, Any])
async def create_ai_agent(
    agent_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create an AI agent
    
    Expected payload:
    {
        "type": "chatgpt|custom_gpt|alex_os_agent|gpt5",
        "name": "Agent Name",
        "description": "Agent Description",
        "config": {
            "api_key": "sk-...",  // for ChatGPT
            "gpt_id": "gpt-123",  // for Custom GPT
            "agent_type": "supervisor"  // for ALEX OS agent
        }
    }
    """
    try:
        agent_type_str = agent_data.get("type")
        name = agent_data.get("name")
        description = agent_data.get("description", "")
        config = agent_data.get("config", {})
        
        if not agent_type_str or not name:
            raise HTTPException(status_code=400, detail="Agent type and name are required")
        
        # Convert string to enum
        try:
            agent_type = AgentType(agent_type_str)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid agent type: {agent_type_str}")
        
        # Initialize services
        audit_service = AuditService(db)
        agent_manager = AIAgentManager(db, audit_service)
        
        # Create agent
        agent_id = await agent_manager.create_agent(
            agent_type=agent_type,
            name=name,
            description=description,
            config=config,
            user_id=current_user.id,
            session_id=current_user.id
        )
        
        return {
            "agent_id": agent_id,
            "name": name,
            "type": agent_type_str,
            "status": "created"
        }
        
    except Exception as e:
        logger.error(f"Failed to create AI agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agents/chatgpt/connect", response_model=Dict[str, Any])
async def connect_chatgpt_account(
    connection_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Connect ChatGPT account
    
    Expected payload:
    {
        "api_key": "sk-..."
    }
    """
    try:
        api_key = connection_data.get("api_key")
        if not api_key:
            raise HTTPException(status_code=400, detail="API key is required")
        
        # Initialize services
        audit_service = AuditService(db)
        agent_manager = AIAgentManager(db, audit_service)
        
        # Connect account
        success = await agent_manager.connect_chatgpt_account(
            api_key=api_key,
            user_id=current_user.id,
            session_id=current_user.id
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to connect ChatGPT account")
        
        return {
            "status": "connected",
            "message": "ChatGPT account connected successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to connect ChatGPT account: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agents/custom-gpts/import", response_model=List[Dict[str, Any]])
async def import_custom_gpts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import Custom GPTs from user's ChatGPT account"""
    try:
        # Initialize services
        audit_service = AuditService(db)
        agent_manager = AIAgentManager(db, audit_service)
        
        # Import Custom GPTs
        imported_gpts = await agent_manager.import_custom_gpts(
            user_id=current_user.id,
            session_id=current_user.id
        )
        
        return imported_gpts
        
    except Exception as e:
        logger.error(f"Failed to import Custom GPTs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agents/{agent_id}/message", response_model=Dict[str, Any])
async def send_message_to_agent(
    agent_id: str,
    message_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a message to an AI agent
    
    Expected payload:
    {
        "message": "Hello, how are you?",
        "context": {
            "workflow_id": "workflow123",
            "session_data": {...}
        }
    }
    """
    try:
        message = message_data.get("message")
        context = message_data.get("context", {})
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Initialize services
        audit_service = AuditService(db)
        agent_manager = AIAgentManager(db, audit_service)
        
        # Send message
        response = await agent_manager.send_message_to_agent(
            agent_id=agent_id,
            message=message,
            user_id=current_user.id,
            session_id=current_user.id,
            context=context
        )
        
        return {
            "agent_id": agent_id,
            "response": response["content"],
            "metadata": response.get("metadata", {}),
            "timestamp": response.get("timestamp")
        }
        
    except Exception as e:
        logger.error(f"Failed to send message to agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agents", response_model=List[Dict[str, Any]])
async def get_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all available agents"""
    try:
        # Initialize services
        audit_service = AuditService(db)
        agent_manager = AIAgentManager(db, audit_service)
        
        # Get agents (this would need to be implemented in AIAgentManager)
        agents = []
        for agent_id, agent_info in agent_manager.active_agents.items():
            agent = agent_info["agent"]
            agents.append({
                "agent_id": agent_id,
                "name": agent.name,
                "type": agent.type,
                "status": agent_info["status"].value,
                "capabilities": [
                    {
                        "name": cap.name,
                        "description": cap.description,
                        "input_types": cap.input_types,
                        "output_types": cap.output_types
                    }
                    for cap in agent_info["capabilities"]
                ]
            })
        
        return agents
        
    except Exception as e:
        logger.error(f"Failed to get agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agents/{agent_id}/capabilities", response_model=List[Dict[str, Any]])
async def get_agent_capabilities(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get capabilities of a specific agent"""
    try:
        # Initialize services
        audit_service = AuditService(db)
        agent_manager = AIAgentManager(db, audit_service)
        
        # Get capabilities
        capabilities = await agent_manager.get_agent_capabilities(agent_id)
        
        return [
            {
                "name": cap.name,
                "description": cap.description,
                "input_types": cap.input_types,
                "output_types": cap.output_types,
                "parameters": cap.parameters
            }
            for cap in capabilities
        ]
        
    except Exception as e:
        logger.error(f"Failed to get agent capabilities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agents/{agent_id}/status", response_model=Dict[str, Any])
async def get_agent_status(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current status of an agent"""
    try:
        # Initialize services
        audit_service = AuditService(db)
        agent_manager = AIAgentManager(db, audit_service)
        
        # Get status
        status = await agent_manager.get_agent_status(agent_id)
        
        return {
            "agent_id": agent_id,
            "status": status.value,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get agent status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time workflow updates
@router.websocket("/ws/{session_id}")
async def workflow_websocket(
    websocket: WebSocket,
    session_id: int,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time workflow and agent updates"""
    try:
        connection_id = await websocket_manager.connect(websocket, WindowType.WORKFLOW_BUILDER)
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                message_type = message.get("type")
                
                if message_type == "subscribe_workflow":
                    workflow_id = message.get("workflow_id")
                    # await websocket_manager.subscribe_to_workflow(websocket, workflow_id)
                    
                elif message_type == "subscribe_agent":
                    agent_id = message.get("agent_id")
                    # await websocket_manager.subscribe_to_agent(websocket, agent_id)
                    
                elif message_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
        except WebSocketDisconnect:
            await websocket_manager.disconnect(connection_id)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass 