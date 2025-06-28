from pydantic import BaseModel, ConfigDict
from typing import Optional

class SessionBase(BaseModel):
    name: str
    user_id: int
    entanglement_id: Optional[int] = None

class SessionCreate(SessionBase):
    pass

class SessionRead(SessionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SessionUpdate(BaseModel):
    name: Optional[str]
    user_id: Optional[int]
    entanglement_id: Optional[int] 