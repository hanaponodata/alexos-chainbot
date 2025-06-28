from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.db import Base
from app.models.base import BaseModel

class Entanglement(Base, BaseModel):
    __tablename__ = "entanglements"
    name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    sessions = relationship("Session", back_populates="entanglement")
    agents = relationship("Agent", back_populates="entanglement")
    workflows = relationship("Workflow", back_populates="entanglement") 