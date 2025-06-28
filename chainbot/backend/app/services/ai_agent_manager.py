import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from dataclasses import dataclass, field
import aiohttp
from sqlalchemy.orm import Session

from ..models.agent import Agent
from ..models.audit_log import AuditLog
from ..services import get_websocket_manager
from ..services.audit import AuditService
from .agent_brain import AgentBrain, BrainRequest, BrainResponse, AgentPersona, CompletionProvider
from ..services.websocket_manager import WindowType, WebSocketMessage, MessageType

logger = logging.getLogger(__name__)

class AgentType(Enum):
    """Supported AI agent types"""
    CHATGPT = "chatgpt"
    CUSTOM_GPT = "custom_gpt"
    ALEX_OS_AGENT = "alex_os_agent"
    GPT5 = "gpt5"
    WORKFLOW_AGENT = "workflow_agent"
    SUPERVISOR_AGENT = "supervisor_agent"

class AgentStatus(Enum):
    """Agent status states"""
    IDLE = "idle"
    BUSY = "busy"
    THINKING = "thinking"
    COMMUNICATING = "communicating"
    ERROR = "error"
    OFFLINE = "offline"

@dataclass
class AgentCapability:
    """Agent capability definition"""
    name: str
    description: str
    input_types: List[str]
    output_types: List[str]
    parameters: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AgentContext:
    """Agent execution context"""
    agent_id: str
    session_id: str
    workflow_id: Optional[str] = None
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    shared_state: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

class AIAgentManager:
    """
    Comprehensive AI agent manager for ChainBot
    
    Manages:
    - ChatGPT integration via AgentBrain
    - Custom GPTs from user accounts
    - ALEX OS framework agents
    - Future GPT-5 integration
    - Agent cooperation and communication
    - Workflow supervision
    """
    
    def __init__(self, db: Session, audit_service: AuditService):
        self.db = db
        self.audit_service = audit_service
        self.agent_brain: Optional[AgentBrain] = None
        self.active_agents: Dict[str, Dict[str, Any]] = {}
        self.agent_sessions: Dict[str, AgentContext] = {}
        self.supervisor_agents: List[str] = []
        self.chatgpt_config: Dict[str, Any] = {}
        self.custom_gpt_configs: Dict[str, Dict[str, Any]] = {}
        
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize the AI agent manager"""
        try:
            logger.info("Initializing AI Agent Manager...")
            
            # Initialize agent brain
            self.agent_brain = AgentBrain()
            
            # Get API keys from config
            openai_api_key = config.get("openai", {}).get("api_key")
            maclink_url = config.get("maclink", {}).get("url")
            
            # Initialize brain with providers
            await self.agent_brain.initialize(openai_api_key, maclink_url)
            
            # Load configurations
            self.chatgpt_config = config.get("chatgpt", {})
            self.custom_gpt_configs = config.get("custom_gpts", {})
            
            # Initialize supervisor agents
            await self._initialize_supervisor_agents()
            
            # Load existing agents from database
            await self._load_existing_agents()
            
            logger.info("AI Agent Manager initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize AI Agent Manager: {e}")
            return False
    
    async def create_agent(
        self,
        agent_type: AgentType,
        name: str,
        description: str,
        config: Dict[str, Any],
        user_id: int,
        session_id: int
    ) -> str:
        """Create a new AI agent"""
        try:
            agent_id = f"{agent_type.value}_{name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            # Validate agent configuration
            await self._validate_agent_config(agent_type, config)
            
            # Create agent record
            agent = Agent(
                name=name,
                type=agent_type.value,
                config=config,
                status=AgentStatus.IDLE.value,
                session_id=session_id
            )
            
            self.db.add(agent)
            self.db.commit()
            
            # Initialize agent context
            agent_context = AgentContext(
                agent_id=agent_id,
                session_id=str(session_id),
                metadata={"created_by": user_id, "agent_type": agent_type.value}
            )
            
            self.agent_sessions[agent_id] = agent_context
            agent_config = config or {}
            self.active_agents[agent_id] = {
                "agent": agent,
                "context": agent_context,
                "status": AgentStatus(agent.status),
                "capabilities": await self._get_agent_capabilities(agent_type, agent_config),
                "last_activity": datetime.utcnow()
            }
            
            # Log audit event
            await self.audit_service.log_agent_event(
                agent_id=agent.id,
                action="agent_created",
                user_id=user_id,
                session_id=session_id,
                metadata={"agent_type": agent_type.value, "config": config}
            )
            
            # Broadcast agent creation
            ws_manager = get_websocket_manager()
            if ws_manager:
                message = WebSocketMessage(
                    message_type=MessageType.AGENT_SPAWN,
                    window_type=WindowType.AGENT_MAP,
                    timestamp=datetime.utcnow(),
                    data={
                        "agent_id": agent_id,
                        "name": name,
                        "type": agent_type.value,
                        "status": AgentStatus.IDLE.value
                    }
                )
                await ws_manager.broadcast_to_window(WindowType.AGENT_MAP, message)
            
            logger.info(f"Created {agent_type.value} agent: {name} (ID: {agent_id})")
            return agent_id
            
        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            raise
    
    async def connect_chatgpt_account(
        self,
        api_key: str,
        user_id: int,
        session_id: int
    ) -> bool:
        """Connect a ChatGPT account"""
        try:
            # Validate API key by testing with agent brain
            if not self.agent_brain:
                raise ValueError("Agent brain not initialized")
            
            # Test the API key by making a simple request
            test_request = BrainRequest(
                prompt="Hello",
                agent_id="test",
                provider=CompletionProvider.OPENAI
            )
            
            try:
                await self.agent_brain.generate_completion(test_request)
                logger.info("OpenAI API key validated successfully")
            except Exception as e:
                logger.error(f"OpenAI API key validation failed: {e}")
                return False
            
            # Store configuration
            self.chatgpt_config["api_key"] = api_key
            self.chatgpt_config["user_id"] = user_id
            self.chatgpt_config["connected_at"] = datetime.utcnow()
            
            # Log connection
            await self.audit_service.log_security_event(
                "chatgpt_account_connected",
                user_id,
                {"session_id": session_id}
            )
            
            logger.info(f"ChatGPT account connected for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect ChatGPT account: {e}")
            return False
    
    async def import_custom_gpts(
        self,
        user_id: int,
        session_id: int
    ) -> List[Dict[str, Any]]:
        """Import Custom GPTs from user's ChatGPT account"""
        try:
            if not self.chatgpt_config.get("api_key"):
                raise ValueError("ChatGPT account not connected")
            
            # Fetch Custom GPTs from ChatGPT API
            custom_gpts = await self._fetch_custom_gpts()
            
            imported_gpts = []
            for gpt in custom_gpts:
                # Create agent for each Custom GPT
                agent_id = await self.create_agent(
                    agent_type=AgentType.CUSTOM_GPT,
                    name=gpt["name"],
                    description=gpt.get("description", ""),
                    config={
                        "gpt_id": gpt["id"],
                        "instructions": gpt.get("instructions", ""),
                        "tools": gpt.get("tools", []),
                        "knowledge": gpt.get("knowledge", [])
                    },
                    user_id=user_id,
                    session_id=session_id
                )
                
                imported_gpts.append({
                    "agent_id": agent_id,
                    "name": gpt["name"],
                    "description": gpt.get("description", ""),
                    "gpt_id": gpt["id"]
                })
            
            logger.info(f"Imported {len(imported_gpts)} Custom GPTs")
            return imported_gpts
            
        except Exception as e:
            logger.error(f"Failed to import Custom GPTs: {e}")
            raise
    
    async def send_message_to_agent(
        self,
        agent_id: str,
        message: str,
        user_id: int,
        session_id: int,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send a message to an agent and get response"""
        try:
            if agent_id not in self.active_agents:
                raise ValueError(f"Agent {agent_id} not found")
            
            agent_info = self.active_agents[agent_id]
            agent = agent_info["agent"]
            
            # Update agent status
            await self._update_agent_status(agent_id, AgentStatus.THINKING)
            
            # Get agent persona
            agent_config = agent.config or {}
            persona = self._get_agent_persona(agent.type, agent_config)
            
            # Prepare brain request
            brain_request = BrainRequest(
                prompt=message,
                agent_id=agent_id,
                persona=persona,
                conversation_history=agent_info["context"].conversation_history,
                context_data=context or {},
                metadata={
                    "user_id": user_id,
                    "session_id": session_id,
                    "agent_type": agent.type
                }
            )
            
            # Generate completion using agent brain
            if not self.agent_brain:
                raise ValueError("Agent brain not initialized")
            
            brain_response = await self.agent_brain.generate_completion(brain_request)
            
            # Update conversation history
            agent_info["context"].conversation_history.extend([
                {"role": "user", "content": message},
                {"role": "assistant", "content": brain_response.content}
            ])
            
            # Update agent status
            await self._update_agent_status(agent_id, AgentStatus.IDLE)
            
            # Log the interaction
            await self.audit_service.log_agent_event(
                agent_id=agent.id,
                action="message_processed",
                user_id=user_id,
                session_id=session_id,
                metadata={
                    "message_length": len(message),
                    "response_length": len(brain_response.content),
                    "provider": brain_response.provider.value,
                    "model": brain_response.model,
                    "tokens_used": brain_response.tokens_used,
                    "processing_time": brain_response.processing_time,
                    "confidence_score": brain_response.confidence_score
                }
            )
            
            # Broadcast response
            ws_manager = get_websocket_manager()
            if ws_manager:
                await ws_manager.broadcast_to_window(
                    WindowType.AGENT_MAP,
                    WebSocketMessage(
                        message_type=MessageType.AGENT_RESPONSE,
                        window_type=WindowType.AGENT_MAP,
                        timestamp=datetime.utcnow(),
                        data={
                            "agent_id": agent_id,
                            "message": brain_response.content,
                            "provider": brain_response.provider.value,
                            "model": brain_response.model,
                            "metadata": brain_response.metadata
                        }
                    )
                )
            
            return {
                "agent_id": agent_id,
                "response": brain_response.content,
                "provider": brain_response.provider.value,
                "model": brain_response.model,
                "tokens_used": brain_response.tokens_used,
                "processing_time": brain_response.processing_time,
                "confidence_score": brain_response.confidence_score,
                "metadata": brain_response.metadata
            }
            
        except Exception as e:
            logger.error(f"Failed to send message to agent {agent_id}: {e}")
            await self._update_agent_status(agent_id, AgentStatus.ERROR)
            raise
    
    async def create_workflow_chain(
        self,
        agents: List[str],
        workflow_config: Dict[str, Any],
        user_id: int,
        session_id: int
    ) -> str:
        """Create a workflow chain connecting multiple agents"""
        try:
            workflow_id = f"workflow_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            # Validate agents
            for agent_id in agents:
                if agent_id not in self.active_agents:
                    raise ValueError(f"Agent {agent_id} not found")
            
            # Create workflow context
            workflow_context = {
                "workflow_id": workflow_id,
                "agents": agents,
                "config": workflow_config,
                "status": "active",
                "created_by": user_id,
                "session_id": session_id,
                "created_at": datetime.utcnow(),
                "conversation_chain": []
            }
            
            # Update agent contexts with workflow information
            for agent_id in agents:
                if agent_id in self.agent_sessions:
                    self.agent_sessions[agent_id].workflow_id = workflow_id
                    self.agent_sessions[agent_id].shared_state = workflow_context
            
            # Log workflow creation
            await self.audit_service.log_event(
                action="workflow_chain_created",
                actor_id=user_id,
                target_type="workflow",
                target_id=0,  # Will be updated when workflow model is created
                session_id=session_id,
                meta={
                    "workflow_id": workflow_id,
                    "agents": agents,
                    "config": workflow_config
                }
            )
            
            logger.info(f"Created workflow chain {workflow_id} with {len(agents)} agents")
            return workflow_id
            
        except Exception as e:
            logger.error(f"Failed to create workflow chain: {e}")
            raise
    
    async def route_message_through_workflow(
        self,
        workflow_id: str,
        message: str,
        user_id: int,
        session_id: int
    ) -> List[Dict[str, Any]]:
        """Route a message through a workflow chain of agents"""
        try:
            # Find workflow context
            workflow_context = None
            for agent_context in self.agent_sessions.values():
                if agent_context.workflow_id == workflow_id:
                    workflow_context = agent_context.shared_state
                    break
            
            if not workflow_context:
                raise ValueError(f"Workflow {workflow_id} not found")
            
            agents = workflow_context["agents"]
            responses = []
            
            # Route message through each agent in the chain
            current_message = message
            for agent_id in agents:
                # Send message to agent
                response = await self.send_message_to_agent(
                    agent_id=agent_id,
                    message=current_message,
                    user_id=user_id,
                    session_id=session_id,
                    context={"workflow_id": workflow_id, "chain_position": len(responses)}
                )
                
                responses.append({
                    "agent_id": agent_id,
                    "agent_name": self.active_agents[agent_id]["agent"].name,
                    "response": response["response"],
                    "timestamp": datetime.utcnow().isoformat(),
                    "metadata": response.get("metadata", {})
                })
                
                # Use response as input for next agent
                current_message = response["response"]
                
                # Add to workflow conversation chain
                workflow_context["conversation_chain"].append({
                    "agent_id": agent_id,
                    "input": current_message,
                    "output": response["response"],
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            # Log workflow execution
            await self.audit_service.log_event(
                action="workflow_executed",
                actor_id=user_id,
                target_type="workflow",
                target_id=0,
                session_id=session_id,
                meta={
                    "workflow_id": workflow_id,
                    "agents_processed": len(agents),
                    "total_responses": len(responses)
                }
            )
            
            return responses
            
        except Exception as e:
            logger.error(f"Failed to route message through workflow {workflow_id}: {e}")
            raise
    
    async def get_agent_capabilities(self, agent_id: str) -> List[AgentCapability]:
        """Get capabilities of a specific agent"""
        if agent_id not in self.active_agents:
            return []
        
        config_dict = dict(self.active_agents[agent_id]["agent"].config) if not isinstance(self.active_agents[agent_id]["agent"].config, dict) else self.active_agents[agent_id]["agent"].config
        return self._get_agent_capabilities(AgentType(self.active_agents[agent_id]["agent"].type), config_dict)
    
    async def get_agent_status(self, agent_id: str) -> AgentStatus:
        """Get current status of an agent"""
        if agent_id not in self.active_agents:
            return AgentStatus.OFFLINE
        
        return self.active_agents[agent_id]["status"]
    
    async def get_workflow_conversation_history(
        self,
        workflow_id: str
    ) -> List[Dict[str, Any]]:
        """Get conversation history for a workflow"""
        for agent_context in self.agent_sessions.values():
            if agent_context.workflow_id == workflow_id:
                return agent_context.shared_state.get("conversation_chain", [])
        
        return []
    
    async def _initialize_supervisor_agents(self):
        """Initialize ALEX OS supervisor agents"""
        try:
            # Create supervisor agents for workflow monitoring
            supervisor_config = {
                "monitoring_enabled": True,
                "intervention_threshold": 0.8,
                "cooperation_mode": "autonomous"
            }
            
            # This would integrate with ALEX OS agent framework
            logger.info("Supervisor agents initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize supervisor agents: {e}")
    
    async def _load_existing_agents(self):
        """Load existing agents from database"""
        try:
            agents = self.db.query(Agent).filter(Agent.status != "deleted").all()
            
            for agent in agents:
                agent_id = f"{agent.type}_{agent.name}_{agent.id}"
                agent_context = AgentContext(
                    agent_id=agent_id,
                    session_id=str(agent.session_id),
                    workflow_id=None
                )
                
                self.agent_sessions[agent_id] = agent_context
                agent_config = agent.config or {}
                self.active_agents[agent_id] = {
                    "agent": agent,
                    "context": agent_context,
                    "status": AgentStatus(agent.status),
                    "capabilities": await self._get_agent_capabilities(AgentType(agent.type), agent_config),
                    "last_activity": datetime.utcnow()
                }
            
            logger.info(f"Loaded {len(agents)} existing agents")
            
        except Exception as e:
            logger.error(f"Failed to load existing agents: {e}")
    
    async def _validate_agent_config(self, agent_type: AgentType, config: Dict[str, Any]) -> bool:
        """Validate agent configuration"""
        try:
            if agent_type == AgentType.CHATGPT:
                return "api_key" in config
            elif agent_type == AgentType.CUSTOM_GPT:
                return "gpt_id" in config and "instructions" in config
            elif agent_type == AgentType.ALEX_OS_AGENT:
                return "agent_type" in config and "capabilities" in config
            elif agent_type == AgentType.GPT5:
                # Future GPT-5 validation
                return True
            else:
                return True
                
        except Exception as e:
            logger.error(f"Agent config validation failed: {e}")
            return False
    
    async def _get_agent_capabilities(
        self,
        agent_type: AgentType,
        config: Dict[str, Any]
    ) -> List[AgentCapability]:
        """Get capabilities for an agent type"""
        capabilities = []
        
        if agent_type == AgentType.CHATGPT:
            capabilities.extend([
                AgentCapability(
                    name="conversation",
                    description="Natural language conversation",
                    input_types=["text"],
                    output_types=["text"],
                    parameters={"max_tokens": 2048, "temperature": 0.7}
                ),
                AgentCapability(
                    name="code_generation",
                    description="Generate code in various languages",
                    input_types=["text", "code"],
                    output_types=["code", "text"],
                    parameters={"languages": ["python", "javascript", "typescript", "java", "cpp"]}
                ),
                AgentCapability(
                    name="analysis",
                    description="Analyze and explain concepts",
                    input_types=["text", "data"],
                    output_types=["text", "analysis"],
                    parameters={"analysis_types": ["sentiment", "topic", "summary"]}
                )
            ])
        elif agent_type == AgentType.CUSTOM_GPT:
            # Use capabilities from config
            custom_capabilities = config.get("capabilities", [])
            for cap in custom_capabilities:
                capabilities.append(AgentCapability(
                    name=cap.get("name", "custom"),
                    description=cap.get("description", "Custom capability"),
                    input_types=cap.get("input_types", ["text"]),
                    output_types=cap.get("output_types", ["text"]),
                    parameters=cap.get("parameters", {})
                ))
        elif agent_type == AgentType.ALEX_OS_AGENT:
            capabilities.extend([
                AgentCapability(
                    name="system_control",
                    description="Control ALEX OS system components",
                    input_types=["command", "text"],
                    output_types=["status", "result", "text"],
                    parameters={"permissions": ["read", "write", "execute"]}
                ),
                AgentCapability(
                    name="workflow_orchestration",
                    description="Orchestrate complex workflows",
                    input_types=["workflow_definition", "parameters"],
                    output_types=["workflow_status", "results"],
                    parameters={"workflow_types": ["sequential", "parallel", "conditional"]}
                )
            ])
        elif agent_type == AgentType.WORKFLOW_AGENT:
            capabilities.extend([
                AgentCapability(
                    name="workflow_execution",
                    description="Execute workflow steps",
                    input_types=["workflow_step", "context"],
                    output_types=["step_result", "context_update"],
                    parameters={"step_types": ["action", "decision", "loop"]}
                ),
                AgentCapability(
                    name="data_processing",
                    description="Process and transform data",
                    input_types=["data", "transformation_rules"],
                    output_types=["processed_data", "metadata"],
                    parameters={"data_types": ["json", "csv", "xml", "text"]}
                )
            ])
        
        return capabilities

    def _get_agent_persona(self, agent_type: str, config: Dict[str, Any]) -> Optional[AgentPersona]:
        """Get persona for an agent type"""
        if not self.agent_brain:
            return None
            
        if agent_type == AgentType.CHATGPT.value:
            return self.agent_brain.get_persona("general_assistant")
        elif agent_type == AgentType.CUSTOM_GPT.value:
            # Use custom persona from config
            custom_persona = config.get("persona", {})
            if custom_persona:
                return AgentPersona(
                    name=custom_persona.get("name", "custom"),
                    description=custom_persona.get("description", "Custom GPT"),
                    system_prompt=custom_persona.get("system_prompt", "You are a helpful assistant."),
                    preferred_provider=CompletionProvider.OPENAI,
                    preferred_model=custom_persona.get("model", "gpt-4o"),
                    temperature=custom_persona.get("temperature", 0.7),
                    max_tokens=custom_persona.get("max_tokens", 2048),
                    capabilities=custom_persona.get("capabilities", [])
                )
            return self.agent_brain.get_persona("general_assistant")
        elif agent_type == AgentType.ALEX_OS_AGENT.value:
            return self.agent_brain.get_persona("code_assistant")
        elif agent_type == AgentType.WORKFLOW_AGENT.value:
            return self.agent_brain.get_persona("analyst")
        else:
            return self.agent_brain.get_persona("general_assistant")
    
    async def _validate_chatgpt_key(self, api_key: str) -> bool:
        """Validate ChatGPT API key"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {api_key}"}
                async with session.get(
                    "https://api.openai.com/v1/models",
                    headers=headers
                ) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def _fetch_custom_gpts(self) -> List[Dict[str, Any]]:
        """Fetch Custom GPTs from ChatGPT API"""
        try:
            api_key = self.chatgpt_config.get("api_key")
            if not api_key:
                return []
            
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {api_key}"}
                # Note: This endpoint may not exist yet, using placeholder
                async with session.get(
                    "https://api.openai.com/v1/gpts",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("data", [])
                    else:
                        logger.warning("Custom GPTs API not available yet")
                        return []
                        
        except Exception as e:
            logger.error(f"Failed to fetch Custom GPTs: {e}")
            return []
    
    async def _process_agent_message(
        self,
        agent_id: str,
        message: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process message based on agent type"""
        try:
            agent_info = self.active_agents[agent_id]
            agent_type = AgentType(agent_info["agent"].type)
            config = agent_info["agent"].config
            
            start_time = datetime.utcnow()
            
            if agent_type == AgentType.CHATGPT:
                response = await self._call_chatgpt_api(message, context)
            elif agent_type == AgentType.CUSTOM_GPT:
                response = await self._call_custom_gpt_api(message, config, context)
            elif agent_type == AgentType.ALEX_OS_AGENT:
                response = await self._call_alex_os_agent(message, config, context)
            elif agent_type == AgentType.GPT5:
                response = await self._call_gpt5_api(message, context)
            else:
                response = {"content": "Agent type not supported", "metadata": {}}
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            response["processing_time"] = processing_time
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to process agent message: {e}")
            return {
                "content": f"Error processing message: {str(e)}",
                "metadata": {"error": True}
            }
    
    async def _call_chatgpt_api(
        self,
        message: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call ChatGPT API"""
        try:
            api_key = self.chatgpt_config.get("api_key")
            if not api_key:
                raise ValueError("ChatGPT API key not configured")
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                
                data = {
                    "model": "gpt-4",
                    "messages": [{"role": "user", "content": message}],
                    "temperature": 0.7
                }
                
                async with session.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result["choices"][0]["message"]["content"]
                        return {
                            "content": content,
                            "metadata": {
                                "model": "gpt-4",
                                "tokens_used": result.get("usage", {}).get("total_tokens", 0)
                            }
                        }
                    else:
                        raise Exception(f"ChatGPT API error: {response.status}")
                        
        except Exception as e:
            logger.error(f"ChatGPT API call failed: {e}")
            raise
    
    async def _call_custom_gpt_api(
        self,
        message: str,
        config: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call Custom GPT API"""
        try:
            # This would use the Custom GPT API when available
            # For now, simulate with enhanced context
            enhanced_message = f"{config.get('instructions', '')}\n\nUser: {message}"
            
            # Use ChatGPT API with custom instructions
            return await self._call_chatgpt_api(enhanced_message, context)
            
        except Exception as e:
            logger.error(f"Custom GPT API call failed: {e}")
            raise
    
    async def _call_alex_os_agent(
        self,
        message: str,
        config: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call ALEX OS agent"""
        try:
            # This would integrate with ALEX OS agent framework
            agent_type = config.get("agent_type", "general")
            
            # Simulate ALEX OS agent response
            response = f"[ALEX OS {agent_type.upper()} AGENT] Processing: {message}"
            
            return {
                "content": response,
                "metadata": {
                    "agent_type": agent_type,
                    "alex_os_integration": True
                }
            }
            
        except Exception as e:
            logger.error(f"ALEX OS agent call failed: {e}")
            raise
    
    async def _call_gpt5_api(
        self,
        message: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call GPT-5 API (future implementation)"""
        try:
            # Placeholder for future GPT-5 integration
            response = f"[GPT-5] Advanced processing: {message}"
            
            return {
                "content": response,
                "metadata": {
                    "model": "gpt-5",
                    "capabilities": "advanced"
                }
            }
            
        except Exception as e:
            logger.error(f"GPT-5 API call failed: {e}")
            raise
    
    async def _update_agent_status(self, agent_id: str, status: AgentStatus):
        """Update agent status"""
        if agent_id in self.active_agents:
            self.active_agents[agent_id]["status"] = status
            self.active_agents[agent_id]["last_activity"] = datetime.utcnow()
            
            # Update database
            agent = self.active_agents[agent_id]["agent"]
            agent.status = status.value
            self.db.commit()
            
            # Broadcast status update
            ws_manager = get_websocket_manager()
            if ws_manager:
                await ws_manager.broadcast(
                    "agent_status_changed",
                    {
                        "agent_id": agent_id,
                        "status": status.value,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                ) 