from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    definition: Optional[Dict[str, Any]] = None
    status: Optional[str] = "draft"
    session_id: int
    entanglement_id: Optional[int] = None

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowRead(WorkflowBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class WorkflowUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    definition: Optional[Dict[str, Any]]
    status: Optional[str]
    session_id: Optional[int]
    entanglement_id: Optional[int]

class WorkflowExecutionCreate(BaseModel):
    workflow_id: str
    user_id: str
    status: str
    input_data: Optional[Dict[str, Any]] = None
    started_at: Optional[str] = None

class WorkflowStepResult(BaseModel):
    step_id: str
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None 