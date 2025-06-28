"""
Webhook API Routes for ALEX OS Integration

Provides webhook endpoints for:
- Workflow events (started, completed, failed)
- Agent events (spawned, terminated)
- Entanglement events (created, destroyed)
- Health and status reporting
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, Optional
import logging
from datetime import datetime

from ..services.alex_os_registration import get_alex_os_registration
from ..services.audit import get_audit_service
from ..schemas.audit_log import AuditLogCreate
from ..config import config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks/chainbot", tags=["webhooks"])

# Webhook endpoints for ALEX OS integration

@router.post("/workflow/started")
async def workflow_started_webhook(data: Dict[str, Any]):
    """Webhook for workflow started event"""
    try:
        # Log to audit trail
        audit_service = get_audit_service()
        if audit_service:
            audit_log = AuditLogCreate(
                action="workflow_started",
                user_id=data.get("user_id"),
                resource_type="workflow",
                resource_id=data.get("workflow_id"),
                details=data,
                timestamp=datetime.utcnow()
            )
            await audit_service.create_log(audit_log)
        
        # Emit to ALEX OS
        registration_service = get_alex_os_registration()
        if registration_service:
            await registration_service._emit_webhook_event("workflow_started", data)
        
        logger.info(f"Workflow started: {data.get('workflow_id')}")
        return {"status": "success", "message": "Workflow started event processed"}
        
    except Exception as e:
        logger.error(f"Error processing workflow started webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process workflow started event: {str(e)}"
        )

@router.post("/workflow/completed")
async def workflow_completed_webhook(data: Dict[str, Any]):
    """Webhook for workflow completed event"""
    try:
        # Log to audit trail
        audit_service = get_audit_service()
        if audit_service:
            audit_log = AuditLogCreate(
                action="workflow_completed",
                user_id=data.get("user_id"),
                resource_type="workflow",
                resource_id=data.get("workflow_id"),
                details=data,
                timestamp=datetime.utcnow()
            )
            await audit_service.create_log(audit_log)
        
        # Emit to ALEX OS
        registration_service = get_alex_os_registration()
        if registration_service:
            await registration_service._emit_webhook_event("workflow_completed", data)
        
        logger.info(f"Workflow completed: {data.get('workflow_id')}")
        return {"status": "success", "message": "Workflow completed event processed"}
        
    except Exception as e:
        logger.error(f"Error processing workflow completed webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process workflow completed event: {str(e)}"
        )

@router.post("/workflow/failed")
async def workflow_failed_webhook(data: Dict[str, Any]):
    """Webhook for workflow failed event"""
    try:
        # Log to audit trail
        audit_service = get_audit_service()
        if audit_service:
            audit_log = AuditLogCreate(
                action="workflow_failed",
                user_id=data.get("user_id"),
                resource_type="workflow",
                resource_id=data.get("workflow_id"),
                details=data,
                timestamp=datetime.utcnow()
            )
            await audit_service.create_log(audit_log)
        
        # Set attention required
        registration_service = get_alex_os_registration()
        if registration_service:
            registration_service.set_attention_required(
                True, 
                f"Workflow {data.get('workflow_id')} failed: {data.get('error', 'Unknown error')}"
            )
            await registration_service._emit_webhook_event("workflow_failed", data)
        
        logger.error(f"Workflow failed: {data.get('workflow_id')} - {data.get('error')}")
        return {"status": "success", "message": "Workflow failed event processed"}
        
    except Exception as e:
        logger.error(f"Error processing workflow failed webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process workflow failed event: {str(e)}"
        )

@router.post("/agent/spawned")
async def agent_spawned_webhook(data: Dict[str, Any]):
    """Webhook for agent spawned event"""
    try:
        # Log to audit trail
        audit_service = get_audit_service()
        if audit_service:
            audit_log = AuditLogCreate(
                action="agent_spawned",
                user_id=data.get("user_id"),
                resource_type="agent",
                resource_id=data.get("agent_id"),
                details=data,
                timestamp=datetime.utcnow()
            )
            await audit_service.create_log(audit_log)
        
        # Emit to ALEX OS
        registration_service = get_alex_os_registration()
        if registration_service:
            await registration_service._emit_webhook_event("agent_spawned", data)
        
        logger.info(f"Agent spawned: {data.get('agent_id')}")
        return {"status": "success", "message": "Agent spawned event processed"}
        
    except Exception as e:
        logger.error(f"Error processing agent spawned webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process agent spawned event: {str(e)}"
        )

@router.post("/agent/terminated")
async def agent_terminated_webhook(data: Dict[str, Any]):
    """Webhook for agent terminated event"""
    try:
        # Log to audit trail
        audit_service = get_audit_service()
        if audit_service:
            audit_log = AuditLogCreate(
                action="agent_terminated",
                user_id=data.get("user_id"),
                resource_type="agent",
                resource_id=data.get("agent_id"),
                details=data,
                timestamp=datetime.utcnow()
            )
            await audit_service.create_log(audit_log)
        
        # Emit to ALEX OS
        registration_service = get_alex_os_registration()
        if registration_service:
            await registration_service._emit_webhook_event("agent_terminated", data)
        
        logger.info(f"Agent terminated: {data.get('agent_id')}")
        return {"status": "success", "message": "Agent terminated event processed"}
        
    except Exception as e:
        logger.error(f"Error processing agent terminated webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process agent terminated event: {str(e)}"
        )

@router.post("/entanglement/created")
async def entanglement_created_webhook(data: Dict[str, Any]):
    """Webhook for entanglement created event"""
    try:
        # Log to audit trail
        audit_service = get_audit_service()
        if audit_service:
            audit_log = AuditLogCreate(
                action="entanglement_created",
                user_id=data.get("user_id"),
                resource_type="entanglement",
                resource_id=data.get("entanglement_id"),
                details=data,
                timestamp=datetime.utcnow()
            )
            await audit_service.create_log(audit_log)
        
        # Emit to ALEX OS
        registration_service = get_alex_os_registration()
        if registration_service:
            await registration_service._emit_webhook_event("entanglement_created", data)
        
        logger.info(f"Entanglement created: {data.get('entanglement_id')}")
        return {"status": "success", "message": "Entanglement created event processed"}
        
    except Exception as e:
        logger.error(f"Error processing entanglement created webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process entanglement created event: {str(e)}"
        )

@router.post("/entanglement/destroyed")
async def entanglement_destroyed_webhook(data: Dict[str, Any]):
    """Webhook for entanglement destroyed event"""
    try:
        # Log to audit trail
        audit_service = get_audit_service()
        if audit_service:
            audit_log = AuditLogCreate(
                action="entanglement_destroyed",
                user_id=data.get("user_id"),
                resource_type="entanglement",
                resource_id=data.get("entanglement_id"),
                details=data,
                timestamp=datetime.utcnow()
            )
            await audit_service.create_log(audit_log)
        
        # Emit to ALEX OS
        registration_service = get_alex_os_registration()
        if registration_service:
            await registration_service._emit_webhook_event("entanglement_destroyed", data)
        
        logger.info(f"Entanglement destroyed: {data.get('entanglement_id')}")
        return {"status": "success", "message": "Entanglement destroyed event processed"}
        
    except Exception as e:
        logger.error(f"Error processing entanglement destroyed webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process entanglement destroyed event: {str(e)}"
        )

@router.post("/health")
async def health_webhook(data: Dict[str, Any]):
    """Webhook for health status updates"""
    try:
        # Update registration service health state
        registration_service = get_alex_os_registration()
        if registration_service:
            # Update workflow state
            if "active_workflows" in data:
                registration_service.update_workflow_state(
                    data["active_workflows"],
                    data.get("workflow_blockers", [])
                )
            
            # Update agent state
            if "active_agents" in data:
                registration_service.update_agent_state(data["active_agents"])
            
            # Update WebSocket state
            if "websocket_connections" in data:
                registration_service.update_websocket_state(data["websocket_connections"])
            
            # Update attention required
            if "requires_attention" in data:
                attention_reason = data.get("attention_reason")
                registration_service.set_attention_required(
                    data["requires_attention"],
                    attention_reason if attention_reason else None
                )
        
        logger.info("Health status updated")
        return {"status": "success", "message": "Health status updated"}
        
    except Exception as e:
        logger.error(f"Error processing health webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process health status: {str(e)}"
        )

@router.post("/status")
async def status_webhook(data: Dict[str, Any]):
    """Webhook for status updates (alias for health)"""
    return await health_webhook(data)

@router.get("/health")
async def get_health_status():
    """Get current health status"""
    try:
        registration_service = get_alex_os_registration()
        if registration_service:
            status_info = registration_service.get_registration_status()
            return {
                "status": "success",
                "data": status_info,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return {
                "status": "error",
                "message": "Registration service not available",
                "timestamp": datetime.utcnow().isoformat()
            }
        
    except Exception as e:
        logger.error(f"Error getting health status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get health status: {str(e)}"
        )

@router.get("/status")
async def get_status():
    """Get current status (alias for health)"""
    return await get_health_status()

@router.post("/event")
async def generic_event_webhook(data: Dict[str, Any]):
    """Generic webhook for any event type"""
    try:
        event_type = data.get("event_type", "unknown")
        
        # Log to audit trail
        audit_service = get_audit_service()
        if audit_service:
            audit_log = AuditLogCreate(
                action=f"webhook_event_{event_type}",
                user_id=data.get("user_id"),
                resource_type=data.get("resource_type", "unknown"),
                resource_id=data.get("resource_id"),
                details=data,
                timestamp=datetime.utcnow()
            )
            await audit_service.create_log(audit_log)
        
        # Emit to ALEX OS
        registration_service = get_alex_os_registration()
        if registration_service:
            await registration_service._emit_webhook_event(event_type, data)
        
        logger.info(f"Generic event processed: {event_type}")
        return {"status": "success", "message": f"Event {event_type} processed"}
        
    except Exception as e:
        logger.error(f"Error processing generic event webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process event: {str(e)}"
        )

@router.get("/")
async def webhook_info():
    """Get webhook endpoint information"""
    return {
        "service": "ChainBot Webhooks",
        "version": config.get_chainbot_config().get("version", "1.0.0"),
        "endpoints": [
            "/workflow/started",
            "/workflow/completed", 
            "/workflow/failed",
            "/agent/spawned",
            "/agent/terminated",
            "/entanglement/created",
            "/entanglement/destroyed",
            "/health",
            "/status",
            "/event"
        ],
        "description": "Webhook endpoints for ALEX OS integration",
        "timestamp": datetime.utcnow().isoformat()
    } 