from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base
from app.models.base import BaseModel

class Session(Base, BaseModel):
    __tablename__ = "sessions"
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    entanglement_id = Column(Integer, ForeignKey("entanglements.id"), nullable=True)
    user = relationship("User")
    entanglement = relationship("Entanglement", back_populates="sessions") 