"""
Enhanced WebSocket Manager for ChainBot GUI

Provides real-time communication for:
- Agent Map window updates
- Code Agent window collaboration
- Chat window messaging
- Watchtower window monitoring
- Hot-swap window management
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Set, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

class WindowType(Enum):
    """GUI window types"""
    AGENT_MAP = "agent_map"
    CODE_AGENT = "code_agent"
    CHAT = "chat"
    WATCHTOWER = "watchtower"
    WORKFLOW_BUILDER = "workflow_builder"
    DATA_IMPORTER = "data_importer"

class MessageType(Enum):
    """WebSocket message types"""
    # Agent Map messages
    AGENT_STATUS_UPDATE = "agent_status_update"
    AGENT_SPAWN = "agent_spawn"
    AGENT_KILL = "agent_kill"
    AGENT_MAP_UPDATE = "agent_map_update"
    
    # Code Agent messages
    CODE_CHANGE = "code_change"
    CODE_SAVE = "code_save"
    CODE_RUN = "code_run"
    CODE_DIFF = "code_diff"
    HARRY_SUGGESTION = "harry_suggestion"
    
    # Chat messages
    CHAT_MESSAGE = "chat_message"
    CHAT_HISTORY = "chat_history"
    AGENT_RESPONSE = "agent_response"
    SLASH_COMMAND = "slash_command"
    
    # Watchtower messages
    LOG_UPDATE = "log_update"
    SYSTEM_STATS = "system_stats"
    ALERT = "alert"
    INCIDENT = "incident"
    
    # Workflow messages
    WORKFLOW_UPDATE = "workflow_update"
    WORKFLOW_START = "workflow_start"
    WORKFLOW_COMPLETE = "workflow_complete"
    WORKFLOW_ERROR = "workflow_error"
    
    # System messages
    WINDOW_OPEN = "window_open"
    WINDOW_CLOSE = "window_close"
    WINDOW_FOCUS = "window_focus"
    HOT_SWAP = "hot_swap"
    HEALTH_CHECK = "health_check"

@dataclass
class WebSocketMessage:
    """WebSocket message structure"""
    message_type: MessageType
    window_type: WindowType
    timestamp: datetime
    data: Dict[str, Any] = field(default_factory=dict)
    user_id: Optional[str] = None
    session_id: Optional[str] = None

@dataclass
class WindowConnection:
    """Window connection info"""
    websocket: WebSocket
    window_type: WindowType
    user_id: Optional[str]
    session_id: Optional[str]
    connected_at: datetime
    last_activity: datetime
    subscriptions: Set[str] = field(default_factory=set)

class WebSocketManager:
    """
    Enhanced WebSocket manager for ChainBot GUI
    
    Features:
    - Multi-window support (Agent Map, Code Agent, Chat, Watchtower)
    - Hot-swap window management
    - Real-time updates and collaboration
    - Message routing and filtering
    - Connection management and health monitoring
    """
    
    def __init__(self):
        self.active_connections: Dict[str, WindowConnection] = {}
        self.window_connections: Dict[WindowType, List[str]] = {
            window_type: [] for window_type in WindowType
        }
        self.message_handlers: Dict[MessageType, List[Callable]] = {
            message_type: [] for message_type in MessageType
        }
        self.broadcast_handlers: Dict[WindowType, List[Callable]] = {
            window_type: [] for window_type in WindowType
        }
    
    async def connect(self, websocket: WebSocket, window_type: WindowType, 
                     user_id: Optional[str] = None, session_id: Optional[str] = None) -> str:
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        connection_id = f"{window_type.value}_{user_id}_{session_id}_{datetime.utcnow().timestamp()}"
        
        connection = WindowConnection(
            websocket=websocket,
            window_type=window_type,
            user_id=user_id,
            session_id=session_id,
            connected_at=datetime.utcnow(),
            last_activity=datetime.utcnow()
        )
        
        self.active_connections[connection_id] = connection
        self.window_connections[window_type].append(connection_id)
        
        logger.info(f"New connection: {connection_id} for {window_type.value}")
        
        # Send welcome message
        welcome_message = WebSocketMessage(
            message_type=MessageType.WINDOW_OPEN,
            window_type=window_type,
            timestamp=datetime.utcnow(),
            data={
                "connection_id": connection_id,
                "window_type": window_type.value,
                "capabilities": self._get_window_capabilities(window_type)
            }
        )
        
        await self.send_message(connection_id, welcome_message)
        
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """Disconnect a WebSocket connection"""
        if connection_id in self.active_connections:
            connection = self.active_connections[connection_id]
            
            # Remove from window connections
            if connection_id in self.window_connections[connection.window_type]:
                self.window_connections[connection.window_type].remove(connection_id)
            
            # Close WebSocket
            try:
                await connection.websocket.close()
            except Exception as e:
                logger.error(f"Error closing WebSocket: {e}")
            
            # Remove from active connections
            del self.active_connections[connection_id]
            
            logger.info(f"Connection closed: {connection_id}")
    
    async def send_message(self, connection_id: str, message: WebSocketMessage):
        """Send message to specific connection"""
        if connection_id not in self.active_connections:
            logger.warning(f"Connection not found: {connection_id}")
            return
        
        connection = self.active_connections[connection_id]
        
        try:
            message_data = {
                "type": message.message_type.value,
                "window_type": message.window_type.value,
                "timestamp": message.timestamp.isoformat(),
                "data": message.data
            }
            
            await connection.websocket.send_text(json.dumps(message_data))
            connection.last_activity = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Error sending message to {connection_id}: {e}")
            await self.disconnect(connection_id)
    
    async def broadcast_to_window(self, window_type: WindowType, message: WebSocketMessage):
        """Broadcast message to all connections of a specific window type"""
        connection_ids = self.window_connections[window_type]
        
        for connection_id in connection_ids:
            await self.send_message(connection_id, message)
    
    async def broadcast_to_all(self, message: WebSocketMessage):
        """Broadcast message to all connections"""
        for connection_id in list(self.active_connections.keys()):
            await self.send_message(connection_id, message)
    
    async def handle_message(self, connection_id: str, message_data: Dict[str, Any]):
        """Handle incoming message from client"""
        if connection_id not in self.active_connections:
            return
        
        connection = self.active_connections[connection_id]
        connection.last_activity = datetime.utcnow()
        
        try:
            message_type = MessageType(message_data.get("type"))
            window_type = WindowType(message_data.get("window_type"))
            data = message_data.get("data", {})
            
            message = WebSocketMessage(
                message_type=message_type,
                window_type=window_type,
                timestamp=datetime.utcnow(),
                data=data,
                user_id=connection.user_id,
                session_id=connection.session_id
            )
            
            # Call registered handlers
            if message_type in self.message_handlers:
                for handler in self.message_handlers[message_type]:
                    try:
                        await handler(message, connection_id)
                    except Exception as e:
                        logger.error(f"Message handler error: {e}")
            
            # Handle specific message types
            await self._handle_specific_message(message, connection_id)
            
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def _handle_specific_message(self, message: WebSocketMessage, connection_id: str):
        """Handle specific message types"""
        if message.message_type == MessageType.WINDOW_FOCUS:
            # Handle window focus
            await self._handle_window_focus(message, connection_id)
        
        elif message.message_type == MessageType.HOT_SWAP:
            # Handle hot-swap request
            await self._handle_hot_swap(message, connection_id)
        
        elif message.message_type == MessageType.SLASH_COMMAND:
            # Handle slash commands
            await self._handle_slash_command(message, connection_id)
    
    async def _handle_window_focus(self, message: WebSocketMessage, connection_id: str):
        """Handle window focus event"""
        window_type = message.window_type
        data = message.data
        
        # Update window state
        focus_message = WebSocketMessage(
            message_type=MessageType.WINDOW_FOCUS,
            window_type=window_type,
            timestamp=datetime.utcnow(),
            data={
                "focused": True,
                "user_id": message.user_id,
                "session_id": message.session_id
            }
        )
        
        await self.broadcast_to_window(window_type, focus_message)
    
    async def _handle_hot_swap(self, message: WebSocketMessage, connection_id: str):
        """Handle hot-swap request"""
        data = message.data
        target_window = WindowType(data.get("target_window"))
        swap_data = data.get("swap_data", {})
        
        # Perform hot-swap
        swap_message = WebSocketMessage(
            message_type=MessageType.HOT_SWAP,
            window_type=target_window,
            timestamp=datetime.utcnow(),
            data={
                "source_window": message.window_type.value,
                "swap_data": swap_data,
                "user_id": message.user_id
            }
        )
        
        await self.broadcast_to_window(target_window, swap_message)
    
    async def _handle_slash_command(self, message: WebSocketMessage, connection_id: str):
        """Handle slash commands"""
        data = message.data
        command = data.get("command", "")
        args = data.get("args", [])
        
        # Process slash commands
        if command.startswith("/run"):
            # Run workflow
            workflow_name = args[0] if args else "default"
            await self._execute_workflow(workflow_name, message.user_id)
        
        elif command.startswith("/spawn"):
            # Spawn agent
            agent_type = args[0] if args else "general_assistant"
            await self._spawn_agent(agent_type, message.user_id)
        
        elif command.startswith("/kill"):
            # Kill agent
            agent_id = args[0] if args else None
            if agent_id:
                await self._kill_agent(agent_id, message.user_id)
    
    async def _execute_workflow(self, workflow_name: str, user_id: Optional[str]):
        """Execute a workflow"""
        from .workflow_orchestrator import get_workflow_orchestrator
        
        orchestrator = get_workflow_orchestrator()
        if orchestrator:
            try:
                workflow_id = await orchestrator.start_workflow(workflow_name, user_id)
                
                # Broadcast workflow start
                workflow_message = WebSocketMessage(
                    message_type=MessageType.WORKFLOW_START,
                    window_type=WindowType.WORKFLOW_BUILDER,
                    timestamp=datetime.utcnow(),
                    data={
                        "workflow_name": workflow_name,
                        "workflow_id": workflow_id,
                        "user_id": user_id
                    }
                )
                
                await self.broadcast_to_window(WindowType.WORKFLOW_BUILDER, workflow_message)
                
            except Exception as e:
                logger.error(f"Workflow execution error: {e}")
    
    async def _spawn_agent(self, agent_type: str, user_id: Optional[str]):
        """Spawn a new agent"""
        from .ai_agent_manager import get_agent_manager
        
        agent_manager = get_agent_manager()
        if agent_manager:
            try:
                agent_id = await agent_manager.spawn_agent(agent_type, user_id)
                
                # Broadcast agent spawn
                spawn_message = WebSocketMessage(
                    message_type=MessageType.AGENT_SPAWN,
                    window_type=WindowType.AGENT_MAP,
                    timestamp=datetime.utcnow(),
                    data={
                        "agent_type": agent_type,
                        "agent_id": agent_id,
                        "user_id": user_id
                    }
                )
                
                await self.broadcast_to_window(WindowType.AGENT_MAP, spawn_message)
                
            except Exception as e:
                logger.error(f"Agent spawn error: {e}")
    
    async def _kill_agent(self, agent_id: str, user_id: Optional[str]):
        """Kill an agent"""
        from .ai_agent_manager import get_agent_manager
        
        agent_manager = get_agent_manager()
        if agent_manager:
            try:
                await agent_manager.kill_agent(agent_id)
                
                # Broadcast agent kill
                kill_message = WebSocketMessage(
                    message_type=MessageType.AGENT_KILL,
                    window_type=WindowType.AGENT_MAP,
                    timestamp=datetime.utcnow(),
                    data={
                        "agent_id": agent_id,
                        "user_id": user_id
                    }
                )
                
                await self.broadcast_to_window(WindowType.AGENT_MAP, kill_message)
                
            except Exception as e:
                logger.error(f"Agent kill error: {e}")
    
    def register_message_handler(self, message_type: MessageType, handler: Callable):
        """Register message handler"""
        if message_type not in self.message_handlers:
            self.message_handlers[message_type] = []
        self.message_handlers[message_type].append(handler)
    
    def register_broadcast_handler(self, window_type: WindowType, handler: Callable):
        """Register broadcast handler"""
        if window_type not in self.broadcast_handlers:
            self.broadcast_handlers[window_type] = []
        self.broadcast_handlers[window_type].append(handler)
    
    def _get_window_capabilities(self, window_type: WindowType) -> List[str]:
        """Get capabilities for a window type"""
        capabilities = {
            WindowType.AGENT_MAP: [
                "agent_spawn", "agent_kill", "agent_status", "agent_config",
                "dependency_view", "real_time_updates", "drag_drop"
            ],
            WindowType.CODE_AGENT: [
                "code_edit", "code_save", "code_run", "code_diff",
                "harry_suggestions", "syntax_highlighting", "auto_complete"
            ],
            WindowType.CHAT: [
                "multi_agent_chat", "markdown_support", "slash_commands",
                "context_recall", "message_pinning", "reactions"
            ],
            WindowType.WATCHTOWER: [
                "log_streaming", "system_stats", "alert_management",
                "incident_timeline", "forensic_search", "escalation"
            ],
            WindowType.WORKFLOW_BUILDER: [
                "workflow_creation", "drag_drop_builder", "workflow_execution",
                "real_time_monitoring", "error_handling", "rollback"
            ],
            WindowType.DATA_IMPORTER: [
                "file_upload", "data_parsing", "context_assignment",
                "search_filtering", "metadata_management"
            ]
        }
        
        return capabilities.get(window_type, [])
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        stats = {
            "total_connections": len(self.active_connections),
            "window_connections": {
                window_type.value: len(connections)
                for window_type, connections in self.window_connections.items()
            },
            "active_users": len(set(
                conn.user_id for conn in self.active_connections.values()
                if conn.user_id
            )),
            "active_sessions": len(set(
                conn.session_id for conn in self.active_connections.values()
                if conn.session_id
            ))
        }
        
        return stats
    
    async def cleanup_inactive_connections(self, timeout_minutes: int = 30):
        """Clean up inactive connections"""
        current_time = datetime.utcnow()
        timeout_delta = timedelta(minutes=timeout_minutes)
        
        inactive_connections = []
        
        for connection_id, connection in self.active_connections.items():
            if current_time - connection.last_activity > timeout_delta:
                inactive_connections.append(connection_id)
        
        for connection_id in inactive_connections:
            await self.disconnect(connection_id)
        
        if inactive_connections:
            logger.info(f"Cleaned up {len(inactive_connections)} inactive connections")

# Global instance
websocket_manager: Optional[WebSocketManager] = None

def get_websocket_manager() -> WebSocketManager:
    """Get WebSocket manager instance"""
    global websocket_manager
    if not websocket_manager:
        websocket_manager = WebSocketManager()
    return websocket_manager 