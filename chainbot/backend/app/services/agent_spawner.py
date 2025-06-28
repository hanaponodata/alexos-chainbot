import asyncio
import json
from typing import Dict, Any, List, Optional, Type
from sqlalchemy.orm import Session
from app.models.agent import Agent
from app.models.session import Session as DBSession
from app.services.audit import log_action
from app.services import get_websocket_manager
from datetime import datetime
import uuid

class BaseAgent:
    """Base class for all agents"""
    def __init__(self, agent_id: int, name: str, config: Dict[str, Any]):
        self.agent_id = agent_id
        self.name = name
        self.config = config
        self.status = "idle"
        self.capabilities = []
        self.memory = {}
        
    async def execute_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a task - to be implemented by subclasses"""
        raise NotImplementedError
        
    async def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "status": self.status,
            "capabilities": self.capabilities,
            "memory": self.memory
        }

class AssistantAgent(BaseAgent):
    """General purpose assistant agent"""
    def __init__(self, agent_id: int, name: str, config: Dict[str, Any]):
        super().__init__(agent_id, name, config)
        self.capabilities = ["conversation", "task_execution", "reasoning"]
        self.personality = config.get("personality", "helpful")
        
    async def execute_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        self.status = "working"
        
        # Simulate task execution
        await asyncio.sleep(1)
        
        result = {
            "task": task,
            "result": f"Assistant {self.name} completed task: {task}",
            "personality": self.personality,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.status = "idle"
        return result

class DataProcessorAgent(BaseAgent):
    """Agent specialized in data processing tasks"""
    def __init__(self, agent_id: int, name: str, config: Dict[str, Any]):
        super().__init__(agent_id, name, config)
        self.capabilities = ["data_processing", "analysis", "reporting"]
        self.processing_type = config.get("processing_type", "general")
        
    async def execute_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        self.status = "working"
        
        # Simulate data processing
        await asyncio.sleep(2)
        
        context_data = context or {}
        result = {
            "task": task,
            "result": f"Data processor {self.name} processed: {task}",
            "processing_type": self.processing_type,
            "data_points": context_data.get("data_points", 0),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.status = "idle"
        return result

class APIAgent(BaseAgent):
    """Agent for making API calls and integrations"""
    def __init__(self, agent_id: int, name: str, config: Dict[str, Any]):
        super().__init__(agent_id, name, config)
        self.capabilities = ["api_calls", "integration", "webhooks"]
        self.base_url = config.get("base_url", "")
        self.api_key = config.get("api_key", "")
        
    async def execute_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        self.status = "working"
        
        # Simulate API call
        await asyncio.sleep(0.5)
        
        context_data = context or {}
        result = {
            "task": task,
            "result": f"API agent {self.name} called: {task}",
            "base_url": self.base_url,
            "endpoint": context_data.get("endpoint", ""),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.status = "idle"
        return result

class WorkflowAgent(BaseAgent):
    """Agent for managing and executing workflows"""
    def __init__(self, agent_id: int, name: str, config: Dict[str, Any]):
        super().__init__(agent_id, name, config)
        self.capabilities = ["workflow_management", "orchestration", "monitoring"]
        self.workflow_engine = config.get("workflow_engine", None)
        
    async def execute_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        self.status = "working"
        
        # Simulate workflow management
        await asyncio.sleep(1.5)
        
        context_data = context or {}
        result = {
            "task": task,
            "result": f"Workflow agent {self.name} managed: {task}",
            "workflows_managed": context_data.get("workflow_count", 0),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.status = "idle"
        return result

class AgentSpawner:
    """Service for creating and managing agents"""
    
    AGENT_TYPES = {
        "assistant": AssistantAgent,
        "data_processor": DataProcessorAgent,
        "api": APIAgent,
        "workflow": WorkflowAgent
    }
    
    def __init__(self, db: Session):
        self.db = db
        self.active_agents: Dict[int, BaseAgent] = {}
        
    def spawn_agent(self, agent_type: str, name: str, config: Dict[str, Any], 
                   session_id: int, user_id: int) -> Agent:
        """Create a new agent instance"""
        
        if agent_type not in self.AGENT_TYPES:
            raise ValueError(f"Unknown agent type: {agent_type}")
            
        # Create database record
        db_agent = Agent(
            name=name,
            type=agent_type,
            config=config,
            status="idle",
            session_id=session_id
        )
        
        self.db.add(db_agent)
        self.db.commit()
        self.db.refresh(db_agent)
        
        # Create agent instance
        agent_class = self.AGENT_TYPES[agent_type]
        agent_instance = agent_class(db_agent.id, name, config)
        
        # Store active agent
        self.active_agents[db_agent.id] = agent_instance
        
        # Log agent creation
        log_action(self.db, "agent_spawned", user_id, "agent", db_agent.id, 
                  meta={"type": agent_type, "name": name, "session_id": session_id})
        
        # Broadcast agent creation
        asyncio.create_task(self._broadcast_agent_event(db_agent))
        
        return db_agent
    
    async def execute_agent_task(self, agent_id: int, task: str, 
                               context: Optional[Dict[str, Any]] = None, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Execute a task with a specific agent"""
        
        if agent_id not in self.active_agents:
            raise ValueError(f"Agent {agent_id} not found or not active")
            
        agent = self.active_agents[agent_id]
        
        # Update database status
        db_agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if db_agent:
            setattr(db_agent, 'status', "working")
            self.db.commit()
        
        try:
            # Execute task
            result = await agent.execute_task(task, context)
            
            # Update database status
            if db_agent:
                setattr(db_agent, 'status', "idle")
                self.db.commit()
            
            # Log task execution
            if user_id is not None:
                log_action(self.db, "agent_task_executed", user_id, "agent", agent_id, 
                          meta={"task": task, "result": result})
            
            # Broadcast task completion
            await self._broadcast_agent_event(db_agent)
            
            return result
            
        except Exception as e:
            # Update database status on error
            if db_agent:
                setattr(db_agent, 'status', "error")
                self.db.commit()
            
            # Log error
            if user_id is not None:
                log_action(self.db, "agent_task_failed", user_id, "agent", agent_id, 
                          meta={"task": task, "error": str(e)})
            
            raise e
    
    def get_agent_status(self, agent_id: int) -> Optional[Dict[str, Any]]:
        """Get status of a specific agent"""
        if agent_id in self.active_agents:
            return asyncio.run(self.active_agents[agent_id].get_status())
        return None
    
    def list_active_agents(self) -> List[Dict[str, Any]]:
        """List all active agents"""
        agents = []
        for agent_id, agent in self.active_agents.items():
            agents.append({
                "agent_id": agent_id,
                "name": agent.name,
                "type": agent.__class__.__name__,
                "status": agent.status,
                "capabilities": agent.capabilities
            })
        return agents
    
    def terminate_agent(self, agent_id: int, user_id: int) -> bool:
        """Terminate an active agent"""
        if agent_id not in self.active_agents:
            return False
            
        # Remove from active agents
        del self.active_agents[agent_id]
        
        # Update database
        db_agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if db_agent:
            setattr(db_agent, 'status', "terminated")
            self.db.commit()
        
        # Log termination
        log_action(self.db, "agent_terminated", user_id, "agent", agent_id)
        
        # Broadcast termination
        asyncio.create_task(self._broadcast_agent_event(db_agent))
        
        return True
    
    async def _broadcast_agent_event(self, db_agent: Agent):
        ws_manager = get_websocket_manager()
        if ws_manager:
            from app.services.websocket_manager import WebSocketMessage, MessageType, WindowType
            status_value = getattr(db_agent, "status", None)
            event_type = "agent_created" if status_value == "idle" else "agent_status_update"
            message_type = MessageType.AGENT_SPAWN if event_type == "agent_created" else MessageType.AGENT_STATUS_UPDATE
            event_data = {
                "event_type": event_type,
                "agent_id": db_agent.id,
                "name": db_agent.name,
                "type": db_agent.type,
                "status": status_value,
                "session_id": db_agent.session_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            message = WebSocketMessage(
                message_type=message_type,
                window_type=WindowType.AGENT_MAP,
                timestamp=datetime.utcnow(),
                data=event_data
            )
            await ws_manager.broadcast_to_window(WindowType.AGENT_MAP, message)
    
    def get_agent_types(self) -> List[Dict[str, Any]]:
        """Get available agent types and their capabilities"""
        types = []
        for agent_type, agent_class in self.AGENT_TYPES.items():
            # Create a temporary instance to get capabilities
            temp_agent = agent_class(0, "temp", {})
            types.append({
                "type": agent_type,
                "name": agent_class.__name__,
                "capabilities": temp_agent.capabilities,
                "description": f"{agent_class.__name__} agent for {agent_type} tasks"
            })
        return types 