import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.services import get_websocket_manager
import asyncio

logger = logging.getLogger(__name__)

class AuditService:
    """
    Comprehensive audit service for ChainBot
    
    Features:
    - Structured audit logging
    - Real-time event broadcasting
    - Audit trail management
    - Security event tracking
    - Performance monitoring
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.audit_enabled = True
        self.sensitive_fields = ["password", "token", "secret", "api_key"]
        
    async def log_event(
        self,
        action: str,
        actor_id: int,
        target_type: str,
        target_id: int,
        session_id: Optional[int] = None,
        agent_id: Optional[int] = None,
        workflow_id: Optional[int] = None,
        entanglement_id: Optional[int] = None,
        meta: Optional[Dict[str, Any]] = None,
        severity: str = "info"
    ) -> bool:
        """
        Log an audit event with comprehensive metadata
        
        Args:
            action: The action performed
            actor_id: ID of the user/agent performing the action
            target_type: Type of resource being acted upon
            target_id: ID of the target resource
            session_id: Associated session ID
            agent_id: Associated agent ID
            workflow_id: Associated workflow ID
            entanglement_id: Associated entanglement ID
            meta: Additional metadata
            severity: Event severity (info, warning, error, critical)
            
        Returns:
            bool: True if logging successful, False otherwise
        """
        try:
            if not self.audit_enabled:
                return True
            
            # Sanitize sensitive data
            sanitized_meta = self._sanitize_data(meta) if meta else {}
            
            # Create audit log entry
            audit_log = AuditLog(
                action=action,
                actor_id=actor_id,
                target_type=target_type,
                target_id=target_id,
                timestamp=datetime.utcnow(),
                session_id=session_id,
                agent_id=agent_id,
                workflow_id=workflow_id,
                entanglement_id=entanglement_id,
                meta=sanitized_meta
            )
            
            self.db.add(audit_log)
            self.db.commit()
            
            # Log to application logger
            log_message = f"AUDIT: {action} by {actor_id} on {target_type}:{target_id}"
            if severity == "error":
                logger.error(log_message)
            elif severity == "warning":
                logger.warning(log_message)
            else:
                logger.info(log_message)
            
            # Broadcast to WebSocket clients
            await self._broadcast_audit_event(audit_log)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            return False
    
    async def log_security_event(
        self,
        event_type: str,
        actor_id: int,
        details: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        Log security-related events
        
        Args:
            event_type: Type of security event
            actor_id: ID of the actor involved
            details: Event details
            severity: Event severity
            
        Returns:
            bool: True if logging successful, False otherwise
        """
        return await self.log_event(
            action=f"security.{event_type}",
            actor_id=actor_id,
            target_type="security",
            target_id=0,
            meta=details,
            severity=severity
        )
    
    async def log_performance_event(
        self,
        operation: str,
        duration_ms: float,
        resource_type: str,
        resource_id: int,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log performance-related events
        
        Args:
            operation: Operation performed
            duration_ms: Duration in milliseconds
            resource_type: Type of resource
            resource_id: Resource ID
            metadata: Additional metadata
            
        Returns:
            bool: True if logging successful, False otherwise
        """
        meta = {
            "operation": operation,
            "duration_ms": duration_ms,
            "performance": True
        }
        if metadata:
            meta.update(metadata)
        
        return await self.log_event(
            action="performance.measure",
            actor_id=0,  # System event
            target_type=resource_type,
            target_id=resource_id,
            meta=meta,
            severity="info"
        )
    
    async def log_workflow_event(
        self,
        workflow_id: int,
        action: str,
        user_id: int,
        session_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log workflow-related events
        
        Args:
            workflow_id: Workflow ID
            action: Action performed
            user_id: User ID
            session_id: Session ID
            metadata: Additional metadata
            
        Returns:
            bool: True if logging successful, False otherwise
        """
        return await self.log_event(
            action=f"workflow.{action}",
            actor_id=user_id,
            target_type="workflow",
            target_id=workflow_id,
            session_id=session_id,
            workflow_id=workflow_id,
            meta=metadata
        )
    
    async def log_agent_event(
        self,
        agent_id: int,
        action: str,
        user_id: int,
        session_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log agent-related events
        
        Args:
            agent_id: Agent ID
            action: Action performed
            user_id: User ID
            session_id: Session ID
            metadata: Additional metadata
            
        Returns:
            bool: True if logging successful, False otherwise
        """
        return await self.log_event(
            action=f"agent.{action}",
            actor_id=user_id,
            target_type="agent",
            target_id=agent_id,
            session_id=session_id,
            agent_id=agent_id,
            meta=metadata
        )
    
    def get_audit_trail(
        self,
        user_id: Optional[int] = None,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retrieve audit trail with filtering options
        
        Args:
            user_id: Filter by user ID
            target_type: Filter by target type
            target_id: Filter by target ID
            action: Filter by action
            start_date: Start date for filtering
            end_date: End date for filtering
            limit: Maximum number of records to return
            
        Returns:
            List of audit log entries
        """
        try:
            query = self.db.query(AuditLog)
            
            if user_id:
                query = query.filter(AuditLog.actor_id == user_id)
            
            if target_type:
                query = query.filter(AuditLog.target_type == target_type)
            
            if target_id:
                query = query.filter(AuditLog.target_id == target_id)
            
            if action:
                query = query.filter(AuditLog.action == action)
            
            if start_date:
                query = query.filter(AuditLog.timestamp >= start_date)
            
            if end_date:
                query = query.filter(AuditLog.timestamp <= end_date)
            
            audit_logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
            
            return [
                {
                    "id": log.id,
                    "action": log.action,
                    "actor_id": log.actor_id,
                    "target_type": log.target_type,
                    "target_id": log.target_id,
                    "timestamp": log.timestamp.isoformat(),
                    "session_id": log.session_id,
                    "agent_id": log.agent_id,
                    "workflow_id": log.workflow_id,
                    "entanglement_id": log.entanglement_id,
                    "meta": log.meta
                }
                for log in audit_logs
            ]
            
        except Exception as e:
            logger.error(f"Failed to retrieve audit trail: {e}")
            return []
    
    def get_audit_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get audit statistics
        
        Args:
            start_date: Start date for statistics
            end_date: End date for statistics
            
        Returns:
            Dictionary with audit statistics
        """
        try:
            query = self.db.query(AuditLog)
            
            if start_date:
                query = query.filter(AuditLog.timestamp >= start_date)
            
            if end_date:
                query = query.filter(AuditLog.timestamp <= end_date)
            
            total_events = query.count()
            
            # Get action distribution
            action_counts = {}
            for log in query.all():
                action_counts[log.action] = action_counts.get(log.action, 0) + 1
            
            # Get user activity
            user_activity = {}
            for log in query.all():
                user_activity[log.actor_id] = user_activity.get(log.actor_id, 0) + 1
            
            return {
                "total_events": total_events,
                "action_distribution": action_counts,
                "user_activity": user_activity,
                "period": {
                    "start": start_date.isoformat() if start_date else None,
                    "end": end_date.isoformat() if end_date else None
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get audit stats: {e}")
            return {}
    
    def _sanitize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize sensitive data from audit logs
        
        Args:
            data: Data to sanitize
            
        Returns:
            Sanitized data
        """
        if not data:
            return data
        
        sanitized = {}
        for key, value in data.items():
            if key.lower() in self.sensitive_fields:
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_data(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_data(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized
    
    async def _broadcast_audit_event(self, audit_log: AuditLog):
        """Broadcast audit event to WebSocket clients"""
        try:
            # Prepare event data
            event_data = {
                "action": audit_log.action,
                "actor_id": audit_log.actor_id,
                "target_type": audit_log.target_type,
                "target_id": audit_log.target_id,
                "timestamp": audit_log.timestamp.isoformat(),
                "session_id": audit_log.session_id,
                "agent_id": audit_log.agent_id,
                "workflow_id": audit_log.workflow_id,
                "entanglement_id": audit_log.entanglement_id,
                "meta": audit_log.meta
            }
            
            # Get WebSocket manager
            ws_manager = get_websocket_manager()
            if ws_manager:
                # Create WebSocket message
                from .websocket_manager import WebSocketMessage, MessageType, WindowType
                
                audit_message = WebSocketMessage(
                    message_type=MessageType.LOG_UPDATE,
                    window_type=WindowType.WATCHTOWER,
                    timestamp=datetime.utcnow(),
                    data=event_data
                )
                
                # Broadcast to watchtower window
                await ws_manager.broadcast_to_window(WindowType.WATCHTOWER, audit_message)
            
        except Exception as e:
            logger.error(f"Failed to broadcast audit event: {e}")

# Legacy function for backward compatibility
def log_action(db, action, actor_id, target_type, target_id, session_id=None, agent_id=None, workflow_id=None, entanglement_id=None, meta=None):
    """Legacy function for backward compatibility"""
    audit_service = AuditService(db)
    return asyncio.create_task(
        audit_service.log_event(
            action=action,
            actor_id=actor_id,
            target_type=target_type,
            target_id=target_id,
            session_id=session_id,
            agent_id=agent_id,
            workflow_id=workflow_id,
            entanglement_id=entanglement_id,
            meta=meta
        )
    )

def get_audit_service(db: Session) -> AuditService:
    return AuditService(db) 