from sqlalchemy import Column, String, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db import Base
from app.models.base import BaseModel

class Agent(Base, BaseModel):
    __tablename__ = "agents"
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    config = Column(JSON, nullable=True)
    status = Column(String, nullable=False, default="idle")
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    entanglement_id = Column(Integer, ForeignKey("entanglements.id"), nullable=True)
    session = relationship("Session")
    entanglement = relationship("Entanglement", back_populates="agents") 