"""
ALEX OS Integration Service for ChainBot

Handles:
- Self-registration with ALEX OS
- Canonical agent index sync
- Event bus communication
- Webhook management
- Module registry integration
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import aiohttp
from enum import Enum

from ..config import config

logger = logging.getLogger(__name__)

class EventType(Enum):
    """ALEX OS event types"""
    AGENT_SPAWN = "agent_spawn"
    AGENT_KILL = "agent_kill"
    WORKFLOW_START = "workflow_start"
    WORKFLOW_COMPLETE = "workflow_complete"
    WORKFLOW_ERROR = "workflow_error"
    CODE_CHANGE = "code_change"
    SYSTEM_HEALTH = "system_health"
    USER_ACTION = "user_action"
    BLOCKER_DETECTED = "blocker_detected"
    REQUIRES_ATTENTION = "requires_attention"

@dataclass
class ALEXOSEvent:
    """ALEX OS event structure"""
    event_type: EventType
    timestamp: datetime
    source: str
    agent_id: Optional[str] = None
    workflow_id: Optional[str] = None
    user_id: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)
    severity: str = "info"
    requires_attention: bool = False

@dataclass
class AgentCanonEntry:
    """Canonical agent definition"""
    name: str
    version: str
    description: str
    capabilities: List[str]
    ui_features: List[str]
    endpoints: List[str]
    config_schema: Dict[str, Any]
    dependencies: List[str] = field(default_factory=list)
    status: str = "active"

@dataclass
class ModuleRegistration:
    """Module registration data"""
    name: str
    version: str
    description: str
    capabilities: List[str]
    endpoints: List[str]
    ui_features: List[str]
    port: int
    health_endpoint: str
    event_bus_url: str
    webhook_url: str

class ALEXOSIntegrationError(Exception):
    """ALEX OS integration error"""
    def __init__(self, message: str, status_code: int = None):
        super().__init__(message)
        self.status_code = status_code

class ALEXOSIntegration:
    """
    ALEX OS integration service
    
    Features:
    - Self-registration with ALEX OS
    - Canonical agent index sync
    - Event bus communication
    - Webhook management
    - Health monitoring and reporting
    """
    
    def __init__(self):
# Resolved: Using production value
        self.alex_os_url: str = config.get("alex_os.module_registry_url", "http://10.42.69.208:8000")
# http://10.42.69.208:8000
        self.alex_os_url: str = config.get("alex_os.module_registry_url", "http://10.42.69.208:8000")
# End resolution
        self.event_bus_url: str = config.get("alex_os.event_bus_url", "ws://localhost:8000/ws/events")
        self.webhook_url: str = config.get("alex_os.webhook_url", "http://127.0.0.1:9000/api/webhooks/chainbot")
        health_interval = config.get("alex_os.health_check_interval", 30)
        self.health_check_interval: int = health_interval if health_interval is not None else 30
        
        self.session: Optional[aiohttp.ClientSession] = None
        self.websocket: Optional[aiohttp.ClientWebSocketResponse] = None
        self.is_registered: bool = False
        self.agent_canon: Dict[str, AgentCanonEntry] = {}
        self.event_handlers: Dict[EventType, List[Callable]] = {}
        self.last_sync: Optional[datetime] = None
        
        # ChainBot module info
        self.module_info = ModuleRegistration(
            name="chainbot",
            version="1.0.0",
            description="Advanced workflow orchestration engine with AI agent management",
            capabilities=[
                "workflow_orchestration",
                "agent_management", 
                "gpt_integration",
                "chatgpt_import",
                "real_time_monitoring",
                "audit_logging",
                "multi_agent_coordination"
            ],
            endpoints=[
                "/api/agents/*",
                "/api/workflows/*", 
                "/api/gpt/*",
                "/api/chatgpt/*",
                "/api/audit/*",
                "/api/websockets/*"
            ],
            ui_features=[
                "agent_map",
                "code_agent", 
                "chat",
                "watchtower",
                "workflow_builder",
                "data_importer"
            ],
            port=9000,
            health_endpoint="/health",
            event_bus_url=self.event_bus_url,
            webhook_url=self.webhook_url
        )
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.cleanup()
    
    async def initialize(self):
        """Initialize ALEX OS integration"""
        if not self.session:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
        
        # Register with ALEX OS
        await self.register_with_alex_os()
        
        # Sync canonical agent index
        await self.sync_agent_canon()
        
        # Connect to event bus
        await self.connect_event_bus()
        
        # Start health monitoring
        asyncio.create_task(self._health_monitor_loop())
    
    async def cleanup(self):
        """Clean up resources"""
        if self.websocket:
            await self.websocket.close()
        
        if self.session:
            await self.session.close()
    
    async def register_with_alex_os(self) -> bool:
        """Register ChainBot with ALEX OS"""
        if not self.session:
            logger.error("Session not initialized")
            return False
            
        try:
            registration_data = {
                "name": self.module_info.name,
                "version": self.module_info.version,
                "description": self.module_info.description,
                "capabilities": self.module_info.capabilities,
                "endpoints": self.module_info.endpoints,
                "ui_features": self.module_info.ui_features,
                "port": self.module_info.port,
                "health_endpoint": self.module_info.health_endpoint,
                "event_bus_url": self.module_info.event_bus_url,
                "webhook_url": self.module_info.webhook_url,
                "registration_time": datetime.utcnow().isoformat()
            }
            
            async with self.session.post(
                f"{self.alex_os_url}/api/agents/register",
                json=registration_data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    self.is_registered = True
                    logger.info(f"Successfully registered with ALEX OS: {result}")
                    return True
                else:
                    logger.error(f"Failed to register with ALEX OS: {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"Registration failed: {e}")
            return False
    
    async def sync_agent_canon(self) -> bool:
        """Sync with ALEX OS canonical agent index"""
        if not self.session:
            logger.error("Session not initialized")
            return False
            
        try:
            async with self.session.get(f"{self.alex_os_url}/api/agents/canon") as response:
                if response.status == 200:
                    canon_data = await response.json()
                    
                    # Update agent canon
                    self.agent_canon.clear()
                    for agent_data in canon_data.get("agents", []):
                        agent_entry = AgentCanonEntry(
                            name=agent_data["name"],
                            version=agent_data["version"],
                            description=agent_data["description"],
                            capabilities=agent_data["capabilities"],
                            ui_features=agent_data.get("ui_features", []),
                            endpoints=agent_data.get("endpoints", []),
                            config_schema=agent_data.get("config_schema", {}),
                            dependencies=agent_data.get("dependencies", []),
                            status=agent_data.get("status", "active")
                        )
                        self.agent_canon[agent_entry.name] = agent_entry
                    
                    self.last_sync = datetime.utcnow()
                    logger.info(f"Synced {len(self.agent_canon)} agents from ALEX OS canon")
                    return True
                else:
                    logger.error(f"Failed to sync agent canon: {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"Agent canon sync failed: {e}")
            return False
    
    async def connect_event_bus(self):
        """Connect to ALEX OS event bus"""
        if not self.session:
            logger.error("Session not initialized")
            return
            
        try:
            self.websocket = await self.session.ws_connect(self.event_bus_url)
            logger.info("Connected to ALEX OS event bus")
            
            # Start event listener
            asyncio.create_task(self._event_listener())
            
        except Exception as e:
            logger.error(f"Failed to connect to event bus: {e}")
    
    async def _event_listener(self):
        """Listen for events from ALEX OS event bus"""
        if not self.websocket:
            return
        
        try:
            async for msg in self.websocket:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        event_data = json.loads(msg.data)
                        await self._handle_event(event_data)
                    except json.JSONDecodeError:
                        logger.error("Invalid JSON in event message")
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {self.websocket.exception()}")
                    break
        except Exception as e:
            logger.error(f"Event listener error: {e}")
    
    async def _handle_event(self, event_data: Dict[str, Any]):
        """Handle incoming events"""
        try:
            event_type = EventType(event_data.get("event_type"))
            event = ALEXOSEvent(
                event_type=event_type,
                timestamp=datetime.fromisoformat(event_data["timestamp"]),
                source=event_data["source"],
                agent_id=event_data.get("agent_id"),
                workflow_id=event_data.get("workflow_id"),
                user_id=event_data.get("user_id"),
                data=event_data.get("data", {}),
                severity=event_data.get("severity", "info"),
                requires_attention=event_data.get("requires_attention", False)
            )
            
            # Call registered handlers
            if event_type in self.event_handlers:
                for handler in self.event_handlers[event_type]:
                    try:
                        await handler(event)
                    except Exception as e:
                        logger.error(f"Event handler error: {e}")
            
            # Log event
            logger.info(f"Received event: {event_type.value} from {event.source}")
            
        except Exception as e:
            logger.error(f"Event handling error: {e}")
    
    async def emit_event(self, event: ALEXOSEvent):
        """Emit event to ALEX OS event bus"""
        try:
            event_data = {
                "event_type": event.event_type.value,
                "timestamp": event.timestamp.isoformat(),
                "source": event.source,
                "agent_id": event.agent_id,
                "workflow_id": event.workflow_id,
                "user_id": event.user_id,
                "data": event.data,
                "severity": event.severity,
                "requires_attention": event.requires_attention
            }
            
            # Send via WebSocket if connected
            if self.websocket and not self.websocket.closed:
                await self.websocket.send_json(event_data)
            
            # Also send via webhook
            await self._send_webhook(event_data)
            
        except Exception as e:
            logger.error(f"Failed to emit event: {e}")
    
    async def _send_webhook(self, event_data: Dict[str, Any]):
        """Send event via webhook"""
        if not self.session:
            logger.error("Session not initialized")
            return
            
        try:
            webhook_url = f"{self.alex_os_url}/api/webhooks/chainbot"
            async with self.session.post(webhook_url, json=event_data) as response:
                if response.status != 200:
                    logger.warning(f"Webhook failed: {response.status}")
        except Exception as e:
            logger.error(f"Webhook error: {e}")
    
    async def _health_monitor_loop(self):
        """Monitor health and report to ALEX OS"""
        while True:
            try:
                # Check ChainBot health
                health_status = await self._get_health_status()
                
                # Emit health event
                health_event = ALEXOSEvent(
                    event_type=EventType.SYSTEM_HEALTH,
                    timestamp=datetime.utcnow(),
                    source="chainbot",
                    data=health_status,
                    severity="info"
                )
                
                await self.emit_event(health_event)
                
                # Sync agent canon periodically
                if not self.last_sync or (datetime.utcnow() - self.last_sync).seconds > 300:  # 5 minutes
                    await self.sync_agent_canon()
                
                await asyncio.sleep(self.health_check_interval)
                
            except Exception as e:
                logger.error(f"Health monitor error: {e}")
                await asyncio.sleep(self.health_check_interval)
    
    async def _get_health_status(self) -> Dict[str, Any]:
        """Get current health status"""
        from . import get_agent_brain
        
        agent_brain = get_agent_brain()
        gpt_health = await agent_brain.health_check() if agent_brain else {"overall": "unknown"}
        
        return {
            "status": "healthy" if self.is_registered else "degraded",
            "registered": self.is_registered,
            "event_bus_connected": self.websocket and not self.websocket.closed,
            "agent_canon_synced": len(self.agent_canon) > 0,
            "gpt_integration": gpt_health,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def register_event_handler(self, event_type: EventType, handler: Callable):
        """Register event handler"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)
    
    def get_agent_canon(self) -> Dict[str, AgentCanonEntry]:
        """Get current agent canon"""
        return self.agent_canon.copy()
    
    def get_registration_status(self) -> Dict[str, Any]:
        """Get registration status"""
        return {
            "registered": self.is_registered,
            "module_info": {
                "name": self.module_info.name,
                "version": self.module_info.version,
                "capabilities": self.module_info.capabilities,
                "ui_features": self.module_info.ui_features
            },
            "last_sync": self.last_sync.isoformat() if self.last_sync else None,
            "agent_count": len(self.agent_canon)
        }

# Global instance
alex_os_integration: Optional[ALEXOSIntegration] = None

async def initialize_alex_os_integration():
    """Initialize ALEX OS integration"""
    global alex_os_integration
    
    alex_os_integration = ALEXOSIntegration()
    await alex_os_integration.initialize()
    
    return alex_os_integration

def get_alex_os_integration() -> Optional[ALEXOSIntegration]:
    """Get ALEX OS integration instance"""
    return alex_os_integration 