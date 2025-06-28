"""
ALEX OS Registration Service for ChainBot

Handles:
- Self-registration with ALEX OS agent registry
- Health reporting and status updates
- Webhook endpoint management
- Event bus integration
- Canonical agent index sync
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import aiohttp
from enum import Enum

from ..config import config

logger = logging.getLogger(__name__)

class RegistrationStatus(Enum):
    """Registration status"""
    UNREGISTERED = "unregistered"
    REGISTERING = "registering"
    REGISTERED = "registered"
    FAILED = "failed"
    RETRYING = "retrying"

class HealthStatus(Enum):
    """Health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

@dataclass
class RegistrationPayload:
    """ALEX OS registration payload"""
    agent_name: str
    agent_version: str
    role: str
    capabilities: List[str]
    ui_features: List[str]
    endpoints: List[str]
    port: int
    health_endpoint: str
    event_bus_url: str
    webhook_url: str
    registration_time: str

@dataclass
class HealthReport:
    """Health report payload"""
    agent_name: str
    agent_version: str
    timestamp: str
    status_id: str
    workflow_state: str
    active_workflows: int
    workflow_blockers: List[str]
    log_excerpt: str
    requires_attention: bool
    attention_reason: Optional[str]
    gpt_integration_status: str
    websocket_connections: int
    active_agents: int
    system_resources: Dict[str, Any]

@dataclass
class WebhookEvent:
    """Webhook event payload"""
    event_type: str
    timestamp: str
    source: str
    data: Dict[str, Any]
    severity: str = "info"
    requires_attention: bool = False

class ALEXOSRegistrationService:
    """
    ALEX OS registration and health reporting service
    
    Features:
    - Self-registration with ALEX OS agent registry
    - Periodic health reporting
    - Webhook event emission
    - Event bus integration
    - Canonical agent index sync
    """
    
    def __init__(self):
        self.alex_os_config = config.get_alex_os_config()
        self.chainbot_config = config.get_chainbot_config()
        
        # ALEX OS endpoints
        self.registry_url = self.alex_os_config.get("module_registry_url", "http://10.42.69.208:8000")
        self.event_bus_url = self.alex_os_config.get("event_bus_url", "ws://10.42.69.208:8000/ws/events")
        self.webhook_base_url = self.alex_os_config.get("webhook_url", "http://10.42.69.208:9000/api/webhooks/chainbot")
        
        # Configuration
        self.health_interval = self.alex_os_config.get("health_check_interval", 60)
        self.retry_interval = self.alex_os_config.get("registration_retry_interval", 30)
        self.max_attempts = self.alex_os_config.get("max_registration_attempts", 10)
        
        # State
        self.registration_status = RegistrationStatus.UNREGISTERED
        self.health_status = HealthStatus.UNKNOWN
        self.registration_attempts = 0
        self.last_registration = None
        self.last_health_report = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.websocket: Optional[aiohttp.ClientWebSocketResponse] = None
        
        # Health tracking
        self.active_workflows = 0
        self.workflow_blockers = []
        self.websocket_connections = 0
        self.active_agents = 0
        self.requires_attention = False
        self.attention_reason = None
        
        # Event handlers
        self.event_handlers: Dict[str, List[callable]] = {}
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.cleanup()
    
    async def initialize(self):
        """Initialize the registration service"""
        if not self.session:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
        
        # Start registration process
        await self.register_with_alex_os()
        
        # Start health monitoring
        asyncio.create_task(self._health_monitor_loop())
        
        # Start event bus connection
        await self._connect_event_bus()
    
    async def cleanup(self):
        """Clean up resources"""
        if self.websocket:
            await self.websocket.close()
        
        if self.session:
            await self.session.close()
    
    async def register_with_alex_os(self) -> bool:
        """Register ChainBot with ALEX OS agent registry"""
        if self.registration_status == RegistrationStatus.REGISTERED:
            return True
        
        self.registration_status = RegistrationStatus.REGISTERING
        self.registration_attempts += 1
        
        try:
            # Prepare registration payload
            payload = RegistrationPayload(
                agent_name=self.chainbot_config["name"],
                agent_version=self.chainbot_config["version"],
                role=self.chainbot_config["role"],
                capabilities=self.chainbot_config["capabilities"],
                ui_features=self.chainbot_config["ui_features"],
                endpoints=self.chainbot_config["endpoints"],
                port=config.get_server_config()["port"],
                health_endpoint=self.chainbot_config["health_endpoint"],
                event_bus_url=self.event_bus_url,
                webhook_url=self.webhook_base_url,
                registration_time=datetime.utcnow().isoformat()
            )
            
            # Send registration request
            registration_data = {
                "agent_name": payload.agent_name,
                "agent_version": payload.agent_version,
                "role": payload.role,
                "capabilities": payload.capabilities,
                "ui_features": payload.ui_features,
                "endpoints": payload.endpoints,
                "port": payload.port,
                "health_endpoint": payload.health_endpoint,
                "event_bus_url": payload.event_bus_url,
                "webhook_url": payload.webhook_url,
                "registration_time": payload.registration_time
            }
            
            async with self.session.post(
                f"{self.registry_url}/api/agents/register",
                json=registration_data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    self.registration_status = RegistrationStatus.REGISTERED
                    self.last_registration = datetime.utcnow()
                    self.registration_attempts = 0
                    
                    logger.info(f"Successfully registered with ALEX OS: {result}")
                    
                    # Emit registration success event
                    await self._emit_webhook_event("registration_success", {
                        "agent_name": payload.agent_name,
                        "agent_version": payload.agent_version,
                        "registration_time": payload.registration_time
                    })
                    
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to register with ALEX OS: {response.status} - {error_text}")
                    self.registration_status = RegistrationStatus.FAILED
                    return False
                    
        except Exception as e:
            logger.error(f"Registration failed: {e}")
            self.registration_status = RegistrationStatus.FAILED
            return False
    
    async def _health_monitor_loop(self):
        """Monitor health and report to ALEX OS"""
        while True:
            try:
                # Check if we need to retry registration
                if self.registration_status == RegistrationStatus.FAILED:
                    if self.registration_attempts < self.max_attempts:
                        self.registration_status = RegistrationStatus.RETRYING
                        await asyncio.sleep(self.retry_interval)
                        await self.register_with_alex_os()
                    else:
                        logger.error(f"Max registration attempts ({self.max_attempts}) reached")
                        self.requires_attention = True
                        self.attention_reason = "Failed to register with ALEX OS after maximum attempts"
                
                # Generate health report
                health_report = await self._generate_health_report()
                
                # Send health report
                await self._send_health_report(health_report)
                
                # Emit health event
                await self._emit_webhook_event("health_report", health_report.__dict__)
                
                # Update health status
                self.last_health_report = health_report
                
                await asyncio.sleep(self.health_interval)
                
            except Exception as e:
                logger.error(f"Health monitor error: {e}")
                await asyncio.sleep(self.health_interval)
    
    async def _generate_health_report(self) -> HealthReport:
        """Generate health report"""
        # Get system status
        from . import get_agent_brain, get_websocket_manager
        
        agent_brain = get_agent_brain()
        websocket_manager = get_websocket_manager()
        
        # Check GPT integration
        gpt_status = "unknown"
        if agent_brain:
            try:
                gpt_health = await agent_brain.health_check()
                gpt_status = gpt_health.get("overall", "unknown")
            except Exception as e:
                logger.error(f"GPT health check failed: {e}")
                gpt_status = "error"
        
        # Get WebSocket stats
        ws_stats = {"total_connections": 0}
        if websocket_manager:
            ws_stats = websocket_manager.get_connection_stats()
        
        # Get system resources (placeholder)
        system_resources = {
            "cpu_usage": 0,  # TODO: Implement actual system monitoring
            "memory_usage": 0,
            "disk_usage": 0,
            "network_usage": 0
        }
        
        # Determine overall health status
        if self.registration_status == RegistrationStatus.REGISTERED and gpt_status == "healthy":
            self.health_status = HealthStatus.HEALTHY
        elif self.registration_status == RegistrationStatus.REGISTERED:
            self.health_status = HealthStatus.DEGRADED
        else:
            self.health_status = HealthStatus.UNHEALTHY
        
        return HealthReport(
            agent_name=self.chainbot_config["name"],
            agent_version=self.chainbot_config["version"],
            timestamp=datetime.utcnow().isoformat(),
            status_id=str(self.health_status.value),
            workflow_state="running" if self.active_workflows > 0 else "idle",
            active_workflows=self.active_workflows,
            workflow_blockers=self.workflow_blockers,
            log_excerpt=self._get_recent_logs(),
            requires_attention=self.requires_attention,
            attention_reason=self.attention_reason,
            gpt_integration_status=gpt_status,
            websocket_connections=ws_stats.get("total_connections", 0),
            active_agents=self.active_agents,
            system_resources=system_resources
        )
    
    async def _send_health_report(self, health_report: HealthReport):
        """Send health report to ALEX OS"""
        try:
            # Send to health endpoint
            health_url = f"{self.webhook_base_url}/health"
            async with self.session.post(health_url, json=health_report.__dict__) as response:
                if response.status != 200:
                    logger.warning(f"Health report failed: {response.status}")
            
            # Also send to status endpoint
            status_url = f"{self.webhook_base_url}/status"
            async with self.session.post(status_url, json=health_report.__dict__) as response:
                if response.status != 200:
                    logger.warning(f"Status report failed: {response.status}")
                    
        except Exception as e:
            logger.error(f"Failed to send health report: {e}")
    
    async def _connect_event_bus(self):
        """Connect to ALEX OS event bus"""
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
            event_type = event_data.get("event_type")
            source = event_data.get("source")
            
            # Call registered handlers
            if event_type in self.event_handlers:
                for handler in self.event_handlers[event_type]:
                    try:
                        await handler(event_data)
                    except Exception as e:
                        logger.error(f"Event handler error: {e}")
            
            logger.info(f"Received event: {event_type} from {source}")
            
        except Exception as e:
            logger.error(f"Event handling error: {e}")
    
    async def _emit_webhook_event(self, event_type: str, data: Dict[str, Any]):
        """Emit webhook event to ALEX OS"""
        try:
            event = WebhookEvent(
                event_type=event_type,
                timestamp=datetime.utcnow().isoformat(),
                source=self.chainbot_config["name"],
                data=data,
                severity="info",
                requires_attention=self.requires_attention
            )
            
            # Send via webhook
            webhook_url = f"{self.registry_url}/api/webhooks/chainbot/{event_type}"
            async with self.session.post(webhook_url, json=event.__dict__) as response:
                if response.status != 200:
                    logger.warning(f"Webhook event failed: {response.status}")
            
            # Also send via WebSocket if connected
            if self.websocket and not self.websocket.closed:
                await self.websocket.send_json(event.__dict__)
                
        except Exception as e:
            logger.error(f"Failed to emit webhook event: {e}")
    
    def _get_recent_logs(self) -> str:
        """Get recent log excerpt"""
        # TODO: Implement actual log reading
        return "ChainBot operational - no recent errors"
    
    def update_workflow_state(self, active_workflows: int, blockers: List[str] = None):
        """Update workflow state"""
        self.active_workflows = active_workflows
        if blockers:
            self.workflow_blockers = blockers
        else:
            self.workflow_blockers = []
    
    def update_agent_state(self, active_agents: int):
        """Update agent state"""
        self.active_agents = active_agents
    
    def update_websocket_state(self, connections: int):
        """Update WebSocket state"""
        self.websocket_connections = connections
    
    def set_attention_required(self, required: bool, reason: str = None):
        """Set attention required flag"""
        self.requires_attention = required
        self.attention_reason = reason
    
    def register_event_handler(self, event_type: str, handler: callable):
        """Register event handler"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)
    
    def get_registration_status(self) -> Dict[str, Any]:
        """Get registration status"""
        return {
            "status": self.registration_status.value,
            "health_status": self.health_status.value,
            "registration_attempts": self.registration_attempts,
            "last_registration": self.last_registration.isoformat() if self.last_registration else None,
            "last_health_report": self.last_health_report.timestamp if self.last_health_report else None,
            "requires_attention": self.requires_attention,
            "attention_reason": self.attention_reason
        }

# Global instance
alex_os_registration: Optional[ALEXOSRegistrationService] = None

async def initialize_alex_os_registration():
    """Initialize ALEX OS registration service"""
    global alex_os_registration
    
    alex_os_registration = ALEXOSRegistrationService()
    await alex_os_registration.initialize()
    
    return alex_os_registration

def get_alex_os_registration() -> Optional[ALEXOSRegistrationService]:
    """Get ALEX OS registration service instance"""
    return alex_os_registration 