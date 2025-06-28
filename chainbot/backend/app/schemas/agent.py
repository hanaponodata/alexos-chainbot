from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any

class AgentBase(BaseModel):
    name: str
    type: str
    config: Optional[Dict[str, Any]] = None
    status: Optional[str] = "idle"
    session_id: int
    entanglement_id: Optional[int] = None

class AgentCreate(AgentBase):
    pass

class AgentRead(AgentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AgentResponse(AgentRead):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str]
    type: Optional[str]
    config: Optional[Dict[str, Any]]
    status: Optional[str]
    session_id: Optional[int]
    entanglement_id: Optional[int] 