#!/usr/bin/env python3
"""
ChainBot ALEX OS Module Implementation

This module implements the ALEX OS BaseModule interface to provide
advanced workflow orchestration and AI agent management capabilities.
"""

import asyncio
import logging
import os
import sys
from typing import Dict, Any, Optional
from pathlib import Path

# Add the backend directory to the Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services.workflow_orchestrator import WorkflowOrchestrator
from app.services.agent_spawner import AgentSpawner
from app.services.entanglement import EntanglementManager
from app.services.websocket_manager import WebSocketManager
from app.services.audit import AuditService
from app.db import get_db, engine
from app.models.base import Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ChainBotModule:
    """
    ChainBot ALEX OS Module Implementation
    
    Implements the ALEX OS BaseModule interface to provide:
    - Advanced workflow orchestration
    - AI agent management
    - Entanglement coordination
    - Real-time monitoring
    - Audit logging
    """
    
    def __init__(self):
        self.name = "chainbot"
        self.version = "1.0.0"
        self.description = "Advanced workflow orchestration engine with AI agent management"
        self.status = "stopped"
        self.health_score = 0.0
        
        # Core services
        self.workflow_orchestrator: Optional[WorkflowOrchestrator] = None
        self.agent_spawner: Optional[AgentSpawner] = None
        self.entanglement_manager: Optional[EntanglementManager] = None
        self.websocket_manager: Optional[WebSocketManager] = None
        self.audit_service: Optional[AuditService] = None
        
        # Configuration
        self.config: Dict[str, Any] = {}
        
        # Event bus integration
        self.event_bus_url: Optional[str] = None
        self.webhook_url: Optional[str] = None
        
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """
        Initialize the ChainBot module with configuration
        
        Args:
            config: Module configuration dictionary
            
        Returns:
            bool: True if initialization successful, False otherwise
        """
        try:
            logger.info("Initializing ChainBot ALEX OS module...")
            
            # Store configuration
            self.config = config
            
            # Extract configuration values
            self.event_bus_url = config.get("alex_os", {}).get("event_bus_url")
            self.webhook_url = config.get("alex_os", {}).get("webhook_url")
            
            # Initialize database
            await self._initialize_database()
            
            # Initialize core services
            await self._initialize_services()
            
            # Set status
            self.status = "initialized"
            self.health_score = 0.5
            
            logger.info("ChainBot module initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize ChainBot module: {e}")
            self.status = "error"
            self.health_score = 0.0
            return False
    
    async def start(self) -> bool:
        """
        Start the ChainBot module
        
        Returns:
            bool: True if start successful, False otherwise
        """
        try:
            logger.info("Starting ChainBot ALEX OS module...")
            
            if self.status != "initialized":
                logger.error("Module not initialized. Call initialize() first.")
                return False
            
            # Start core services
            await self._start_services()
            
            # Start event bus integration
            await self._start_event_bus_integration()
            
            # Set status
            self.status = "running"
            self.health_score = 1.0
            
            logger.info("ChainBot module started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start ChainBot module: {e}")
            self.status = "error"
            self.health_score = 0.0
            return False
    
    async def stop(self) -> bool:
        """
        Stop the ChainBot module
        
        Returns:
            bool: True if stop successful, False otherwise
        """
        try:
            logger.info("Stopping ChainBot ALEX OS module...")
            
            # Stop event bus integration
            await self._stop_event_bus_integration()
            
            # Stop core services
            await self._stop_services()
            
            # Set status
            self.status = "stopped"
            self.health_score = 0.0
            
            logger.info("ChainBot module stopped successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop ChainBot module: {e}")
            return False
    
    async def health_check(self) -> float:
        """
        Perform health check on the module
        
        Returns:
            float: Health score between 0.0 and 1.0
        """
        try:
            health_checks = []
            
            # Check database connectivity
            try:
                db = next(get_db())
                db.execute("SELECT 1")
                db.close()
                health_checks.append(1.0)
            except Exception as e:
                logger.warning(f"Database health check failed: {e}")
                health_checks.append(0.0)
            
            # Check workflow orchestrator
            if self.workflow_orchestrator:
                try:
                    orchestrator_health = await self.workflow_orchestrator.health_check()
                    health_checks.append(orchestrator_health)
                except Exception as e:
                    logger.warning(f"Workflow orchestrator health check failed: {e}")
                    health_checks.append(0.0)
            
            # Check agent spawner
            if self.agent_spawner:
                try:
                    spawner_health = await self.agent_spawner.health_check()
                    health_checks.append(spawner_health)
                except Exception as e:
                    logger.warning(f"Agent spawner health check failed: {e}")
                    health_checks.append(0.0)
            
            # Check websocket manager
            if self.websocket_manager:
                try:
                    websocket_health = await self.websocket_manager.health_check()
                    health_checks.append(websocket_health)
                except Exception as e:
                    logger.warning(f"WebSocket manager health check failed: {e}")
                    health_checks.append(0.0)
            
            # Calculate overall health score
            if health_checks:
                self.health_score = sum(health_checks) / len(health_checks)
            else:
                self.health_score = 0.0
            
            logger.debug(f"Health check completed. Score: {self.health_score}")
            return self.health_score
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            self.health_score = 0.0
            return 0.0
    
    def get_status(self) -> str:
        """
        Get the current status of the module
        
        Returns:
            str: Current status
        """
        return self.status
    
    def get_module_info(self) -> Dict[str, Any]:
        """
        Get module information
        
        Returns:
            Dict[str, Any]: Module information
        """
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "status": self.status,
            "health_score": self.health_score,
            "config": self.config,
            "capabilities": [
                "workflow_orchestration",
                "agent_management",
                "entanglement_coordination",
                "real_time_monitoring",
                "audit_logging"
            ],
            "api_endpoints": {
                "health": "/api/chainbot/health",
                "metrics": "/api/chainbot/metrics",
                "workflows": "/api/chainbot/workflows",
                "agents": "/api/chainbot/agents",
                "entanglements": "/api/chainbot/entanglements"
            },
            "event_topics": {
                "publish": [
                    "chainbot.workflow.started",
                    "chainbot.workflow.completed",
                    "chainbot.agent.spawned",
                    "chainbot.entanglement.created"
                ],
                "subscribe": [
                    "alex_os.system.status",
                    "alex_os.module.health"
                ]
            }
        }
    
    async def _initialize_database(self):
        """Initialize database and create tables"""
        try:
            # Create all tables
            Base.metadata.create_all(bind=engine)
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    async def _initialize_services(self):
        """Initialize core services"""
        try:
            # Initialize audit service
            self.audit_service = AuditService()
            
            # Initialize workflow orchestrator
            self.workflow_orchestrator = WorkflowOrchestrator(
                audit_service=self.audit_service
            )
            
            # Initialize agent spawner
            self.agent_spawner = AgentSpawner(
                audit_service=self.audit_service
            )
            
            # Initialize entanglement manager
            self.entanglement_manager = EntanglementManager(
                audit_service=self.audit_service
            )
            
            # Initialize websocket manager
            self.websocket_manager = WebSocketManager(
                audit_service=self.audit_service
            )
            
            logger.info("Core services initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize services: {e}")
            raise
    
    async def _start_services(self):
        """Start core services"""
        try:
            # Start websocket manager
            if self.websocket_manager:
                await self.websocket_manager.start()
            
            # Start workflow orchestrator
            if self.workflow_orchestrator:
                await self.workflow_orchestrator.start()
            
            # Start agent spawner
            if self.agent_spawner:
                await self.agent_spawner.start()
            
            # Start entanglement manager
            if self.entanglement_manager:
                await self.entanglement_manager.start()
            
            logger.info("Core services started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start services: {e}")
            raise
    
    async def _stop_services(self):
        """Stop core services"""
        try:
            # Stop entanglement manager
            if self.entanglement_manager:
                await self.entanglement_manager.stop()
            
            # Stop agent spawner
            if self.agent_spawner:
                await self.agent_spawner.stop()
            
            # Stop workflow orchestrator
            if self.workflow_orchestrator:
                await self.workflow_orchestrator.stop()
            
            # Stop websocket manager
            if self.websocket_manager:
                await self.websocket_manager.stop()
            
            logger.info("Core services stopped successfully")
            
        except Exception as e:
            logger.error(f"Failed to stop services: {e}")
            raise
    
    async def _start_event_bus_integration(self):
        """Start ALEX OS event bus integration"""
        try:
            if self.event_bus_url:
                # Connect to ALEX OS event bus
                logger.info(f"Connecting to ALEX OS event bus: {self.event_bus_url}")
                
                # Subscribe to ALEX OS events
                await self._subscribe_to_alex_os_events()
                
                # Publish module ready event
                await self._publish_module_event("chainbot.module.ready", {
                    "module": self.name,
                    "version": self.version,
                    "status": "ready"
                })
                
                logger.info("ALEX OS event bus integration started")
            
        except Exception as e:
            logger.error(f"Failed to start event bus integration: {e}")
            raise
    
    async def _stop_event_bus_integration(self):
        """Stop ALEX OS event bus integration"""
        try:
            if self.event_bus_url:
                # Publish module stopping event
                await self._publish_module_event("chainbot.module.stopping", {
                    "module": self.name,
                    "status": "stopping"
                })
                
                logger.info("ALEX OS event bus integration stopped")
                
        except Exception as e:
            logger.error(f"Failed to stop event bus integration: {e}")
    
    async def _subscribe_to_alex_os_events(self):
        """Subscribe to ALEX OS system events"""
        try:
            # Subscribe to system status events
            await self._subscribe_to_topic("alex_os.system.status")
            
            # Subscribe to module health events
            await self._subscribe_to_topic("alex_os.module.health")
            
            logger.info("Subscribed to ALEX OS events")
            
        except Exception as e:
            logger.error(f"Failed to subscribe to ALEX OS events: {e}")
    
    async def _subscribe_to_topic(self, topic: str):
        """Subscribe to a specific event topic"""
        # Implementation would depend on the specific event bus implementation
        # This is a placeholder for the actual implementation
        logger.debug(f"Subscribing to topic: {topic}")
    
    async def _publish_module_event(self, topic: str, data: Dict[str, Any]):
        """Publish a module event to the event bus"""
        # Implementation would depend on the specific event bus implementation
        # This is a placeholder for the actual implementation
        logger.debug(f"Publishing event to topic {topic}: {data}")
        
        # Also log to audit service if available
        if self.audit_service:
            await self.audit_service.log_event(
                event_type="module_event",
                event_data={
                    "topic": topic,
                    "data": data
                }
            )


# Module instance
chainbot_module = ChainBotModule()


# ALEX OS Module Interface Functions
async def initialize(config: Dict[str, Any]) -> bool:
    """ALEX OS module initialization function"""
    return await chainbot_module.initialize(config)


async def start() -> bool:
    """ALEX OS module start function"""
    return await chainbot_module.start()


async def stop() -> bool:
    """ALEX OS module stop function"""
    return await chainbot_module.stop()


async def health_check() -> float:
    """ALEX OS module health check function"""
    return await chainbot_module.health_check()


def get_status() -> str:
    """ALEX OS module status function"""
    return chainbot_module.get_status()


def get_module_info() -> Dict[str, Any]:
    """ALEX OS module info function"""
    return chainbot_module.get_module_info()


# Main execution for testing
if __name__ == "__main__":
    async def main():
        """Test the module functionality"""
        print("Testing ChainBot ALEX OS Module...")
        
        # Test configuration
        test_config = {
            "database": {
                "url": "postgresql://chainbot:password@localhost/chainbot"
            },
            "alex_os": {
                "event_bus_url": "ws://localhost:8000/ws/events",
# Resolved: Using production value
                "webhook_url": "http://10.42.69.208:8000/api/webhooks/chainbot"
# http://10.42.69.208:8000/api/webhooks/chainbot
                "webhook_url": "http://10.42.69.208:8000/api/webhooks/chainbot"
# End resolution
            }
        }
        
        # Initialize module
        if await initialize(test_config):
            print("✓ Module initialized")
            
            # Start module
            if await start():
                print("✓ Module started")
                
                # Check health
                health = await health_check()
                print(f"✓ Health check: {health}")
                
                # Get status
                status = get_status()
                print(f"✓ Status: {status}")
                
                # Get module info
                info = get_module_info()
                print(f"✓ Module info: {info['name']} v{info['version']}")
                
                # Stop module
                if await stop():
                    print("✓ Module stopped")
                else:
                    print("✗ Failed to stop module")
            else:
                print("✗ Failed to start module")
        else:
            print("✗ Failed to initialize module")
    
    # Run test
    asyncio.run(main()) 