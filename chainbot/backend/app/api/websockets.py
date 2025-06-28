"""
Enhanced WebSocket API Routes for ChainBot GUI

Provides real-time communication for:
- Agent Map window
- Code Agent window  
- Chat window
- Watchtower window
- Workflow Builder window
- Data Importer window
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from typing import Optional, Dict, Any
import json
import logging
from datetime import datetime

from ..services.websocket_manager import (
    get_websocket_manager, WindowType, MessageType, WebSocketMessage
)
from ..services.auth_dependencies import get_current_user_optional
from ..models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websockets"])

# WebSocket manager instance
ws_manager = get_websocket_manager()

@router.websocket("/agent-map/{user_id}")
async def agent_map_websocket(
    websocket: WebSocket,
    user_id: str,
    session_id: Optional[str] = None
):
    """WebSocket endpoint for Agent Map window"""
    try:
        connection_id = await ws_manager.connect(
            websocket, 
            WindowType.AGENT_MAP, 
            user_id, 
            session_id
        )
        
        # Send initial agent map data
        await _send_agent_map_data(connection_id)
        
        # Handle messages
        await _handle_websocket_messages(websocket, connection_id)
        
    except WebSocketDisconnect:
        await ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"Agent Map WebSocket error: {e}")
        if 'connection_id' in locals():
            await ws_manager.disconnect(connection_id)

@router.websocket("/code-agent/{user_id}")
async def code_agent_websocket(
    websocket: WebSocket,
    user_id: str,
    session_id: Optional[str] = None
):
    """WebSocket endpoint for Code Agent window"""
    try:
        connection_id = await ws_manager.connect(
            websocket, 
            WindowType.CODE_AGENT, 
            user_id, 
            session_id
        )
        
        # Send initial code agent data
        await _send_code_agent_data(connection_id)
        
        # Handle messages
        await _handle_websocket_messages(websocket, connection_id)
        
    except WebSocketDisconnect:
        await ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"Code Agent WebSocket error: {e}")
        if 'connection_id' in locals():
            await ws_manager.disconnect(connection_id)

@router.websocket("/chat/{user_id}")
async def chat_websocket(
    websocket: WebSocket,
    user_id: str,
    session_id: Optional[str] = None
):
    """WebSocket endpoint for Chat window"""
    try:
        connection_id = await ws_manager.connect(
            websocket, 
            WindowType.CHAT, 
            user_id, 
            session_id
        )
        
        # Send initial chat data
        await _send_chat_data(connection_id)
        
        # Handle messages
        await _handle_websocket_messages(websocket, connection_id)
        
    except WebSocketDisconnect:
        await ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}")
        if 'connection_id' in locals():
            await ws_manager.disconnect(connection_id)

@router.websocket("/watchtower/{user_id}")
async def watchtower_websocket(
    websocket: WebSocket,
    user_id: str,
    session_id: Optional[str] = None
):
    """WebSocket endpoint for Watchtower window"""
    try:
        connection_id = await ws_manager.connect(
            websocket, 
            WindowType.WATCHTOWER, 
            user_id, 
            session_id
        )
        
        # Send initial watchtower data
        await _send_watchtower_data(connection_id)
        
        # Handle messages
        await _handle_websocket_messages(websocket, connection_id)
        
    except WebSocketDisconnect:
        await ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"Watchtower WebSocket error: {e}")
        if 'connection_id' in locals():
            await ws_manager.disconnect(connection_id)

@router.websocket("/workflow-builder/{user_id}")
async def workflow_builder_websocket(
    websocket: WebSocket,
    user_id: str,
    session_id: Optional[str] = None
):
    """WebSocket endpoint for Workflow Builder window"""
    try:
        connection_id = await ws_manager.connect(
            websocket, 
            WindowType.WORKFLOW_BUILDER, 
            user_id, 
            session_id
        )
        
        # Send initial workflow builder data
        await _send_workflow_builder_data(connection_id)
        
        # Handle messages
        await _handle_websocket_messages(websocket, connection_id)
        
    except WebSocketDisconnect:
        await ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"Workflow Builder WebSocket error: {e}")
        if 'connection_id' in locals():
            await ws_manager.disconnect(connection_id)

@router.websocket("/data-importer/{user_id}")
async def data_importer_websocket(
    websocket: WebSocket,
    user_id: str,
    session_id: Optional[str] = None
):
    """WebSocket endpoint for Data Importer window"""
    try:
        connection_id = await ws_manager.connect(
            websocket, 
            WindowType.DATA_IMPORTER, 
            user_id, 
            session_id
        )
        
        # Send initial data importer data
        await _send_data_importer_data(connection_id)
        
        # Handle messages
        await _handle_websocket_messages(websocket, connection_id)
        
    except WebSocketDisconnect:
        await ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"Data Importer WebSocket error: {e}")
        if 'connection_id' in locals():
            await ws_manager.disconnect(connection_id)

async def _handle_websocket_messages(websocket: WebSocket, connection_id: str):
    """Handle incoming WebSocket messages"""
    try:
        while True:
            # Receive message
            message_text = await websocket.receive_text()
            message_data = json.loads(message_text)
            
            # Handle message
            await ws_manager.handle_message(connection_id, message_data)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id}")
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON message from {connection_id}")
    except Exception as e:
        logger.error(f"Error handling WebSocket message: {e}")

async def _send_agent_map_data(connection_id: str):
    """Send initial agent map data"""
    try:
        from ..services.ai_agent_manager import get_agent_manager
        
        agent_manager = get_agent_manager()
        if agent_manager:
            agents = await agent_manager.get_all_agents()
            
            # Create agent map data
            agent_map_data = {
                "agents": [
                    {
                        "id": agent.id,
                        "name": agent.name,
                        "type": agent.agent_type,
                        "status": agent.status,
                        "position": {"x": 0, "y": 0},  # Default position
                        "connections": [],  # Agent connections
                        "last_activity": agent.last_activity.isoformat() if agent.last_activity else None
                    }
                    for agent in agents
                ],
                "connections": [],  # Inter-agent connections
                "layout": "auto"  # Layout type
            }
            
            # Send agent map update
            message = WebSocketMessage(
                message_type=MessageType.AGENT_MAP_UPDATE,
                window_type=WindowType.AGENT_MAP,
                timestamp=datetime.utcnow(),
                data=agent_map_data
            )
            
            await ws_manager.send_message(connection_id, message)
            
    except Exception as e:
        logger.error(f"Error sending agent map data: {e}")

async def _send_code_agent_data(connection_id: str):
    """Send initial code agent data"""
    try:
        # Get available agents for code editing
        from ..services.ai_agent_manager import get_agent_manager
        
        agent_manager = get_agent_manager()
        if agent_manager:
            agents = await agent_manager.get_all_agents()
            
            code_agent_data = {
                "available_agents": [
                    {
                        "id": agent.id,
                        "name": agent.name,
                        "type": agent.agent_type,
                        "has_code": True,  # Assume all agents have code
                        "last_modified": agent.updated_at.isoformat() if agent.updated_at else None
                    }
                    for agent in agents
                ],
                "current_agent": None,
                "file_tree": [],
                "open_files": []
            }
            
            message = WebSocketMessage(
                message_type=MessageType.CODE_CHANGE,
                window_type=WindowType.CODE_AGENT,
                timestamp=datetime.utcnow(),
                data=code_agent_data
            )
            
            await ws_manager.send_message(connection_id, message)
            
    except Exception as e:
        logger.error(f"Error sending code agent data: {e}")

async def _send_chat_data(connection_id: str):
    """Send initial chat data"""
    try:
        from ..services.agent_brain import get_agent_brain
        
        agent_brain = get_agent_brain()
        if agent_brain:
            # Get conversation history for the user
            user_id = ws_manager.active_connections[connection_id].user_id
            conversation_history = agent_brain.get_conversation_history(user_id) if user_id else []
            
            chat_data = {
                "conversation_history": conversation_history,
                "available_agents": [
                    {
                        "id": persona.name,
                        "name": persona.name,
                        "description": persona.description,
                        "capabilities": persona.capabilities
                    }
                    for persona in agent_brain.list_personas()
                ],
                "active_sessions": []
            }
            
            message = WebSocketMessage(
                message_type=MessageType.CHAT_HISTORY,
                window_type=WindowType.CHAT,
                timestamp=datetime.utcnow(),
                data=chat_data
            )
            
            await ws_manager.send_message(connection_id, message)
            
    except Exception as e:
        logger.error(f"Error sending chat data: {e}")

async def _send_watchtower_data(connection_id: str):
    """Send initial watchtower data"""
    try:
        from ..services import get_agent_brain
        
        agent_brain = get_agent_brain()
        gpt_health = await agent_brain.health_check() if agent_brain else {"overall": "unknown"}
        
        watchtower_data = {
            "system_stats": {
                "cpu_usage": 0,  # Placeholder
                "memory_usage": 0,  # Placeholder
                "disk_usage": 0,  # Placeholder
                "network_usage": 0  # Placeholder
            },
            "gpt_integration": gpt_health,
            "recent_logs": [],
            "active_alerts": [],
            "incidents": []
        }
        
        message = WebSocketMessage(
            message_type=MessageType.SYSTEM_STATS,
            window_type=WindowType.WATCHTOWER,
            timestamp=datetime.utcnow(),
            data=watchtower_data
        )
        
        await ws_manager.send_message(connection_id, message)
        
    except Exception as e:
        logger.error(f"Error sending watchtower data: {e}")

async def _send_workflow_builder_data(connection_id: str):
    """Send initial workflow builder data"""
    try:
        from ..services.workflow_orchestrator import get_workflow_orchestrator
        
        orchestrator = get_workflow_orchestrator()
        if orchestrator:
            workflows = await orchestrator.get_all_workflows()
            
            workflow_builder_data = {
                "available_workflows": [
                    {
                        "id": workflow.id,
                        "name": workflow.name,
                        "description": workflow.description,
                        "status": workflow.status,
                        "created_at": workflow.created_at.isoformat() if workflow.created_at else None
                    }
                    for workflow in workflows
                ],
                "workflow_templates": [],
                "current_workflow": None
            }
            
            message = WebSocketMessage(
                message_type=MessageType.WORKFLOW_UPDATE,
                window_type=WindowType.WORKFLOW_BUILDER,
                timestamp=datetime.utcnow(),
                data=workflow_builder_data
            )
            
            await ws_manager.send_message(connection_id, message)
            
    except Exception as e:
        logger.error(f"Error sending workflow builder data: {e}")

async def _send_data_importer_data(connection_id: str):
    """Send initial data importer data"""
    try:
        from ..services.chatgpt_data_importer import get_data_importer
        
        data_importer = get_data_importer()
        if data_importer:
            imported_data = await data_importer.get_all_imported_data()
            
            data_importer_data = {
                "imported_files": [
                    {
                        "id": data.id,
                        "filename": data.filename,
                        "import_date": data.created_at.isoformat() if data.created_at else None,
                        "size": len(data.content) if data.content else 0,
                        "status": "imported"
                    }
                    for data in imported_data
                ],
                "upload_progress": [],
                "search_filters": []
            }
            
            message = WebSocketMessage(
                message_type=MessageType.LOG_UPDATE,
                window_type=WindowType.DATA_IMPORTER,
                timestamp=datetime.utcnow(),
                data=data_importer_data
            )
            
            await ws_manager.send_message(connection_id, message)
            
    except Exception as e:
        logger.error(f"Error sending data importer data: {e}")

@router.get("/status")
async def get_websocket_status():
    """Get WebSocket connection status"""
    try:
        stats = ws_manager.get_connection_stats()
        return {
            "status": "active",
            "connections": stats,
            "windows": {
                window_type.value: {
                    "connections": len(connections),
                    "capabilities": ws_manager._get_window_capabilities(window_type)
                }
                for window_type, connections in ws_manager.window_connections.items()
            }
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get WebSocket status: {str(e)}"
        )

@router.post("/broadcast/{window_type}")
async def broadcast_to_window(
    window_type: str,
    message_type: str,
    data: Dict[str, Any]
):
    """Broadcast message to a specific window type"""
    try:
        # Validate window type
        try:
            window_enum = WindowType(window_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid window type: {window_type}"
            )
        
        # Validate message type
        try:
            message_enum = MessageType(message_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid message type: {message_type}"
            )
        
        # Create and send message
        message = WebSocketMessage(
            message_type=message_enum,
            window_type=window_enum,
            timestamp=datetime.utcnow(),
            data=data
        )
        
        await ws_manager.broadcast_to_window(window_enum, message)
        
        return {"message": f"Broadcasted to {window_type} window"}
        
    except Exception as e:
        logger.error(f"Error broadcasting message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to broadcast message: {str(e)}"
        ) 