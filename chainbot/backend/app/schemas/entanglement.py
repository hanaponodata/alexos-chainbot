from pydantic import BaseModel, ConfigDict
from typing import Optional

class EntanglementBase(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class EntanglementCreate(EntanglementBase):
    pass

class EntanglementRead(EntanglementBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class EntanglementUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str] 