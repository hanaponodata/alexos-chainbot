import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass, field
from uuid import uuid4
import traceback

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models.workflow import Workflow, WorkflowExecution, WorkflowStep
from ..models.agent import Agent
from ..models.entanglement import Entanglement
from ..models.audit_log import AuditLog
from ..schemas.workflow import WorkflowExecutionCreate, WorkflowStepResult
from ..services.websocket_manager import WebSocketManager
from ..services.audit import AuditService

logger = logging.getLogger(__name__)

class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"

class ExecutionStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

@dataclass
class StepContext:
    step_id: str
    workflow_id: str
    execution_id: str
    step_data: Dict[str, Any]
    variables: Dict[str, Any] = field(default_factory=dict)
    results: Dict[str, Any] = field(default_factory=dict)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: StepStatus = StepStatus.PENDING
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3

@dataclass
class ExecutionContext:
    execution_id: str
    workflow_id: str
    workflow_data: Dict[str, Any]
    variables: Dict[str, Any] = field(default_factory=dict)
    results: Dict[str, Any] = field(default_factory=dict)
    start_time: datetime = field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    status: ExecutionStatus = ExecutionStatus.PENDING
    current_step: Optional[str] = None
    completed_steps: List[str] = field(default_factory=list)
    failed_steps: List[str] = field(default_factory=list)
    step_contexts: Dict[str, StepContext] = field(default_factory=dict)
    error: Optional[str] = None
    timeout: Optional[timedelta] = None
    max_parallel_steps: int = 5

class WorkflowOrchestrator:
    def __init__(self, db: Session, websocket_manager: WebSocketManager, audit_service: AuditService):
        self.db = db
        self.websocket_manager = websocket_manager
        self.audit_service = audit_service
        self.active_executions: Dict[str, ExecutionContext] = {}
        self.execution_tasks: Dict[str, asyncio.Task] = {}
        self.step_handlers: Dict[str, Callable] = {}
        self._register_default_handlers()

    def _register_default_handlers(self):
        """Register default step type handlers"""
        self.step_handlers.update({
            'agent_task': self._handle_agent_task,
            'api_call': self._handle_api_call,
            'condition': self._handle_condition,
            'loop': self._handle_loop,
            'parallel': self._handle_parallel,
            'wait': self._handle_wait,
            'transform': self._handle_transform,
            'webhook': self._handle_webhook,
            'email': self._handle_email,
            'notification': self._handle_notification
        })

    async def execute_workflow(self, workflow_id: str, user_id: str, input_data: Dict[str, Any] = None) -> str:
        """Execute a workflow with the given input data"""
        try:
            # Get workflow from database
            workflow = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
            if not workflow:
                raise ValueError(f"Workflow {workflow_id} not found")

            # Create execution record
            execution_id = str(uuid4())
            execution_data = WorkflowExecutionCreate(
                workflow_id=workflow_id,
                user_id=user_id,
                status=ExecutionStatus.PENDING.value,
                input_data=input_data or {},
                started_at=datetime.utcnow()
            )
            
            execution = WorkflowExecution(**execution_data.dict())
            self.db.add(execution)
            self.db.commit()

            # Create execution context
            context = ExecutionContext(
                execution_id=execution_id,
                workflow_id=workflow_id,
                workflow_data=workflow.definition,
                variables=input_data or {},
                timeout=timedelta(hours=workflow.definition.get('timeout_hours', 1))
            )

            # Initialize step contexts
            for step in workflow.definition.get('steps', []):
                context.step_contexts[step['id']] = StepContext(
                    step_id=step['id'],
                    workflow_id=workflow_id,
                    execution_id=execution_id,
                    step_data=step
                )

            # Store context and start execution
            self.active_executions[execution_id] = context
            task = asyncio.create_task(self._execute_workflow_async(context))
            self.execution_tasks[execution_id] = task

            # Log audit event
            await self.audit_service.log_event(
                user_id=user_id,
                action="workflow_execution_started",
                resource_type="workflow",
                resource_id=workflow_id,
                details={
                    "execution_id": execution_id,
                    "input_data": input_data
                }
            )

            # Broadcast execution started
            await self.websocket_manager.broadcast_to_user(
                user_id,
                "workflow_execution_started",
                {
                    "execution_id": execution_id,
                    "workflow_id": workflow_id,
                    "status": ExecutionStatus.RUNNING.value
                }
            )

            return execution_id

        except Exception as e:
            logger.error(f"Failed to start workflow execution: {e}")
            await self.audit_service.log_event(
                user_id=user_id,
                action="workflow_execution_failed",
                resource_type="workflow",
                resource_id=workflow_id,
                details={"error": str(e)}
            )
            raise

    async def _execute_workflow_async(self, context: ExecutionContext):
        """Main workflow execution loop"""
        try:
            context.status = ExecutionStatus.RUNNING
            await self._update_execution_status(context)

            # Get workflow steps
            steps = context.workflow_data.get('steps', [])
            if not steps:
                context.status = ExecutionStatus.COMPLETED
                await self._update_execution_status(context)
                return

            # Execute steps based on workflow type
            workflow_type = context.workflow_data.get('type', 'sequential')
            
            if workflow_type == 'sequential':
                await self._execute_sequential_steps(context, steps)
            elif workflow_type == 'parallel':
                await self._execute_parallel_steps(context, steps)
            elif workflow_type == 'conditional':
                await self._execute_conditional_steps(context, steps)
            else:
                await self._execute_sequential_steps(context, steps)

            # Mark execution as completed
            context.status = ExecutionStatus.COMPLETED
            context.end_time = datetime.utcnow()
            await self._update_execution_status(context)

        except asyncio.CancelledError:
            context.status = ExecutionStatus.CANCELLED
            context.end_time = datetime.utcnow()
            await self._update_execution_status(context)
            logger.info(f"Workflow execution {context.execution_id} was cancelled")

        except Exception as e:
            context.status = ExecutionStatus.FAILED
            context.error = str(e)
            context.end_time = datetime.utcnow()
            await self._update_execution_status(context)
            logger.error(f"Workflow execution {context.execution_id} failed: {e}")

        finally:
            # Cleanup
            if context.execution_id in self.active_executions:
                del self.active_executions[context.execution_id]
            if context.execution_id in self.execution_tasks:
                del self.execution_tasks[context.execution_id]

    async def _execute_sequential_steps(self, context: ExecutionContext, steps: List[Dict]):
        """Execute steps sequentially"""
        for step in steps:
            if context.status in [ExecutionStatus.FAILED, ExecutionStatus.CANCELLED]:
                break

            step_id = step['id']
            context.current_step = step_id
            
            # Check if step should be skipped
            if self._should_skip_step(context, step):
                await self._mark_step_skipped(context, step_id)
                continue

            # Execute step
            try:
                await self._execute_step(context, step)
                context.completed_steps.append(step_id)
                
                # Check for step failure handling
                if context.step_contexts[step_id].status == StepStatus.FAILED:
                    await self._handle_step_failure(context, step)
                    
            except Exception as e:
                await self._handle_step_error(context, step_id, e)

    async def _execute_parallel_steps(self, context: ExecutionContext, steps: List[Dict]):
        """Execute steps in parallel with concurrency control"""
        semaphore = asyncio.Semaphore(context.max_parallel_steps)
        
        async def execute_step_with_semaphore(step):
            async with semaphore:
                return await self._execute_step(context, step)

        # Group steps by dependencies
        step_groups = self._group_steps_by_dependencies(steps)
        
        for group in step_groups:
            if context.status in [ExecutionStatus.FAILED, ExecutionStatus.CANCELLED]:
                break

            # Execute group in parallel
            tasks = [execute_step_with_semaphore(step) for step in group]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Check for failures
            for step, result in zip(group, results):
                if isinstance(result, Exception):
                    await self._handle_step_error(context, step['id'], result)

    async def _execute_conditional_steps(self, context: ExecutionContext, steps: List[Dict]):
        """Execute steps based on conditions"""
        for step in steps:
            if context.status in [ExecutionStatus.FAILED, ExecutionStatus.CANCELLED]:
                break

            step_id = step['id']
            
            # Evaluate condition
            if not self._evaluate_condition(context, step):
                await self._mark_step_skipped(context, step_id)
                continue

            # Execute step
            await self._execute_step(context, step)

    async def _execute_step(self, context: ExecutionContext, step: Dict) -> Any:
        """Execute a single workflow step"""
        step_id = step['id']
        step_context = context.step_contexts[step_id]
        step_type = step.get('type', 'agent_task')

        try:
            step_context.status = StepStatus.RUNNING
            step_context.start_time = datetime.utcnow()
            await self._update_step_status(context, step_id)

            # Get step handler
            handler = self.step_handlers.get(step_type)
            if not handler:
                raise ValueError(f"Unknown step type: {step_type}")

            # Execute step
            result = await handler(context, step)
            
            # Store result
            step_context.results = result
            step_context.status = StepStatus.COMPLETED
            step_context.end_time = datetime.utcnow()
            
            # Update variables
            if 'output_variable' in step:
                context.variables[step['output_variable']] = result

            await self._update_step_status(context, step_id)
            return result

        except Exception as e:
            step_context.status = StepStatus.FAILED
            step_context.error = str(e)
            step_context.end_time = datetime.utcnow()
            await self._update_step_status(context, step_id)
            raise

    async def _handle_agent_task(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle agent task execution"""
        agent_id = step['config']['agent_id']
        task = step['config']['task']
        
        # Get agent
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        # Execute task via agent spawner service
        from .agent_spawner import AgentSpawner
        agent_spawner = AgentSpawner(self.db, self.websocket_manager, self.audit_service)
        
        result = await agent_spawner.execute_task(agent_id, task, context.variables)
        return result

    async def _handle_api_call(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle API call execution"""
        import aiohttp
        
        config = step['config']
        url = self._interpolate_variables(config['url'], context.variables)
        method = config.get('method', 'GET')
        headers = config.get('headers', {})
        data = config.get('data')
        
        if data:
            data = self._interpolate_variables(data, context.variables)

        async with aiohttp.ClientSession() as session:
            async with session.request(method, url, headers=headers, json=data) as response:
                result = {
                    'status_code': response.status,
                    'headers': dict(response.headers),
                    'data': await response.json() if response.content_type == 'application/json' else await response.text()
                }
                return result

    async def _handle_condition(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle conditional step execution"""
        condition = step['config']['condition']
        result = self._evaluate_expression(condition, context.variables)
        return {'condition_result': result}

    async def _handle_loop(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle loop step execution"""
        config = step['config']
        items = self._interpolate_variables(config['items'], context.variables)
        loop_steps = config['steps']
        
        results = []
        for item in items:
            # Create loop context
            loop_context = context.variables.copy()
            loop_context['loop_item'] = item
            loop_context['loop_index'] = len(results)
            
            # Execute loop steps
            for loop_step in loop_steps:
                result = await self._execute_step(context, loop_step)
                results.append(result)
        
        return {'loop_results': results}

    async def _handle_parallel(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle parallel step execution"""
        parallel_steps = step['config']['steps']
        tasks = [self._execute_step(context, s) for s in parallel_steps]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return {'parallel_results': results}

    async def _handle_wait(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle wait step execution"""
        duration = step['config']['duration']
        await asyncio.sleep(duration)
        return {'waited': duration}

    async def _handle_transform(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle data transformation step"""
        config = step['config']
        input_data = self._interpolate_variables(config['input'], context.variables)
        transform_type = config['type']
        
        if transform_type == 'json_parse':
            return {'transformed': json.loads(input_data)}
        elif transform_type == 'json_stringify':
            return {'transformed': json.dumps(input_data)}
        elif transform_type == 'template':
            template = config['template']
            return {'transformed': self._interpolate_variables(template, input_data)}
        else:
            raise ValueError(f"Unknown transform type: {transform_type}")

    async def _handle_webhook(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle webhook step execution"""
        config = step['config']
        url = self._interpolate_variables(config['url'], context.variables)
        payload = self._interpolate_variables(config.get('payload', {}), context.variables)
        
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                return {
                    'status_code': response.status,
                    'response': await response.json() if response.content_type == 'application/json' else await response.text()
                }

    async def _handle_email(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle email step execution"""
        # This would integrate with an email service
        config = step['config']
        to_email = self._interpolate_variables(config['to'], context.variables)
        subject = self._interpolate_variables(config['subject'], context.variables)
        body = self._interpolate_variables(config['body'], context.variables)
        
        # Placeholder for email sending
        logger.info(f"Sending email to {to_email}: {subject}")
        return {'email_sent': True, 'to': to_email}

    async def _handle_notification(self, context: ExecutionContext, step: Dict) -> Dict[str, Any]:
        """Handle notification step execution"""
        config = step['config']
        message = self._interpolate_variables(config['message'], context.variables)
        notification_type = config.get('type', 'info')
        
        # Send notification via WebSocket
        await self.websocket_manager.broadcast_to_user(
            context.workflow_data.get('user_id'),
            'notification',
            {
                'type': notification_type,
                'message': message,
                'workflow_id': context.workflow_id,
                'execution_id': context.execution_id
            }
        )
        
        return {'notification_sent': True, 'type': notification_type}

    def _should_skip_step(self, context: ExecutionContext, step: Dict) -> bool:
        """Check if a step should be skipped"""
        if 'condition' in step:
            return not self._evaluate_expression(step['condition'], context.variables)
        return False

    def _evaluate_condition(self, context: ExecutionContext, step: Dict) -> bool:
        """Evaluate step condition"""
        condition = step.get('condition')
        if not condition:
            return True
        return self._evaluate_expression(condition, context.variables)

    def _evaluate_expression(self, expression: str, variables: Dict[str, Any]) -> Any:
        """Safely evaluate an expression with variables"""
        try:
            # Create a safe evaluation environment
            safe_dict = {
                'variables': variables,
                'len': len,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'list': list,
                'dict': dict,
                'True': True,
                'False': False,
                'None': None
            }
            
            # Replace variable references with safe access
            for key, value in variables.items():
                safe_dict[key] = value
            
            return eval(expression, {"__builtins__": {}}, safe_dict)
        except Exception as e:
            logger.error(f"Failed to evaluate expression '{expression}': {e}")
            return False

    def _interpolate_variables(self, template: Any, variables: Dict[str, Any]) -> Any:
        """Interpolate variables in a template"""
        if isinstance(template, str):
            for key, value in variables.items():
                template = template.replace(f"${{{key}}}", str(value))
            return template
        elif isinstance(template, dict):
            return {k: self._interpolate_variables(v, variables) for k, v in template.items()}
        elif isinstance(template, list):
            return [self._interpolate_variables(item, variables) for item in template]
        else:
            return template

    def _group_steps_by_dependencies(self, steps: List[Dict]) -> List[List[Dict]]:
        """Group steps by their dependencies for parallel execution"""
        # Simple implementation - can be enhanced with topological sorting
        return [steps]  # For now, execute all steps in one group

    async def _handle_step_failure(self, context: ExecutionContext, step: Dict):
        """Handle step failure based on workflow configuration"""
        failure_config = step.get('on_failure', {})
        action = failure_config.get('action', 'fail')
        
        if action == 'retry':
            max_retries = failure_config.get('max_retries', 3)
            step_context = context.step_contexts[step['id']]
            
            if step_context.retry_count < max_retries:
                step_context.retry_count += 1
                step_context.status = StepStatus.PENDING
                await self._execute_step(context, step)
            else:
                context.status = ExecutionStatus.FAILED
                
        elif action == 'continue':
            # Continue with next step
            pass
        else:
            # Default: fail the workflow
            context.status = ExecutionStatus.FAILED

    async def _handle_step_error(self, context: ExecutionContext, step_id: str, error: Exception):
        """Handle step execution error"""
        step_context = context.step_contexts[step_id]
        step_context.status = StepStatus.FAILED
        step_context.error = str(error)
        context.failed_steps.append(step_id)
        
        await self._update_step_status(context, step_id)
        logger.error(f"Step {step_id} failed: {error}")

    async def _mark_step_skipped(self, context: ExecutionContext, step_id: str):
        """Mark a step as skipped"""
        step_context = context.step_contexts[step_id]
        step_context.status = StepStatus.SKIPPED
        step_context.end_time = datetime.utcnow()
        await self._update_step_status(context, step_id)

    async def _update_execution_status(self, context: ExecutionContext):
        """Update execution status in database and broadcast"""
        execution = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.id == context.execution_id
        ).first()
        
        if execution:
            execution.status = context.status.value
            execution.ended_at = context.end_time
            execution.error = context.error
            execution.results = context.results
            self.db.commit()

        # Broadcast status update
        await self.websocket_manager.broadcast_to_user(
            context.workflow_data.get('user_id'),
            "workflow_execution_updated",
            {
                "execution_id": context.execution_id,
                "status": context.status.value,
                "current_step": context.current_step,
                "completed_steps": context.completed_steps,
                "failed_steps": context.failed_steps,
                "error": context.error
            }
        )

    async def _update_step_status(self, context: ExecutionContext, step_id: str):
        """Update step status and broadcast"""
        step_context = context.step_contexts[step_id]
        
        # Broadcast step update
        await self.websocket_manager.broadcast_to_user(
            context.workflow_data.get('user_id'),
            "workflow_step_updated",
            {
                "execution_id": context.execution_id,
                "step_id": step_id,
                "status": step_context.status.value,
                "results": step_context.results,
                "error": step_context.error,
                "start_time": step_context.start_time.isoformat() if step_context.start_time else None,
                "end_time": step_context.end_time.isoformat() if step_context.end_time else None
            }
        )

    async def cancel_execution(self, execution_id: str, user_id: str) -> bool:
        """Cancel a workflow execution"""
        if execution_id not in self.active_executions:
            return False

        context = self.active_executions[execution_id]
        context.status = ExecutionStatus.CANCELLED
        
        # Cancel the execution task
        if execution_id in self.execution_tasks:
            self.execution_tasks[execution_id].cancel()
        
        await self._update_execution_status(context)
        
        # Log audit event
        await self.audit_service.log_event(
            user_id=user_id,
            action="workflow_execution_cancelled",
            resource_type="workflow",
            resource_id=context.workflow_id,
            details={"execution_id": execution_id}
        )
        
        return True

    async def pause_execution(self, execution_id: str, user_id: str) -> bool:
        """Pause a workflow execution"""
        if execution_id not in self.active_executions:
            return False

        context = self.active_executions[execution_id]
        context.status = ExecutionStatus.PAUSED
        await self._update_execution_status(context)
        
        # Log audit event
        await self.audit_service.log_event(
            user_id=user_id,
            action="workflow_execution_paused",
            resource_type="workflow",
            resource_id=context.workflow_id,
            details={"execution_id": execution_id}
        )
        
        return True

    async def resume_execution(self, execution_id: str, user_id: str) -> bool:
        """Resume a paused workflow execution"""
        if execution_id not in self.active_executions:
            return False

        context = self.active_executions[execution_id]
        if context.status != ExecutionStatus.PAUSED:
            return False

        context.status = ExecutionStatus.RUNNING
        await self._update_execution_status(context)
        
        # Log audit event
        await self.audit_service.log_event(
            user_id=user_id,
            action="workflow_execution_resumed",
            resource_type="workflow",
            resource_id=context.workflow_id,
            details={"execution_id": execution_id}
        )
        
        return True

    def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get execution status and details"""
        if execution_id not in self.active_executions:
            return None

        context = self.active_executions[execution_id]
        return {
            "execution_id": execution_id,
            "workflow_id": context.workflow_id,
            "status": context.status.value,
            "current_step": context.current_step,
            "completed_steps": context.completed_steps,
            "failed_steps": context.failed_steps,
            "start_time": context.start_time.isoformat(),
            "end_time": context.end_time.isoformat() if context.end_time else None,
            "error": context.error,
            "variables": context.variables,
            "results": context.results
        }

    def get_all_executions(self) -> List[Dict[str, Any]]:
        """Get status of all active executions"""
        return [self.get_execution_status(exec_id) for exec_id in self.active_executions.keys()]

    async def create_visual_workflow(
        self,
        workflow_name: str,
        workflow_description: str,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        user_id: str,
        session_id: int
    ) -> str:
        """
        Create a visual workflow from GUI builder
        
        Args:
            workflow_name: Name of the workflow
            workflow_description: Description of the workflow
            nodes: List of workflow nodes (agents, conditions, etc.)
            edges: List of connections between nodes
            user_id: User creating the workflow
            session_id: Session ID
            
        Returns:
            str: Workflow ID
        """
        try:
            # Create workflow definition
            workflow_definition = {
                "name": workflow_name,
                "description": workflow_description,
                "type": "visual",
                "nodes": nodes,
                "edges": edges,
                "created_by": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
            
            # Validate workflow structure
            await self._validate_visual_workflow(nodes, edges)
            
            # Create workflow record
            workflow_id = str(uuid4())
            workflow = Workflow(
                name=workflow_name,
                description=workflow_description,
                definition=workflow_definition,
                status="active",
                session_id=session_id
            )
            
            self.db.add(workflow)
            self.db.commit()
            
            # Log workflow creation
            await self.audit_service.log_workflow_event(
                workflow_id=workflow.id,
                action="visual_workflow_created",
                user_id=user_id,
                session_id=session_id,
                metadata={
                    "nodes_count": len(nodes),
                    "edges_count": len(edges),
                    "workflow_type": "visual"
                }
            )
            
            # Broadcast workflow creation
            await self.websocket_manager.broadcast_to_session(
                session_id,
                "visual_workflow_created",
                {
                    "workflow_id": workflow_id,
                    "name": workflow_name,
                    "nodes": nodes,
                    "edges": edges
                }
            )
            
            logger.info(f"Created visual workflow: {workflow_name} (ID: {workflow_id})")
            return workflow_id
            
        except Exception as e:
            logger.error(f"Failed to create visual workflow: {e}")
            raise
    
    async def execute_visual_workflow(
        self,
        workflow_id: str,
        input_data: Dict[str, Any],
        user_id: str,
        session_id: int
    ) -> str:
        """
        Execute a visual workflow with intelligent routing
        
        Args:
            workflow_id: ID of the workflow to execute
            input_data: Input data for the workflow
            user_id: User executing the workflow
            session_id: Session ID
            
        Returns:
            str: Execution ID
        """
        try:
            # Get workflow
            workflow = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
            if not workflow:
                raise ValueError(f"Workflow {workflow_id} not found")
            
            workflow_def = workflow.definition
            nodes = workflow_def.get("nodes", [])
            edges = workflow_def.get("edges", [])
            
            # Create execution context
            execution_id = str(uuid4())
            context = ExecutionContext(
                execution_id=execution_id,
                workflow_id=workflow_id,
                workflow_data=workflow_def,
                variables=input_data,
                max_parallel_steps=10  # Higher for visual workflows
            )
            
            # Initialize node contexts
            for node in nodes:
                node_id = node["id"]
                context.step_contexts[node_id] = StepContext(
                    step_id=node_id,
                    workflow_id=workflow_id,
                    execution_id=execution_id,
                    step_data=node
                )
            
            # Store context and start execution
            self.active_executions[execution_id] = context
            task = asyncio.create_task(self._execute_visual_workflow_async(context))
            self.execution_tasks[execution_id] = task
            
            # Log execution start
            await self.audit_service.log_workflow_event(
                workflow_id=workflow.id,
                action="visual_workflow_execution_started",
                user_id=user_id,
                session_id=session_id,
                metadata={
                    "execution_id": execution_id,
                    "input_data": input_data,
                    "nodes_count": len(nodes)
                }
            )
            
            # Broadcast execution started
            await self.websocket_manager.broadcast_to_session(
                session_id,
                "visual_workflow_execution_started",
                {
                    "execution_id": execution_id,
                    "workflow_id": workflow_id,
                    "status": ExecutionStatus.RUNNING.value
                }
            )
            
            return execution_id
            
        except Exception as e:
            logger.error(f"Failed to execute visual workflow: {e}")
            raise
    
    async def _execute_visual_workflow_async(self, context: ExecutionContext):
        """Execute visual workflow with intelligent routing"""
        try:
            context.status = ExecutionStatus.RUNNING
            await self._update_execution_status(context)
            
            nodes = context.workflow_data.get("nodes", [])
            edges = context.workflow_data.get("edges", [])
            
            # Build execution graph
            execution_graph = self._build_execution_graph(nodes, edges)
            
            # Execute nodes in topological order with intelligent routing
            await self._execute_visual_nodes(context, execution_graph)
            
            # Mark execution as completed
            context.status = ExecutionStatus.COMPLETED
            context.end_time = datetime.utcnow()
            await self._update_execution_status(context)
            
            # Broadcast completion
            await self.websocket_manager.broadcast(
                "visual_workflow_execution_completed",
                {
                    "execution_id": context.execution_id,
                    "workflow_id": context.workflow_id,
                    "results": context.results
                }
            )
            
        except Exception as e:
            logger.error(f"Visual workflow execution failed: {e}")
            context.status = ExecutionStatus.FAILED
            context.error = str(e)
            context.end_time = datetime.utcnow()
            await self._update_execution_status(context)
    
    def _build_execution_graph(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """Build execution graph from nodes and edges"""
        graph = {}
        
        # Initialize nodes
        for node in nodes:
            node_id = node["id"]
            graph[node_id] = {
                "node": node,
                "dependencies": [],
                "dependents": [],
                "status": StepStatus.PENDING,
                "executed": False
            }
        
        # Add edges
        for edge in edges:
            source_id = edge["source"]
            target_id = edge["target"]
            
            if source_id in graph and target_id in graph:
                graph[source_id]["dependents"].append(target_id)
                graph[target_id]["dependencies"].append(source_id)
        
        return graph
    
    async def _execute_visual_nodes(
        self,
        context: ExecutionContext,
        execution_graph: Dict[str, Dict[str, Any]]
    ):
        """Execute visual workflow nodes with intelligent routing"""
        try:
            # Find nodes ready for execution (no dependencies)
            ready_nodes = [
                node_id for node_id, node_info in execution_graph.items()
                if not node_info["dependencies"] and not node_info["executed"]
            ]
            
            while ready_nodes:
                # Execute ready nodes in parallel
                execution_tasks = []
                for node_id in ready_nodes:
                    task = asyncio.create_task(
                        self._execute_visual_node(context, node_id, execution_graph)
                    )
                    execution_tasks.append(task)
                
                # Wait for all tasks to complete
                await asyncio.gather(*execution_tasks, return_exceptions=True)
                
                # Update execution graph
                for node_id in ready_nodes:
                    execution_graph[node_id]["executed"] = True
                
                # Find next ready nodes
                ready_nodes = [
                    node_id for node_id, node_info in execution_graph.items()
                    if not node_info["executed"] and all(
                        execution_graph[dep]["executed"]
                        for dep in node_info["dependencies"]
                    )
                ]
            
        except Exception as e:
            logger.error(f"Visual node execution failed: {e}")
            raise
    
    async def _execute_visual_node(
        self,
        context: ExecutionContext,
        node_id: str,
        execution_graph: Dict[str, Dict[str, Any]]
    ):
        """Execute a single visual workflow node"""
        try:
            node_info = execution_graph[node_id]
            node = node_info["node"]
            node_type = node.get("type", "unknown")
            
            # Update node status
            node_info["status"] = StepStatus.RUNNING
            await self._update_visual_node_status(context, node_id, StepStatus.RUNNING)
            
            # Execute based on node type
            if node_type == "ai_agent":
                result = await self._execute_ai_agent_node(context, node)
            elif node_type == "condition":
                result = await self._execute_condition_node(context, node)
            elif node_type == "transform":
                result = await self._execute_transform_node(context, node)
            elif node_type == "api_call":
                result = await self._execute_api_call_node(context, node)
            elif node_type == "user_input":
                result = await self._execute_user_input_node(context, node)
            elif node_type == "output":
                result = await self._execute_output_node(context, node)
            else:
                result = {"content": f"Unknown node type: {node_type}", "success": False}
            
            # Store result
            context.results[node_id] = result
            node_info["status"] = StepStatus.COMPLETED if result.get("success", True) else StepStatus.FAILED
            
            # Update node status
            await self._update_visual_node_status(context, node_id, node_info["status"])
            
            # Route result to dependent nodes
            await self._route_node_result(context, node_id, result, execution_graph)
            
        except Exception as e:
            logger.error(f"Failed to execute visual node {node_id}: {e}")
            execution_graph[node_id]["status"] = StepStatus.FAILED
            await self._update_visual_node_status(context, node_id, StepStatus.FAILED)
            raise
    
    async def _execute_ai_agent_node(
        self,
        context: ExecutionContext,
        node: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute AI agent node"""
        try:
            agent_id = node.get("agent_id")
            message = node.get("message", "")
            agent_config = node.get("config", {})
            
            # Get input from previous nodes
            input_data = self._get_node_input_data(context, node)
            if input_data:
                message = self._interpolate_variables(message, input_data)
            
            # Call AI agent manager
            from .ai_agent_manager import AIAgentManager
            agent_manager = AIAgentManager(self.db, self.audit_service)
            
            response = await agent_manager.send_message_to_agent(
                agent_id=agent_id,
                message=message,
                user_id=context.variables.get("user_id", 0),
                session_id=int(context.variables.get("session_id", 0)),
                context={
                    "workflow_id": context.workflow_id,
                    "node_id": node["id"],
                    "node_type": "ai_agent"
                }
            )
            
            return {
                "content": response["content"],
                "metadata": response.get("metadata", {}),
                "success": True,
                "agent_id": agent_id
            }
            
        except Exception as e:
            logger.error(f"AI agent node execution failed: {e}")
            return {
                "content": f"AI agent execution failed: {str(e)}",
                "success": False,
                "error": str(e)
            }
    
    async def _execute_condition_node(
        self,
        context: ExecutionContext,
        node: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute condition node"""
        try:
            condition = node.get("condition", "")
            input_data = self._get_node_input_data(context, node)
            
            # Evaluate condition
            result = self._evaluate_condition_expression(condition, input_data)
            
            return {
                "content": str(result),
                "success": True,
                "condition_result": result
            }
            
        except Exception as e:
            logger.error(f"Condition node execution failed: {e}")
            return {
                "content": f"Condition evaluation failed: {str(e)}",
                "success": False,
                "error": str(e)
            }
    
    async def _execute_transform_node(
        self,
        context: ExecutionContext,
        node: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute transform node"""
        try:
            transform_type = node.get("transform_type", "text")
            input_data = self._get_node_input_data(context, node)
            
            if transform_type == "text":
                result = await self._transform_text(node, input_data)
            elif transform_type == "json":
                result = await self._transform_json(node, input_data)
            elif transform_type == "format":
                result = await self._transform_format(node, input_data)
            else:
                result = input_data
            
            return {
                "content": result,
                "success": True,
                "transform_type": transform_type
            }
            
        except Exception as e:
            logger.error(f"Transform node execution failed: {e}")
            return {
                "content": f"Transform failed: {str(e)}",
                "success": False,
                "error": str(e)
            }
    
    async def _execute_api_call_node(
        self,
        context: ExecutionContext,
        node: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute API call node"""
        try:
            url = node.get("url", "")
            method = node.get("method", "GET")
            headers = node.get("headers", {})
            body = node.get("body", {})
            
            # Interpolate variables
            url = self._interpolate_variables(url, context.variables)
            body = self._interpolate_variables(body, context.variables)
            
            async with aiohttp.ClientSession() as session:
                if method.upper() == "GET":
                    async with session.get(url, headers=headers) as response:
                        result = await response.json()
                elif method.upper() == "POST":
                    async with session.post(url, headers=headers, json=body) as response:
                        result = await response.json()
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                return {
                    "content": result,
                    "success": response.status == 200,
                    "status_code": response.status
                }
                
        except Exception as e:
            logger.error(f"API call node execution failed: {e}")
            return {
                "content": f"API call failed: {str(e)}",
                "success": False,
                "error": str(e)
            }
    
    async def _execute_user_input_node(
        self,
        context: ExecutionContext,
        node: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute user input node"""
        try:
            prompt = node.get("prompt", "Please provide input:")
            input_type = node.get("input_type", "text")
            
            # For now, use default input from context
            # In a real implementation, this would wait for user input
            user_input = context.variables.get("user_input", "Default input")
            
            return {
                "content": user_input,
                "success": True,
                "input_type": input_type
            }
            
        except Exception as e:
            logger.error(f"User input node execution failed: {e}")
            return {
                "content": f"User input failed: {str(e)}",
                "success": False,
                "error": str(e)
            }
    
    async def _execute_output_node(
        self,
        context: ExecutionContext,
        node: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute output node"""
        try:
            output_format = node.get("output_format", "text")
            input_data = self._get_node_input_data(context, node)
            
            if output_format == "json":
                result = json.dumps(input_data, indent=2)
            elif output_format == "text":
                result = str(input_data)
            else:
                result = input_data
            
            return {
                "content": result,
                "success": True,
                "output_format": output_format
            }
            
        except Exception as e:
            logger.error(f"Output node execution failed: {e}")
            return {
                "content": f"Output generation failed: {str(e)}",
                "success": False,
                "error": str(e)
            }
    
    def _get_node_input_data(
        self,
        context: ExecutionContext,
        node: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get input data for a node from previous nodes"""
        input_sources = node.get("input_sources", [])
        input_data = {}
        
        for source in input_sources:
            source_node_id = source.get("node_id")
            if source_node_id in context.results:
                source_result = context.results[source_node_id]
                input_data[source.get("key", source_node_id)] = source_result.get("content")
        
        return input_data
    
    async def _route_node_result(
        self,
        context: ExecutionContext,
        node_id: str,
        result: Dict[str, Any],
        execution_graph: Dict[str, Dict[str, Any]]
    ):
        """Route node result to dependent nodes"""
        try:
            node_info = execution_graph[node_id]
            dependents = node_info["dependents"]
            
            for dependent_id in dependents:
                dependent_info = execution_graph[dependent_id]
                dependent_node = dependent_info["node"]
                
                # Check if all dependencies are satisfied
                dependencies_satisfied = all(
                    execution_graph[dep]["executed"]
                    for dep in dependent_info["dependencies"]
                )
                
                if dependencies_satisfied and not dependent_info["executed"]:
                    # Update dependent node's input data
                    await self._update_node_input_data(context, dependent_id, result)
                    
        except Exception as e:
            logger.error(f"Failed to route node result: {e}")
    
    async def _update_node_input_data(
        self,
        context: ExecutionContext,
        node_id: str,
        result: Dict[str, Any]
    ):
        """Update input data for a node"""
        if node_id in context.step_contexts:
            step_context = context.step_contexts[node_id]
            if "input_data" not in step_context.variables:
                step_context.variables["input_data"] = {}
            step_context.variables["input_data"].update(result)
    
    async def _update_visual_node_status(
        self,
        context: ExecutionContext,
        node_id: str,
        status: StepStatus
    ):
        """Update visual node status and broadcast"""
        try:
            # Update step context
            if node_id in context.step_contexts:
                context.step_contexts[node_id].status = status
                context.step_contexts[node_id].end_time = datetime.utcnow()
            
            # Broadcast status update
            await self.websocket_manager.broadcast(
                "visual_node_status_changed",
                {
                    "execution_id": context.execution_id,
                    "workflow_id": context.workflow_id,
                    "node_id": node_id,
                    "status": status.value,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to update visual node status: {e}")
    
    def _evaluate_condition_expression(
        self,
        condition: str,
        variables: Dict[str, Any]
    ) -> bool:
        """Evaluate condition expression"""
        try:
            # Simple condition evaluation
            # In a real implementation, this would use a proper expression evaluator
            if "==" in condition:
                left, right = condition.split("==", 1)
                return self._evaluate_expression(left.strip(), variables) == self._evaluate_expression(right.strip(), variables)
            elif "!=" in condition:
                left, right = condition.split("!=", 1)
                return self._evaluate_expression(left.strip(), variables) != self._evaluate_expression(right.strip(), variables)
            elif "contains" in condition:
                # Handle contains operator
                return self._evaluate_contains_condition(condition, variables)
            else:
                # Simple boolean evaluation
                return bool(self._evaluate_expression(condition, variables))
                
        except Exception as e:
            logger.error(f"Condition evaluation failed: {e}")
            return False
    
    def _evaluate_contains_condition(
        self,
        condition: str,
        variables: Dict[str, Any]
    ) -> bool:
        """Evaluate contains condition"""
        try:
            # Parse "variable contains value" format
            if " contains " in condition:
                var_name, value = condition.split(" contains ", 1)
                var_value = self._evaluate_expression(var_name.strip(), variables)
                return str(value.strip()).lower() in str(var_value).lower()
            return False
        except Exception:
            return False
    
    async def _validate_visual_workflow(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ):
        """Validate visual workflow structure"""
        try:
            # Check for cycles
            if self._has_cycles(nodes, edges):
                raise ValueError("Workflow contains cycles")
            
            # Validate node types
            valid_node_types = ["ai_agent", "condition", "transform", "api_call", "user_input", "output"]
            for node in nodes:
                if node.get("type") not in valid_node_types:
                    raise ValueError(f"Invalid node type: {node.get('type')}")
            
            # Validate edges
            node_ids = {node["id"] for node in nodes}
            for edge in edges:
                if edge["source"] not in node_ids or edge["target"] not in node_ids:
                    raise ValueError(f"Invalid edge: {edge}")
            
        except Exception as e:
            logger.error(f"Visual workflow validation failed: {e}")
            raise
    
    def _has_cycles(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> bool:
        """Check if workflow has cycles using DFS"""
        try:
            # Build adjacency list
            graph = {node["id"]: [] for node in nodes}
            for edge in edges:
                graph[edge["source"]].append(edge["target"])
            
            # DFS to detect cycles
            visited = set()
            rec_stack = set()
            
            def dfs(node):
                visited.add(node)
                rec_stack.add(node)
                
                for neighbor in graph[node]:
                    if neighbor not in visited:
                        if dfs(neighbor):
                            return True
                    elif neighbor in rec_stack:
                        return True
                
                rec_stack.remove(node)
                return False
            
            for node in graph:
                if node not in visited:
                    if dfs(node):
                        return True
            
            return False
            
        except Exception:
            return False
    
    async def _transform_text(
        self,
        node: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> str:
        """Transform text data"""
        try:
            operation = node.get("operation", "identity")
            text = str(input_data.get("content", ""))
            
            if operation == "uppercase":
                return text.upper()
            elif operation == "lowercase":
                return text.lower()
            elif operation == "capitalize":
                return text.capitalize()
            elif operation == "trim":
                return text.strip()
            else:
                return text
                
        except Exception as e:
            logger.error(f"Text transform failed: {e}")
            return str(input_data.get("content", ""))
    
    async def _transform_json(
        self,
        node: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Transform JSON data"""
        try:
            operation = node.get("operation", "identity")
            data = input_data.get("content", {})
            
            if isinstance(data, str):
                data = json.loads(data)
            
            if operation == "extract":
                path = node.get("path", "")
                return self._extract_json_path(data, path)
            elif operation == "flatten":
                return self._flatten_json(data)
            else:
                return data
                
        except Exception as e:
            logger.error(f"JSON transform failed: {e}")
            return input_data.get("content", {})
    
    async def _transform_format(
        self,
        node: Dict[str, Any],
        input_data: Dict[str, Any]
    ) -> str:
        """Transform data format"""
        try:
            format_type = node.get("format_type", "text")
            data = input_data.get("content", "")
            
            if format_type == "markdown":
                return f"# {data}"
            elif format_type == "html":
                return f"<p>{data}</p>"
            elif format_type == "json":
                return json.dumps(data, indent=2)
            else:
                return str(data)
                
        except Exception as e:
            logger.error(f"Format transform failed: {e}")
            return str(input_data.get("content", ""))
    
    def _extract_json_path(self, data: Any, path: str) -> Any:
        """Extract value from JSON using path"""
        try:
            if not path:
                return data
            
            keys = path.split(".")
            result = data
            
            for key in keys:
                if isinstance(result, dict) and key in result:
                    result = result[key]
                else:
                    return None
            
            return result
            
        except Exception:
            return None
    
    def _flatten_json(self, data: Any, prefix: str = "") -> Dict[str, Any]:
        """Flatten nested JSON"""
        try:
            result = {}
            
            if isinstance(data, dict):
                for key, value in data.items():
                    new_key = f"{prefix}.{key}" if prefix else key
                    result.update(self._flatten_json(value, new_key))
            elif isinstance(data, list):
                for i, value in enumerate(data):
                    new_key = f"{prefix}[{i}]" if prefix else f"[{i}]"
                    result.update(self._flatten_json(value, new_key))
            else:
                result[prefix] = data
            
            return result
            
        except Exception:
            return {prefix: data} 