from sqlalchemy import Column, String, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base
from app.models.base import BaseModel

class Workflow(Base, BaseModel):
    __tablename__ = "workflows"
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    definition = Column(JSON, nullable=True)
    status = Column(String, nullable=False, default="draft")
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    entanglement_id = Column(Integer, ForeignKey("entanglements.id"), nullable=True)
    session = relationship("Session")
    entanglement = relationship("Entanglement", back_populates="workflows")

class WorkflowExecution(Base, BaseModel):
    __tablename__ = "workflow_executions"
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, nullable=False, default="pending")
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
    workflow = relationship("Workflow")
    user = relationship("User")

class WorkflowStep(Base, BaseModel):
    __tablename__ = "workflow_steps"
    execution_id = Column(Integer, ForeignKey("workflow_executions.id"), nullable=False)
    step_id = Column(String, nullable=False)
    step_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    execution = relationship("WorkflowExecution") 