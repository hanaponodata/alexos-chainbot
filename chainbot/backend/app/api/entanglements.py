from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db import SessionLocal
from app.models.entanglement import Entanglement
from app.schemas.entanglement import EntanglementCreate, EntanglementRead, EntanglementUpdate
from app.services.auth_dependencies import get_current_user, require_superuser
from app.services.audit import log_action
from app.services.entanglement import EntanglementManager
from app.services.agent_spawner import AgentSpawner
from pydantic import BaseModel

router = APIRouter(prefix="/entanglements", tags=["entanglements"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class AddAgentRequest(BaseModel):
    agent_id: int

class SendMessageRequest(BaseModel):
    receiver_id: int
    content: str
    message_type: str = "text"
    metadata: Dict[str, Any] = {}

class BroadcastMessageRequest(BaseModel):
    content: str
    message_type: str = "text"
    metadata: Dict[str, Any] = {}

class CoordinateAgentsRequest(BaseModel):
    coordination_task: str
    context: Dict[str, Any] = {}

@router.get("/", response_model=List[EntanglementRead])
def list_entanglements(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Entanglement).all()

@router.get("/{entanglement_id}", response_model=EntanglementRead)
def get_entanglement(entanglement_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    entanglement = db.query(Entanglement).filter(Entanglement.id == entanglement_id).first()
    if not entanglement:
        raise HTTPException(status_code=404, detail="Entanglement not found")
    return entanglement

@router.post("/", response_model=EntanglementRead)
def create_entanglement(entanglement: EntanglementCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_entanglement = Entanglement(**entanglement.dict())
    db.add(db_entanglement)
    db.commit()
    db.refresh(db_entanglement)
    log_action(db, "create_entanglement", current_user.id, "entanglement", db_entanglement.id, meta={"name": db_entanglement.name})
    return db_entanglement

@router.put("/{entanglement_id}", response_model=EntanglementRead)
def update_entanglement(entanglement_id: int, entanglement: EntanglementUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_entanglement = db.query(Entanglement).filter(Entanglement.id == entanglement_id).first()
    if not db_entanglement:
        raise HTTPException(status_code=404, detail="Entanglement not found")
    for field, value in entanglement.dict(exclude_unset=True).items():
        setattr(db_entanglement, field, value)
    db.commit()
    db.refresh(db_entanglement)
    log_action(db, "update_entanglement", current_user.id, "entanglement", db_entanglement.id, meta={"fields": list(entanglement.dict(exclude_unset=True).keys())})
    return db_entanglement

@router.delete("/{entanglement_id}")
def delete_entanglement(entanglement_id: int, db: Session = Depends(get_db), current_user = Depends(require_superuser)):
    db_entanglement = db.query(Entanglement).filter(Entanglement.id == entanglement_id).first()
    if not db_entanglement:
        raise HTTPException(status_code=404, detail="Entanglement not found")
    db.delete(db_entanglement)
    db.commit()
    log_action(db, "delete_entanglement", current_user.id, "entanglement", entanglement_id)
    return {"ok": True}

@router.post("/{entanglement_id}/agents/add")
def add_agent_to_entanglement(entanglement_id: int, request: AddAgentRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Add an agent to an entanglement"""
    agent_spawner = AgentSpawner(db)
    entanglement_manager = EntanglementManager(db, agent_spawner)
    
    success = entanglement_manager.add_agent_to_entanglement(
        entanglement_id=entanglement_id,
        agent_id=request.agent_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add agent to entanglement")
    
    return {"ok": True, "message": "Agent added to entanglement successfully"}

@router.delete("/{entanglement_id}/agents/{agent_id}")
def remove_agent_from_entanglement(entanglement_id: int, agent_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Remove an agent from an entanglement"""
    agent_spawner = AgentSpawner(db)
    entanglement_manager = EntanglementManager(db, agent_spawner)
    
    success = entanglement_manager.remove_agent_from_entanglement(
        entanglement_id=entanglement_id,
        agent_id=agent_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove agent from entanglement")
    
    return {"ok": True, "message": "Agent removed from entanglement successfully"}

@router.post("/{entanglement_id}/messages/send")
async def send_message(entanglement_id: int, request: SendMessageRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Send a message between agents in an entanglement"""
    agent_spawner = AgentSpawner(db)
    entanglement_manager = EntanglementManager(db, agent_spawner)
    
    try:
        message = await entanglement_manager.send_message(
            sender_id=current_user.id,  # Using user ID as sender for now
            receiver_id=request.receiver_id,
            content=request.content,
            message_type=request.message_type,
            metadata=request.metadata
        )
        
        return {
            "message_id": message.id,
            "sender_id": message.sender_id,
            "receiver_id": message.receiver_id,
            "content": message.content,
            "timestamp": message.timestamp.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@router.post("/{entanglement_id}/messages/broadcast")
async def broadcast_message(entanglement_id: int, request: BroadcastMessageRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Broadcast a message to all agents in an entanglement"""
    agent_spawner = AgentSpawner(db)
    entanglement_manager = EntanglementManager(db, agent_spawner)
    
    try:
        messages = await entanglement_manager.broadcast_message(
            sender_id=current_user.id,  # Using user ID as sender for now
            entanglement_id=entanglement_id,
            content=request.content,
            message_type=request.message_type,
            metadata=request.metadata
        )
        
        return {
            "entanglement_id": entanglement_id,
            "messages_sent": len(messages),
            "messages": [
                {
                    "id": msg.id,
                    "receiver_id": msg.receiver_id,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in messages
            ]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to broadcast message: {str(e)}")

@router.get("/{entanglement_id}/messages")
def get_messages(entanglement_id: int, agent_id: int, limit: int = 50, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get messages for a specific agent in an entanglement"""
    agent_spawner = AgentSpawner(db)
    entanglement_manager = EntanglementManager(db, agent_spawner)
    
    messages = entanglement_manager.get_messages(entanglement_id, agent_id, limit)
    return {"messages": messages}

@router.post("/{entanglement_id}/coordinate")
async def coordinate_agents(entanglement_id: int, request: CoordinateAgentsRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Coordinate multiple agents to work on a task together"""
    agent_spawner = AgentSpawner(db)
    entanglement_manager = EntanglementManager(db, agent_spawner)
    
    try:
        result = await entanglement_manager.coordinate_agents(
            entanglement_id=entanglement_id,
            coordination_task=request.coordination_task,
            context=request.context
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Coordination failed: {str(e)}")

@router.get("/{entanglement_id}/status")
def get_entanglement_status(entanglement_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get status of an entanglement"""
    agent_spawner = AgentSpawner(db)
    entanglement_manager = EntanglementManager(db, agent_spawner)
    
    status = entanglement_manager.get_entanglement_status(entanglement_id)
    if not status:
        raise HTTPException(status_code=404, detail="Entanglement not found")
    
    return status

@router.get("/active/list")
def list_active_entanglements(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """List all active entanglements"""
    agent_spawner = AgentSpawner(db)
    entanglement_manager = EntanglementManager(db, agent_spawner)
    
    return entanglement_manager.list_entanglements()

@router.delete("/{entanglement_id}/cleanup")
def cleanup_entanglement(entanglement_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Clean up an entanglement and remove all associated data"""
    agent_spawner = AgentSpawner(db)
    entanglement_manager = EntanglementManager(db, agent_spawner)
    
    success = entanglement_manager.cleanup_entanglement(entanglement_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Entanglement not found")
    
    return {"ok": True, "message": "Entanglement cleaned up successfully"} 