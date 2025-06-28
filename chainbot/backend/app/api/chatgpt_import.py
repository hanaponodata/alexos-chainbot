import os
import logging
import tempfile
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.user import User
from ..services.auth_dependencies import get_current_user
from ..services.chatgpt_data_importer import ChatGPTDataImporter
from ..services.audit import AuditService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatgpt-import", tags=["chatgpt-import"])

@router.post("/upload-dump")
async def upload_chatgpt_dump(
    file: UploadFile = File(...),
    import_options: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload and import a ChatGPT data dump file
    
    Expected file format: JSON with conversations array
    """
    try:
        # Validate file type
        if not file.filename or not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Only JSON files are supported")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.json') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Parse import options
            options = {}
            if import_options:
                import json
                options = json.loads(import_options)
            
            # Initialize services
            audit_service = AuditService(db)
            importer = ChatGPTDataImporter(db, audit_service)
            
            # Import the dump
            result = await importer.import_chatgpt_dump(
                file_path=temp_file_path,
                user_id=current_user.id,
                session_id=current_user.id,
                import_options=options
            )
            
            return JSONResponse(content=result, status_code=200)
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Failed to upload ChatGPT dump: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-agent-context")
async def create_agent_context(
    context_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create context for a specific agent from imported data
    
    Expected payload:
    {
        "context_id": "context_20240115_123456",
        "agent_id": "agent_123",
        "context_config": {
            "max_messages": 100,
            "date_range": {
                "from": "2024-01-01",
                "to": "2024-01-15"
            },
            "topics": ["python", "api"]
        }
    }
    """
    try:
        context_id = context_data.get("context_id")
        agent_id = context_data.get("agent_id")
        context_config = context_data.get("context_config", {})
        
        if not context_id or not agent_id:
            raise HTTPException(status_code=400, detail="context_id and agent_id are required")
        
        # Initialize services
        audit_service = AuditService(db)
        importer = ChatGPTDataImporter(db, audit_service)
        
        # Create agent context
        result = await importer.create_agent_context(
            context_id=context_id,
            agent_id=agent_id,
            context_config=context_config,
            user_id=current_user.id,
            session_id=current_user.id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to create agent context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/get-workflow-context")
async def get_workflow_context(
    context_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get context for a workflow from imported data
    
    Expected payload:
    {
        "context_id": "context_20240115_123456",
        "workflow_id": "workflow_123",
        "workflow_config": {
            "type": "data_analysis",
            "steps": [
                {"type": "data_processing"},
                {"type": "visualization"}
            ]
        }
    }
    """
    try:
        context_id = context_data.get("context_id")
        workflow_id = context_data.get("workflow_id")
        workflow_config = context_data.get("workflow_config", {})
        
        if not context_id or not workflow_id:
            raise HTTPException(status_code=400, detail="context_id and workflow_id are required")
        
        # Initialize services
        audit_service = AuditService(db)
        importer = ChatGPTDataImporter(db, audit_service)
        
        # Get workflow context
        result = await importer.get_context_for_workflow(
            context_id=context_id,
            workflow_id=workflow_id,
            workflow_config=workflow_config,
            user_id=current_user.id,
            session_id=current_user.id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to get workflow context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search-conversations")
async def search_conversations(
    context_id: str,
    query: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search conversations in imported context
    
    Query parameters:
    - context_id: ID of the imported context
    - query: Search query string
    - date_from: Start date (ISO format)
    - date_to: End date (ISO format)
    - limit: Maximum number of results (default: 50)
    """
    try:
        if not context_id or not query:
            raise HTTPException(status_code=400, detail="context_id and query are required")
        
        # Build filters
        filters: Dict[str, Any] = {"limit": limit}
        if date_from:
            filters["date_from"] = date_from
        if date_to:
            filters["date_to"] = date_to
        
        # Initialize services
        audit_service = AuditService(db)
        importer = ChatGPTDataImporter(db, audit_service)
        
        # Search conversations
        results = await importer.search_conversations(
            context_id=context_id,
            query=query,
            filters=filters
        )
        
        return {
            "context_id": context_id,
            "query": query,
            "filters": filters,
            "results": results,
            "total_results": len(results)
        }
        
    except Exception as e:
        logger.error(f"Failed to search conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context-summary/{context_id}")
async def get_context_summary(
    context_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get summary of imported context"""
    try:
        # Initialize services
        audit_service = AuditService(db)
        importer = ChatGPTDataImporter(db, audit_service)
        
        # Get context summary
        summary = await importer.get_context_summary(context_id)
        
        return summary
        
    except Exception as e:
        logger.error(f"Failed to get context summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list-contexts")
async def list_imported_contexts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all imported contexts for the current user"""
    try:
        # Initialize services
        audit_service = AuditService(db)
        importer = ChatGPTDataImporter(db, audit_service)
        
        # Get all contexts (in a real implementation, this would be filtered by user)
        contexts = []
        for context_id in importer.imported_contexts:
            try:
                summary = await importer.get_context_summary(context_id)
                contexts.append(summary)
            except Exception as e:
                logger.warning(f"Failed to get summary for context {context_id}: {e}")
                continue
        
        return {
            "contexts": contexts,
            "total_contexts": len(contexts)
        }
        
    except Exception as e:
        logger.error(f"Failed to list contexts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/context/{context_id}")
async def delete_imported_context(
    context_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an imported context"""
    try:
        # Initialize services
        audit_service = AuditService(db)
        importer = ChatGPTDataImporter(db, audit_service)
        
        # Check if context exists
        if context_id not in importer.imported_contexts:
            raise HTTPException(status_code=404, detail="Context not found")
        
        # Remove context
        del importer.imported_contexts[context_id]
        
        # Log deletion
        await audit_service.log_event(
            action="chatgpt_context_deleted",
            actor_id=current_user.id,
            target_type="context",
            target_id=0,
            session_id=current_user.id,
            meta={"context_id": context_id}
        )
        
        return {"message": f"Context {context_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-dump")
async def validate_chatgpt_dump(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Validate a ChatGPT data dump file without importing it
    """
    try:
        # Validate file type
        if not file.filename or not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Only JSON files are supported")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.json') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Initialize services
            audit_service = AuditService(db)
            importer = ChatGPTDataImporter(db, audit_service)
            
            # Validate the dump
            is_valid = await importer._validate_chatgpt_dump(temp_file_path)
            
            if is_valid:
                # Try to parse for more detailed validation
                try:
                    conversations = await importer._parse_chatgpt_dump(temp_file_path)
                    validation_result = {
                        "valid": True,
                        "conversations_count": len(conversations),
                        "total_messages": sum(len(conv.messages) for conv in conversations),
                        "date_range": {
                            "earliest": min(conv.created_at for conv in conversations).isoformat(),
                            "latest": max(conv.updated_at for conv in conversations).isoformat()
                        } if conversations else None
                    }
                except Exception as parse_error:
                    validation_result = {
                        "valid": True,
                        "parse_warning": str(parse_error),
                        "note": "File format is valid but parsing encountered issues"
                    }
            else:
                validation_result = {
                    "valid": False,
                    "error": "Invalid ChatGPT data dump format"
                }
            
            return validation_result
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Failed to validate ChatGPT dump: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 