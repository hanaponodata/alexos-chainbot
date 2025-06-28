from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db import SessionLocal
from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentRead, AgentUpdate
from app.services.auth_dependencies import get_current_user, require_superuser
from app.services.audit import log_action
from app.services.agent_spawner import AgentSpawner
from pydantic import BaseModel

router = APIRouter(prefix="/agents", tags=["agents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class AgentSpawnRequest(BaseModel):
    agent_type: str
    name: str
    config: Dict[str, Any]
    session_id: int

class AgentTaskRequest(BaseModel):
    task: str
    context: Dict[str, Any] = {}

class AgentTaskResponse(BaseModel):
    agent_id: int
    task: str
    result: Dict[str, Any]

@router.get("/", response_model=List[AgentRead])
def list_agents(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Agent).all()

@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(agent_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.post("/", response_model=AgentRead)
def create_agent(agent: AgentCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_agent = Agent(**agent.dict())
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    log_action(db, "create_agent", current_user.id, "agent", db_agent.id, meta={"name": db_agent.name})
    return db_agent

@router.put("/{agent_id}", response_model=AgentRead)
def update_agent(agent_id: int, agent: AgentUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    for field, value in agent.dict(exclude_unset=True).items():
        setattr(db_agent, field, value)
    db.commit()
    db.refresh(db_agent)
    log_action(db, "update_agent", current_user.id, "agent", db_agent.id, meta={"fields": list(agent.dict(exclude_unset=True).keys())})
    return db_agent

@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db), current_user = Depends(require_superuser)):
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(db_agent)
    db.commit()
    log_action(db, "delete_agent", current_user.id, "agent", agent_id)
    return {"ok": True}

@router.post("/spawn", response_model=AgentRead)
def spawn_agent(request: AgentSpawnRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Spawn a new agent using the agent spawner"""
    spawner = AgentSpawner(db)
    
    try:
        agent = spawner.spawn_agent(
            agent_type=request.agent_type,
            name=request.name,
            config=request.config,
            session_id=request.session_id,
            user_id=current_user.id
        )
        return agent
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to spawn agent: {str(e)}")

@router.post("/{agent_id}/execute", response_model=AgentTaskResponse)
async def execute_agent_task(agent_id: int, request: AgentTaskRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Execute a task with a specific agent"""
    spawner = AgentSpawner(db)
    
    try:
        result = await spawner.execute_agent_task(
            agent_id=agent_id,
            task=request.task,
            context=request.context,
            user_id=current_user.id
        )
        return AgentTaskResponse(
            agent_id=agent_id,
            task=request.task,
            result=result
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task execution failed: {str(e)}")

@router.get("/{agent_id}/status")
def get_agent_status(agent_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get current status of an agent"""
    spawner = AgentSpawner(db)
    status = spawner.get_agent_status(agent_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Agent not found or not active")
    
    return status

@router.get("/active/list")
def list_active_agents(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """List all active agents"""
    spawner = AgentSpawner(db)
    return spawner.list_active_agents()

@router.delete("/{agent_id}/terminate")
def terminate_agent(agent_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Terminate an active agent"""
    spawner = AgentSpawner(db)
    success = spawner.terminate_agent(agent_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found or not active")
    
    return {"ok": True, "message": "Agent terminated successfully"}

@router.get("/types")
def get_agent_types(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get available agent types and their capabilities"""
    spawner = AgentSpawner(db)
    return spawner.get_agent_types() 