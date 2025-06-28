import asyncio
import json
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from app.models.workflow import Workflow
from app.models.agent import Agent
from app.models.session import Session as DBSession
from app.services.audit import log_action
from app.services import get_websocket_manager
from datetime import datetime

class WorkflowStep:
    def __init__(self, step_id: str, name: str, step_type: str, config: Dict[str, Any]):
        self.step_id = step_id
        self.name = name
        self.step_type = step_type
        self.config = config
        self.status = "pending"
        self.result: Optional[Union[Dict[str, Any], bool, List[Any]]] = None
        self.error: Optional[str] = None
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None

class WorkflowEngine:
    def __init__(self, db: Session):
        self.db = db
        self.active_workflows: Dict[int, Dict[str, Any]] = {}
        
    async def execute_workflow(self, workflow_id: int, user_id: int) -> Dict[str, Any]:
        """Execute a workflow with the given ID"""
        workflow = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
            
        if workflow.definition is None:
            raise ValueError("Workflow has no definition")
            
        # Update workflow status
        setattr(workflow, 'status', "running")
        self.db.commit()
        
        # Log workflow start
        log_action(self.db, "workflow_started", user_id, "workflow", workflow_id)
        
        try:
            # Parse workflow definition
            definition = workflow.definition if isinstance(workflow.definition, dict) else {}
            steps = self._parse_workflow_definition(definition)
            
            # Execute steps
            results = await self._execute_steps(steps, workflow, user_id)
            
            # Update workflow status
            setattr(workflow, 'status', "completed")
            self.db.commit()
            
            # Log workflow completion
            log_action(self.db, "workflow_completed", user_id, "workflow", workflow_id, meta={"results": results})
            
            return {
                "workflow_id": workflow_id,
                "status": "completed",
                "results": results,
                "steps": [step.__dict__ for step in steps]
            }
            
        except Exception as e:
            setattr(workflow, 'status', "failed")
            self.db.commit()
            
            # Log workflow failure
            log_action(self.db, "workflow_failed", user_id, "workflow", workflow_id, meta={"error": str(e)})
            
            raise e
    
    def _parse_workflow_definition(self, definition: Dict[str, Any]) -> List[WorkflowStep]:
        """Parse workflow definition into executable steps"""
        steps = []
        
        for step_data in definition.get("steps", []):
            step = WorkflowStep(
                step_id=step_data["id"],
                name=step_data["name"],
                step_type=step_data["type"],
                config=step_data.get("config", {})
            )
            steps.append(step)
            
        return steps
    
    async def _execute_steps(self, steps: List[WorkflowStep], workflow: Workflow, user_id: int) -> Dict[str, Any]:
        """Execute workflow steps in sequence"""
        results = {}
        ws_manager = get_websocket_manager()
        if ws_manager:
            from app.services.websocket_manager import WebSocketMessage, MessageType, WindowType
        for step in steps:
            try:
                step.status = "running"
                step.start_time = datetime.utcnow()
                # Broadcast step start
                if ws_manager:
                    start_message = WebSocketMessage(
                        message_type=MessageType.WORKFLOW_UPDATE,
                        window_type=WindowType.WORKFLOW_BUILDER,
                        timestamp=step.start_time,
                        data={
                            "type": "workflow_step_started",
                            "workflow_id": workflow.id,
                            "step_id": step.step_id,
                            "step_name": step.name
                        }
                    )
                    await ws_manager.broadcast_to_window(WindowType.WORKFLOW_BUILDER, start_message)
                # Execute step based on type
                if step.step_type == "agent_task":
                    step.result = await self._execute_agent_task(step, workflow, user_id)
                elif step.step_type == "condition":
                    step.result = await self._execute_condition(step, results)
                elif step.step_type == "loop":
                    step.result = await self._execute_loop(step, results)
                elif step.step_type == "api_call":
                    step.result = await self._execute_api_call(step)
                else:
                    raise ValueError(f"Unknown step type: {step.step_type}")
                
                step.status = "completed"
                step.end_time = datetime.utcnow()
                results[step.step_id] = step.result
                # Broadcast step completion
                if ws_manager:
                    complete_message = WebSocketMessage(
                        message_type=MessageType.WORKFLOW_UPDATE,
                        window_type=WindowType.WORKFLOW_BUILDER,
                        timestamp=step.end_time,
                        data={
                            "type": "workflow_step_completed",
                            "workflow_id": workflow.id,
                            "step_id": step.step_id,
                            "step_name": step.name,
                            "result": step.result
                        }
                    )
                    await ws_manager.broadcast_to_window(WindowType.WORKFLOW_BUILDER, complete_message)
            except Exception as e:
                step.status = "failed"
                step.error = str(e)
                step.end_time = datetime.utcnow()
                # Broadcast step failure
                if ws_manager:
                    fail_message = WebSocketMessage(
                        message_type=MessageType.WORKFLOW_ERROR,
                        window_type=WindowType.WORKFLOW_BUILDER,
                        timestamp=step.end_time,
                        data={
                            "type": "workflow_step_failed",
                            "workflow_id": workflow.id,
                            "step_id": step.step_id,
                            "step_name": step.name,
                            "error": str(e)
                        }
                    )
                    await ws_manager.broadcast_to_window(WindowType.WORKFLOW_BUILDER, fail_message)
                raise e
        return results
    
    async def _execute_agent_task(self, step: WorkflowStep, workflow: Workflow, user_id: int) -> Dict[str, Any]:
        """Execute an agent task step"""
        agent_id = step.config.get("agent_id")
        task = step.config.get("task")
        
        if not agent_id or not task:
            raise ValueError("Agent task requires agent_id and task")
        
        # Get agent
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        # Log agent task execution
        log_action(self.db, "agent_task_executed", user_id, "agent", agent_id, 
                  meta={"task": task, "workflow_id": workflow.id, "step_id": step.step_id})
        
        # Simulate agent execution (replace with actual agent logic)
        await asyncio.sleep(1)  # Simulate processing time
        
        return {
            "agent_id": agent_id,
            "agent_name": agent.name,
            "task": task,
            "result": f"Task '{task}' completed by {agent.name}",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _execute_condition(self, step: WorkflowStep, previous_results: Dict[str, Any]) -> bool:
        """Execute a conditional step"""
        condition = step.config.get("condition")
        if not condition:
            raise ValueError("Condition step requires condition expression")
        
        # Simple condition evaluation (replace with more sophisticated logic)
        try:
            # Use previous results in condition evaluation
            result = eval(condition, {"__builtins__": {}}, previous_results)
            return bool(result)
        except Exception as e:
            raise ValueError(f"Invalid condition expression: {e}")
    
    async def _execute_loop(self, step: WorkflowStep, previous_results: Dict[str, Any]) -> List[Any]:
        """Execute a loop step"""
        iterations = step.config.get("iterations", 1)
        loop_steps = step.config.get("steps", [])
        
        results = []
        for i in range(iterations):
            # Execute loop steps (simplified)
            loop_result = {
                "iteration": i + 1,
                "result": f"Loop iteration {i + 1} completed"
            }
            results.append(loop_result)
        
        return results
    
    async def _execute_api_call(self, step: WorkflowStep) -> Dict[str, Any]:
        """Execute an API call step"""
        url = step.config.get("url")
        method = step.config.get("method", "GET")
        headers = step.config.get("headers", {})
        data = step.config.get("data")
        
        if not url:
            raise ValueError("API call requires URL")
        
        # Simulate API call (replace with actual HTTP client)
        await asyncio.sleep(0.5)
        
        return {
            "url": url,
            "method": method,
            "status": "success",
            "response": f"Simulated response from {url}",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_workflow_status(self, workflow_id: int) -> Optional[Dict[str, Any]]:
        """Get current status of a workflow"""
        return self.active_workflows.get(workflow_id)
    
    def stop_workflow(self, workflow_id: int, user_id: int) -> bool:
        """Stop a running workflow"""
        if workflow_id in self.active_workflows:
            workflow = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
            if workflow:
                setattr(workflow, 'status', "stopped")
                self.db.commit()
                
                log_action(self.db, "workflow_stopped", user_id, "workflow", workflow_id)
                return True
        
        return False 