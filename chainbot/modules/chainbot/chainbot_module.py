"""
ChainBot Module Implementation for ALEX OS
Main module class that integrates ChainBot with ALEX OS
"""

import asyncio
import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime

# ALEX OS imports (these would be available in the ALEX OS environment)
# from modules.base import BaseModule
# from core.event_bus import EventBus
# from config.config_manager import ConfigManager

# ChainBot imports
from ...backend.app.services.workflow_orchestrator import WorkflowOrchestrator
from ...backend.app.services.agent_spawner import AgentSpawner
from ...backend.app.services.entanglement import EntanglementManager
from ...backend.app.services.websocket_manager import WebSocketManager
from ...backend.app.services.audit import log_action
from ...backend.app.db import SessionLocal

# Simple AuditService for ALEX OS integration
class AuditService:
    """Simple audit service for ALEX OS integration"""
    
    def __init__(self, db):
        self.db = db
        
    async def log_event(self, user_id: str, action: str, resource_type: str, 
                       resource_id: str, details: Optional[Dict[str, Any]] = None):
        """Log an audit event"""
        try:
            log_action(
                self.db, action, user_id, resource_type, resource_id, 
                meta=details or {}
            )
        except Exception as e:
            logging.error(f"Failed to log audit event: {e}")

# Mock EventBus for development
class MockEventBus:
    """Mock event bus for development"""
    
    def __init__(self):
        self.subscribers = {}
        
    async def subscribe(self, topic: str, handler):
        """Subscribe to a topic"""
        if topic not in self.subscribers:
            self.subscribers[topic] = []
        self.subscribers[topic].append(handler)
        
    async def emit(self, topic: str, data: Dict[str, Any], source: Optional[str] = None):
        """Emit an event"""
        if topic in self.subscribers:
            for handler in self.subscribers[topic]:
                try:
                    await handler(data)
                except Exception as e:
                    logging.error(f"Error in event handler: {e}")

# Temporary BaseModule implementation for development
class BaseModule:
    """Base module class for ALEX OS modules"""
    
    def __init__(self, name: str, version: str):
        self.name = name
        self.version = version
        self.logger = logging.getLogger(f"alex_os.{name}")
        self.event_bus = MockEventBus()
        self.orchestrator = None
        self.config_manager = None
        self._status = "stopped"
        
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize the module"""
        self._status = "initializing"
        success = await self._initialize_impl(config)
        if success:
            self._status = "initialized"
        return success
        
    async def start(self) -> bool:
        """Start the module"""
        self._status = "starting"
        success = await self._start_impl()
        if success:
            self._status = "running"
        return success
        
    async def stop(self) -> bool:
        """Stop the module"""
        self._status = "stopping"
        success = await self._stop_impl()
        if success:
            self._status = "stopped"
        return success
        
    async def health_check(self) -> float:
        """Perform health check"""
        return await self._health_check_impl()
        
    def get_status(self) -> str:
        """Get module status"""
        return self._status
        
    def get_config(self) -> Dict[str, Any]:
        """Get module configuration"""
        return {}
        
    async def _initialize_impl(self, config: Dict[str, Any]) -> bool:
        """Implementation of initialization"""
        raise NotImplementedError
        
    async def _start_impl(self) -> bool:
        """Implementation of start"""
        raise NotImplementedError
        
    async def _stop_impl(self) -> bool:
        """Implementation of stop"""
        raise NotImplementedError
        
    async def _health_check_impl(self) -> float:
        """Implementation of health check"""
        raise NotImplementedError

class ChainBotModule(BaseModule):
    """ChainBot integration module for ALEX OS"""
    
    def __init__(self):
        super().__init__("chainbot", "1.0.0")
        self.workflow_orchestrator = None
        self.agent_spawner = None
        self.entanglement_manager = None
        self.websocket_manager = None
        self.audit_service = None
        self.database = None
        self._api_routes = []
        self._event_handlers = []
        
    async def _initialize_impl(self, config: Dict[str, Any]) -> bool:
        """Initialize ChainBot components"""
        try:
            self.logger.info("Initializing ChainBot module...")
            
            # Initialize database connection
            self.database = SessionLocal()
            
            # Initialize services
            self.websocket_manager = WebSocketManager()
            self.audit_service = AuditService(self.database)
            
            # Initialize workflow orchestrator
            workflow_config = config.get("workflow", {})
            self.workflow_orchestrator = WorkflowOrchestrator(
                db=self.database,
                websocket_manager=self.websocket_manager,
                audit_service=self.audit_service
            )
            
            # Initialize agent spawner
            agent_config = config.get("agents", {})
            self.agent_spawner = AgentSpawner(db=self.database)
            
            # Initialize entanglement manager
            entanglement_config = config.get("entanglement", {})
            self.entanglement_manager = EntanglementManager(
                db=self.database,
                agent_spawner=self.agent_spawner
            )
            
            # Register event handlers
            await self._register_event_handlers()
            
            # Register API routes
            await self._register_api_routes()
            
            self.logger.info("ChainBot module initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize ChainBot: {e}")
            return False
    
    async def _start_impl(self) -> bool:
        """Start ChainBot services"""
        try:
            self.logger.info("Starting ChainBot services...")
            
            # Start workflow orchestrator
            # Note: The orchestrator is already running when initialized
            
            # Start agent spawner
            # Note: The spawner is ready when initialized
            
            # Start entanglement service
            # Note: The service is ready when initialized
            
            # Emit startup event
            await self.event_bus.emit("chainbot.started", {
                "timestamp": time.time(),
                "version": self.version,
                "module_id": self.name
            })
            
            self.logger.info("ChainBot services started successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start ChainBot: {e}")
            return False
    
    async def _stop_impl(self) -> bool:
        """Stop ChainBot services"""
        try:
            self.logger.info("Stopping ChainBot services...")
            
            # Stop all active workflow executions
            if self.workflow_orchestrator:
                active_executions = self.workflow_orchestrator.get_all_executions()
                for execution in active_executions:
                    if execution and execution.get('status') in ['running', 'pending']:
                        await self.workflow_orchestrator.cancel_execution(
                            execution['execution_id'], 
                            "system"
                        )
            
            # Stop all active agents
            if self.agent_spawner:
                active_agents = self.agent_spawner.list_active_agents()
                for agent in active_agents:
                    if agent.get('status') == 'running':
                        self.agent_spawner.terminate_agent(agent['id'], 0)
            
            # Close database connection
            if self.database:
                self.database.close()
            
            # Emit shutdown event
            await self.event_bus.emit("chainbot.stopped", {
                "timestamp": time.time(),
                "version": self.version,
                "module_id": self.name
            })
            
            self.logger.info("ChainBot services stopped successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to stop ChainBot: {e}")
            return False
    
    async def _health_check_impl(self) -> float:
        """Perform health check"""
        try:
            health_scores = []
            
            # Check database health
            if self.database:
                try:
                    # Simple database health check using SQLAlchemy
                    from sqlalchemy import text
                    self.database.execute(text("SELECT 1"))
                    health_scores.append(1.0)
                except Exception:
                    health_scores.append(0.0)
            else:
                health_scores.append(0.0)
            
            # Check workflow orchestrator health
            if self.workflow_orchestrator:
                try:
                    # Check if orchestrator is responsive
                    active_executions = self.workflow_orchestrator.get_all_executions()
                    health_scores.append(1.0)
                except Exception:
                    health_scores.append(0.0)
            else:
                health_scores.append(0.0)
            
            # Check agent spawner health
            if self.agent_spawner:
                try:
                    # Check if spawner is responsive
                    agents = self.agent_spawner.list_active_agents()
                    health_scores.append(1.0)
                except Exception:
                    health_scores.append(0.0)
            else:
                health_scores.append(0.0)
            
            # Return average health score
            return sum(health_scores) / len(health_scores) if health_scores else 0.0
            
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
            return 0.0
    
    async def _register_event_handlers(self):
        """Register event handlers with ALEX OS event bus"""
        # Register workflow events
        await self.event_bus.subscribe("chainbot.workflow.started", self._handle_workflow_started)
        await self.event_bus.subscribe("chainbot.workflow.completed", self._handle_workflow_completed)
        await self.event_bus.subscribe("chainbot.workflow.failed", self._handle_workflow_failed)
        
        # Register agent events
        await self.event_bus.subscribe("chainbot.agent.spawned", self._handle_agent_spawned)
        await self.event_bus.subscribe("chainbot.agent.terminated", self._handle_agent_terminated)
        
        # Register entanglement events
        await self.event_bus.subscribe("chainbot.entanglement.created", self._handle_entanglement_created)
        await self.event_bus.subscribe("chainbot.entanglement.message", self._handle_entanglement_message)
    
    async def _register_api_routes(self):
        """Register API routes with ALEX OS"""
        # This would be implemented when integrating with ALEX OS API server
        # For now, we'll define the route structure
        self._api_routes = [
            {
                "path": "/api/chainbot/workflows",
                "method": "GET",
                "handler": self._api_list_workflows,
                "description": "List all workflows"
            },
            {
                "path": "/api/chainbot/workflows/{workflow_id}/execute",
                "method": "POST",
                "handler": self._api_execute_workflow,
                "description": "Execute a workflow"
            },
            {
                "path": "/api/chainbot/agents",
                "method": "GET",
                "handler": self._api_list_agents,
                "description": "List all agents"
            },
            {
                "path": "/api/chainbot/agents",
                "method": "POST",
                "handler": self._api_spawn_agent,
                "description": "Spawn a new agent"
            },
            {
                "path": "/api/chainbot/entanglements",
                "method": "GET",
                "handler": self._api_list_entanglements,
                "description": "List all entanglements"
            }
        ]
    
    # Event handlers
    async def _handle_workflow_started(self, event_data: Dict[str, Any]):
        """Handle workflow started event"""
        self.logger.info(f"Workflow started: {event_data}")
        
    async def _handle_workflow_completed(self, event_data: Dict[str, Any]):
        """Handle workflow completed event"""
        self.logger.info(f"Workflow completed: {event_data}")
        
    async def _handle_workflow_failed(self, event_data: Dict[str, Any]):
        """Handle workflow failed event"""
        self.logger.error(f"Workflow failed: {event_data}")
        
    async def _handle_agent_spawned(self, event_data: Dict[str, Any]):
        """Handle agent spawned event"""
        self.logger.info(f"Agent spawned: {event_data}")
        
    async def _handle_agent_terminated(self, event_data: Dict[str, Any]):
        """Handle agent terminated event"""
        self.logger.info(f"Agent terminated: {event_data}")
        
    async def _handle_entanglement_created(self, event_data: Dict[str, Any]):
        """Handle entanglement created event"""
        self.logger.info(f"Entanglement created: {event_data}")
        
    async def _handle_entanglement_message(self, event_data: Dict[str, Any]):
        """Handle entanglement message event"""
        self.logger.info(f"Entanglement message: {event_data}")
    
    # API handlers
    async def _api_list_workflows(self, request):
        """API handler for listing workflows"""
        # This would be implemented with proper request/response handling
        return {"workflows": []}
        
    async def _api_execute_workflow(self, request):
        """API handler for executing workflows"""
        # This would be implemented with proper request/response handling
        return {"execution_id": "test_execution"}
        
    async def _api_list_agents(self, request):
        """API handler for listing agents"""
        # This would be implemented with proper request/response handling
        return {"agents": []}
        
    async def _api_spawn_agent(self, request):
        """API handler for spawning agents"""
        # This would be implemented with proper request/response handling
        return {"agent_id": "test_agent"}
        
    async def _api_list_entanglements(self, request):
        """API handler for listing entanglements"""
        # This would be implemented with proper request/response handling
        return {"entanglements": []}
    
    # Public API methods for ALEX OS integration
    async def get_workflows(self) -> list:
        """Get all workflows"""
        # This would query the workflow orchestrator
        return []
        
    async def execute_workflow(self, workflow_id: str, input_data: Optional[Dict[str, Any]] = None) -> str:
        """Execute a workflow"""
        if not self.workflow_orchestrator:
            raise RuntimeError("Workflow orchestrator not initialized")
            
        return await self.workflow_orchestrator.execute_workflow(
            workflow_id=workflow_id,
            user_id="alex_os_system",
            input_data=input_data or {}
        )
        
    async def get_agents(self) -> list:
        """Get all agents"""
        if not self.agent_spawner:
            raise RuntimeError("Agent spawner not initialized")
            
        return self.agent_spawner.list_active_agents()
        
    async def spawn_agent(self, agent_type: str, config: Dict[str, Any]) -> str:
        """Spawn a new agent"""
        if not self.agent_spawner:
            raise RuntimeError("Agent spawner not initialized")
            
        # Create a default session for ALEX OS
        from ...backend.app.models.session import Session as DBSession
        session = DBSession(name="ALEX_OS_System", user_id=0)
        if self.database:
            self.database.add(session)
            self.database.commit()
            self.database.refresh(session)
        
        agent = self.agent_spawner.spawn_agent(
            agent_type=agent_type,
            name=config.get("name", f"{agent_type}_agent"),
            config=config,
            session_id=session.id,
            user_id=0
        )
        
        return str(agent.id)
        
    async def get_entanglements(self) -> list:
        """Get all entanglements"""
        if not self.entanglement_manager:
            raise RuntimeError("Entanglement manager not initialized")
            
        return self.entanglement_manager.list_entanglements()
    
    def get_module_info(self) -> Dict[str, Any]:
        """Get module information"""
        return {
            "name": self.name,
            "version": self.version,
            "description": "Advanced Workflow Orchestration Engine with AI Agent Management",
            "status": self.get_status(),
            "health_score": asyncio.run(self.health_check()) if self._status == "running" else 0.0,
            "capabilities": [
                "workflow_orchestration",
                "agent_management", 
                "entanglement_coordination",
                "real_time_monitoring",
                "audit_logging"
            ]
        } 