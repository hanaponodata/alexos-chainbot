#!/usr/bin/env python3
"""
ChainBot ALEX OS API Routes

This module provides REST API endpoints for ALEX OS integration,
including health monitoring, metrics, and module management.
"""

import asyncio
import logging
import os
import sys
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime, timedelta

# Add the backend directory to the Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import psutil

# Import ChainBot module
from chainbot_module import chainbot_module

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/chainbot", tags=["chainbot"])

# Pydantic models for API responses
class HealthResponse(BaseModel):
    status: str
    health_score: float
    timestamp: datetime
    checks: Dict[str, Any]
    version: str

class MetricsResponse(BaseModel):
    timestamp: datetime
    system_metrics: Dict[str, Any]
    module_metrics: Dict[str, Any]
    performance_metrics: Dict[str, Any]

class ModuleInfoResponse(BaseModel):
    name: str
    version: str
    description: str
    status: str
    health_score: float
    capabilities: List[str]
    api_endpoints: Dict[str, str]
    event_topics: Dict[str, List[str]]

class WorkflowListResponse(BaseModel):
    workflows: List[Dict[str, Any]]
    total_count: int
    active_count: int

class AgentListResponse(BaseModel):
    agents: List[Dict[str, Any]]
    total_count: int
    active_count: int

class ExecutionRequest(BaseModel):
    workflow_id: str
    parameters: Optional[Dict[str, Any]] = None
    priority: Optional[str] = "normal"

class ExecutionResponse(BaseModel):
    execution_id: str
    workflow_id: str
    status: str
    started_at: datetime
    estimated_duration: Optional[int] = None

# Health check functions
async def check_database_health() -> Dict[str, Any]:
    """Check database connectivity and health"""
    try:
        # This would use the actual database connection
        # For now, return a mock response
        return {
            "status": "healthy",
            "response_time_ms": 15,
            "connections": 5,
            "last_error": None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "response_time_ms": None,
            "connections": 0,
            "last_error": str(e)
        }

async def check_workflow_engine_health() -> Dict[str, Any]:
    """Check workflow engine health"""
    try:
        # This would check the actual workflow orchestrator
        return {
            "status": "healthy",
            "active_workflows": 3,
            "queued_workflows": 1,
            "failed_workflows": 0,
            "last_error": None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "active_workflows": 0,
            "queued_workflows": 0,
            "failed_workflows": 0,
            "last_error": str(e)
        }

async def check_agent_manager_health() -> Dict[str, Any]:
    """Check agent manager health"""
    try:
        # This would check the actual agent spawner
        return {
            "status": "healthy",
            "active_agents": 8,
            "total_agents": 12,
            "agent_types": ["assistant", "data_processor", "api", "workflow"],
            "last_error": None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "active_agents": 0,
            "total_agents": 0,
            "agent_types": [],
            "last_error": str(e)
        }

async def check_websocket_health() -> Dict[str, Any]:
    """Check WebSocket manager health"""
    try:
        # This would check the actual WebSocket manager
        return {
            "status": "healthy",
            "active_connections": 5,
            "total_connections": 25,
            "last_error": None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "active_connections": 0,
            "total_connections": 0,
            "last_error": str(e)
        }

async def check_system_health() -> Dict[str, Any]:
    """Check system resource health"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "status": "healthy" if cpu_percent < 80 and memory.percent < 80 else "warning",
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent,
            "load_average": os.getloadavg() if hasattr(os, 'getloadavg') else None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# API Endpoints

@router.get("/health", response_model=HealthResponse)
async def get_health():
    """
    Get comprehensive health status of the ChainBot module
    
    Returns:
        HealthResponse: Detailed health information
    """
    try:
        # Perform health checks
        health_checks = {
            "database": await check_database_health(),
            "workflow_engine": await check_workflow_engine_health(),
            "agent_manager": await check_agent_manager_health(),
            "websocket": await check_websocket_health(),
            "system": await check_system_health()
        }
        
        # Calculate overall health score
        healthy_checks = sum(1 for check in health_checks.values() if check.get("status") == "healthy")
        total_checks = len(health_checks)
        health_score = healthy_checks / total_checks if total_checks > 0 else 0.0
        
        # Determine overall status
        if health_score >= 0.8:
            status = "healthy"
        elif health_score >= 0.5:
            status = "warning"
        else:
            status = "unhealthy"
        
        return HealthResponse(
            status=status,
            health_score=health_score,
            timestamp=datetime.utcnow(),
            checks=health_checks,
            version=chainbot_module.version
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """
    Get detailed metrics for the ChainBot module
    
    Returns:
        MetricsResponse: Comprehensive metrics data
    """
    try:
        # System metrics
        system_metrics = {
            "cpu": {
                "percent": psutil.cpu_percent(interval=1),
                "count": psutil.cpu_count(),
                "frequency": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
            },
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "percent": psutil.virtual_memory().percent,
                "used": psutil.virtual_memory().used
            },
            "disk": {
                "total": psutil.disk_usage('/').total,
                "used": psutil.disk_usage('/').used,
                "free": psutil.disk_usage('/').free,
                "percent": psutil.disk_usage('/').percent
            },
            "network": {
                "bytes_sent": psutil.net_io_counters().bytes_sent,
                "bytes_recv": psutil.net_io_counters().bytes_recv,
                "packets_sent": psutil.net_io_counters().packets_sent,
                "packets_recv": psutil.net_io_counters().packets_recv
            }
        }
        
        # Module metrics (mock data for now)
        module_metrics = {
            "workflows": {
                "total": 15,
                "active": 3,
                "completed": 12,
                "failed": 0,
                "avg_execution_time": 45.2
            },
            "agents": {
                "total": 12,
                "active": 8,
                "idle": 4,
                "by_type": {
                    "assistant": 5,
                    "data_processor": 3,
                    "api": 2,
                    "workflow": 2
                }
            },
            "entanglements": {
                "total": 8,
                "active": 6,
                "completed": 2
            },
            "api_requests": {
                "total": 1250,
                "successful": 1180,
                "failed": 70,
                "avg_response_time": 125.5
            }
        }
        
        # Performance metrics
        performance_metrics = {
            "uptime": {
                "seconds": (datetime.utcnow() - datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds(),
                "formatted": "8h 32m 15s"
            },
            "response_times": {
                "avg": 125.5,
                "p95": 245.2,
                "p99": 456.8
            },
            "error_rate": {
                "percentage": 5.6,
                "total_errors": 70,
                "error_types": {
                    "database": 15,
                    "workflow": 25,
                    "agent": 20,
                    "network": 10
                }
            }
        }
        
        return MetricsResponse(
            timestamp=datetime.utcnow(),
            system_metrics=system_metrics,
            module_metrics=module_metrics,
            performance_metrics=performance_metrics
        )
        
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Metrics collection failed: {str(e)}")

@router.get("/info", response_model=ModuleInfoResponse)
async def get_module_info():
    """
    Get module information and capabilities
    
    Returns:
        ModuleInfoResponse: Module information
    """
    try:
        info = chainbot_module.get_module_info()
        return ModuleInfoResponse(**info)
        
    except Exception as e:
        logger.error(f"Failed to get module info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get module info: {str(e)}")

@router.get("/workflows", response_model=WorkflowListResponse)
async def get_workflows():
    """
    Get list of available workflows
    
    Returns:
        WorkflowListResponse: List of workflows
    """
    try:
        # Mock workflow data - in real implementation, this would query the database
        workflows = [
            {
                "id": "wf_001",
                "name": "Data Processing Pipeline",
                "description": "Process and analyze data from multiple sources",
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=5),
                "last_executed": datetime.utcnow() - timedelta(hours=2),
                "execution_count": 15
            },
            {
                "id": "wf_002",
                "name": "AI Agent Coordination",
                "description": "Coordinate multiple AI agents for complex tasks",
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=3),
                "last_executed": datetime.utcnow() - timedelta(minutes=30),
                "execution_count": 8
            },
            {
                "id": "wf_003",
                "name": "System Monitoring",
                "description": "Monitor system health and performance",
                "status": "inactive",
                "created_at": datetime.utcnow() - timedelta(days=10),
                "last_executed": datetime.utcnow() - timedelta(days=1),
                "execution_count": 45
            }
        ]
        
        active_count = sum(1 for wf in workflows if wf["status"] == "active")
        
        return WorkflowListResponse(
            workflows=workflows,
            total_count=len(workflows),
            active_count=active_count
        )
        
    except Exception as e:
        logger.error(f"Failed to get workflows: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get workflows: {str(e)}")

@router.get("/agents", response_model=AgentListResponse)
async def get_agents():
    """
    Get list of available agents
    
    Returns:
        AgentListResponse: List of agents
    """
    try:
        # Mock agent data - in real implementation, this would query the database
        agents = [
            {
                "id": "agent_001",
                "name": "Data Processor Alpha",
                "type": "data_processor",
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=2),
                "last_activity": datetime.utcnow() - timedelta(minutes=5),
                "tasks_completed": 25
            },
            {
                "id": "agent_002",
                "name": "Assistant Beta",
                "type": "assistant",
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=1),
                "last_activity": datetime.utcnow() - timedelta(minutes=2),
                "tasks_completed": 12
            },
            {
                "id": "agent_003",
                "name": "API Gateway Gamma",
                "type": "api",
                "status": "idle",
                "created_at": datetime.utcnow() - timedelta(hours=6),
                "last_activity": datetime.utcnow() - timedelta(hours=1),
                "tasks_completed": 8
            }
        ]
        
        active_count = sum(1 for agent in agents if agent["status"] == "active")
        
        return AgentListResponse(
            agents=agents,
            total_count=len(agents),
            active_count=active_count
        )
        
    except Exception as e:
        logger.error(f"Failed to get agents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get agents: {str(e)}")

@router.post("/workflows/{workflow_id}/execute", response_model=ExecutionResponse)
async def execute_workflow(
    workflow_id: str,
    execution_request: ExecutionRequest,
    background_tasks: BackgroundTasks
):
    """
    Execute a workflow
    
    Args:
        workflow_id: ID of the workflow to execute
        execution_request: Execution parameters
        background_tasks: Background tasks for async execution
        
    Returns:
        ExecutionResponse: Execution details
    """
    try:
        # Validate workflow exists
        # In real implementation, this would check the database
        
        # Create execution record
        execution_id = f"exec_{workflow_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Start execution in background
        background_tasks.add_task(
            execute_workflow_background,
            execution_id,
            workflow_id,
            execution_request.parameters
        )
        
        return ExecutionResponse(
            execution_id=execution_id,
            workflow_id=workflow_id,
            status="started",
            started_at=datetime.utcnow(),
            estimated_duration=300  # 5 minutes estimate
        )
        
    except Exception as e:
        logger.error(f"Failed to execute workflow {workflow_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute workflow: {str(e)}")

@router.post("/agents")
async def spawn_agent(agent_config: Dict[str, Any]):
    """
    Spawn a new agent
    
    Args:
        agent_config: Agent configuration
        
    Returns:
        Dict: Agent details
    """
    try:
        # Validate agent configuration
        required_fields = ["name", "type"]
        for field in required_fields:
            if field not in agent_config:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Create agent
        agent_id = f"agent_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # In real implementation, this would use the agent spawner
        agent = {
            "id": agent_id,
            "name": agent_config["name"],
            "type": agent_config["type"],
            "status": "starting",
            "created_at": datetime.utcnow(),
            "config": agent_config.get("config", {})
        }
        
        # Start agent in background
        asyncio.create_task(spawn_agent_background(agent))
        
        return {
            "agent_id": agent_id,
            "status": "spawning",
            "message": "Agent is being spawned"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to spawn agent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to spawn agent: {str(e)}")

@router.get("/status")
async def get_status():
    """
    Get current module status
    
    Returns:
        Dict: Status information
    """
    try:
        return {
            "status": chainbot_module.get_status(),
            "health_score": await chainbot_module.health_check(),
            "uptime": "8h 32m 15s",
            "version": chainbot_module.version,
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

# Background task functions

async def execute_workflow_background(execution_id: str, workflow_id: str, parameters: Optional[Dict[str, Any]]):
    """Execute workflow in background"""
    try:
        logger.info(f"Starting background execution: {execution_id}")
        
        # Simulate workflow execution
        await asyncio.sleep(2)
        
        # Update execution status
        logger.info(f"Workflow execution completed: {execution_id}")
        
    except Exception as e:
        logger.error(f"Background workflow execution failed: {execution_id} - {e}")

async def spawn_agent_background(agent: Dict[str, Any]):
    """Spawn agent in background"""
    try:
        logger.info(f"Starting background agent spawn: {agent['id']}")
        
        # Simulate agent spawning
        await asyncio.sleep(3)
        
        # Update agent status
        agent["status"] = "active"
        logger.info(f"Agent spawned successfully: {agent['id']}")
        
    except Exception as e:
        logger.error(f"Background agent spawn failed: {agent['id']} - {e}")

# Webhook endpoints for ALEX OS integration

@router.post("/webhooks/workflow/started")
async def webhook_workflow_started(webhook_data: Dict[str, Any]):
    """Webhook for workflow started events"""
    try:
        logger.info(f"Workflow started webhook received: {webhook_data}")
        
        # Process webhook data
        # In real implementation, this would trigger ALEX OS events
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@router.post("/webhooks/workflow/completed")
async def webhook_workflow_completed(webhook_data: Dict[str, Any]):
    """Webhook for workflow completed events"""
    try:
        logger.info(f"Workflow completed webhook received: {webhook_data}")
        
        # Process webhook data
        # In real implementation, this would trigger ALEX OS events
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@router.post("/webhooks/agent/spawned")
async def webhook_agent_spawned(webhook_data: Dict[str, Any]):
    """Webhook for agent spawned events"""
    try:
        logger.info(f"Agent spawned webhook received: {webhook_data}")
        
        # Process webhook data
        # In real implementation, this would trigger ALEX OS events
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

# Health check endpoint for load balancers
@router.get("/health/simple")
async def simple_health_check():
    """Simple health check for load balancers"""
    try:
        # Quick health check
        health_score = await chainbot_module.health_check()
        
        if health_score >= 0.5:
            return {"status": "healthy"}
        else:
            return {"status": "unhealthy"}
            
    except Exception:
        return {"status": "unhealthy"} 