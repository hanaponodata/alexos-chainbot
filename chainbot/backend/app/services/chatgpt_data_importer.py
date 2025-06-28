import asyncio
import json
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from pathlib import Path
import aiofiles
from sqlalchemy.orm import Session

from ..models.agent import Agent
from ..models.session import Session as DBSession
from ..services.audit import AuditService
from ..services import get_websocket_manager

logger = logging.getLogger(__name__)

@dataclass
class ChatGPTConversation:
    """Represents a ChatGPT conversation from data dump"""
    conversation_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ImportedContext:
    """Represents imported context for agents"""
    context_id: str
    source_type: str  # "chatgpt_dump", "conversation_export", "manual_upload"
    source_name: str
    conversations: List[ChatGPTConversation] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

class ChatGPTDataImporter:
    """
    Comprehensive ChatGPT data import service for ChainBot
    
    Features:
    - Import ChatGPT data dumps (JSON format)
    - Parse conversation history
    - Extract key insights and patterns
    - Create context for chained agents
    - Intelligent context summarization
    - Conversation clustering and categorization
    """
    
    def __init__(self, db: Session, audit_service: AuditService):
        self.db = db
        self.audit_service = audit_service
        self.imported_contexts: Dict[str, ImportedContext] = {}
        self.conversation_cache: Dict[str, ChatGPTConversation] = {}
        
    async def import_chatgpt_dump(
        self,
        file_path: str,
        user_id: int,
        session_id: int,
        import_options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Import a ChatGPT data dump file"""
        try:
            logger.info(f"Starting ChatGPT data import from: {file_path}")
            
            # Validate file
            if not await self._validate_chatgpt_dump(file_path):
                raise ValueError("Invalid ChatGPT data dump format")
            
            # Parse the dump file
            conversations = await self._parse_chatgpt_dump(file_path)
            
            # Process conversations
            processed_data = await self._process_conversations(
                conversations, 
                import_options or {}
            )
            
            # Create context
            context_id = f"context_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            imported_context = ImportedContext(
                context_id=context_id,
                source_type="chatgpt_dump",
                source_name=Path(file_path).name,
                conversations=conversations,
                summary=processed_data["summary"],
                metadata=processed_data["metadata"]
            )
            
            # Store context
            self.imported_contexts[context_id] = imported_context
            
            # Cache conversations
            for conv in conversations:
                self.conversation_cache[conv.conversation_id] = conv
            
            # Log import
            await self.audit_service.log_event(
                action="chatgpt_dump_imported",
                actor_id=user_id,
                target_type="context",
                target_id=0,
                session_id=session_id,
                meta={
                    "context_id": context_id,
                    "file_path": file_path,
                    "conversations_count": len(conversations),
                    "total_messages": processed_data["summary"]["total_messages"],
                    "import_options": import_options
                }
            )
            
            # Broadcast import completion
            ws_manager = get_websocket_manager()
            if ws_manager:
                from ..services.websocket_manager import WebSocketMessage, MessageType, WindowType
                message = WebSocketMessage(
                    message_type=MessageType.LOG_UPDATE,
                    window_type=WindowType.WATCHTOWER,
                    timestamp=datetime.utcnow(),
                    data={
                        "context_id": context_id,
                        "conversations_count": len(conversations),
                        "summary": processed_data["summary"]
                    }
                )
                await ws_manager.broadcast_to_window(WindowType.WATCHTOWER, message)
            
            logger.info(f"ChatGPT data import completed: {context_id}")
            return {
                "context_id": context_id,
                "conversations_count": len(conversations),
                "summary": processed_data["summary"],
                "metadata": processed_data["metadata"]
            }
            
        except Exception as e:
            logger.error(f"Failed to import ChatGPT data dump: {e}")
            raise
    
    async def create_agent_context(
        self,
        context_id: str,
        agent_id: str,
        context_config: Dict[str, Any],
        user_id: int,
        session_id: int
    ) -> Dict[str, Any]:
        """Create context for a specific agent from imported data"""
        try:
            if context_id not in self.imported_contexts:
                raise ValueError(f"Context {context_id} not found")
            
            imported_context = self.imported_contexts[context_id]
            
            # Filter conversations based on agent type and context config
            relevant_conversations = await self._filter_conversations_for_agent(
                imported_context.conversations,
                agent_id,
                context_config
            )
            
            # Create agent-specific context
            agent_context = await self._create_agent_context(
                relevant_conversations,
                context_config
            )
            
            # Log context creation
            await self.audit_service.log_event(
                action="agent_context_created",
                actor_id=user_id,
                target_type="agent",
                target_id=0,
                session_id=session_id,
                meta={
                    "context_id": context_id,
                    "agent_id": agent_id,
                    "conversations_used": len(relevant_conversations),
                    "context_config": context_config
                }
            )
            
            return {
                "agent_id": agent_id,
                "context_id": context_id,
                "conversations_used": len(relevant_conversations),
                "context_summary": agent_context["summary"],
                "context_data": agent_context["data"]
            }
            
        except Exception as e:
            logger.error(f"Failed to create agent context: {e}")
            raise
    
    async def get_context_for_workflow(
        self,
        context_id: str,
        workflow_id: str,
        workflow_config: Dict[str, Any],
        user_id: int,
        session_id: int
    ) -> Dict[str, Any]:
        """Get context for a workflow from imported data"""
        try:
            if context_id not in self.imported_contexts:
                raise ValueError(f"Context {context_id} not found")
            
            imported_context = self.imported_contexts[context_id]
            
            # Analyze workflow requirements
            workflow_context = await self._analyze_workflow_context(
                imported_context.conversations,
                workflow_config
            )
            
            # Create workflow-specific context
            workflow_context_data = await self._create_workflow_context(
                workflow_context,
                workflow_config
            )
            
            return {
                "workflow_id": workflow_id,
                "context_id": context_id,
                "context_summary": workflow_context_data["summary"],
                "context_data": workflow_context_data["data"],
                "relevant_conversations": workflow_context_data["conversations"]
            }
            
        except Exception as e:
            logger.error(f"Failed to get workflow context: {e}")
            raise
    
    async def search_conversations(
        self,
        context_id: str,
        query: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search conversations in imported context"""
        try:
            if context_id not in self.imported_contexts:
                raise ValueError(f"Context {context_id} not found")
            
            imported_context = self.imported_contexts[context_id]
            
            # Perform search
            search_results = await self._search_conversations(
                imported_context.conversations,
                query,
                filters or {}
            )
            
            return search_results
            
        except Exception as e:
            logger.error(f"Failed to search conversations: {e}")
            raise
    
    async def get_context_summary(self, context_id: str) -> Dict[str, Any]:
        """Get summary of imported context"""
        if context_id not in self.imported_contexts:
            raise ValueError(f"Context {context_id} not found")
        
        imported_context = self.imported_contexts[context_id]
        return {
            "context_id": context_id,
            "source_type": imported_context.source_type,
            "source_name": imported_context.source_name,
            "conversations_count": len(imported_context.conversations),
            "summary": imported_context.summary,
            "created_at": imported_context.created_at.isoformat(),
            "metadata": imported_context.metadata
        }
    
    async def _validate_chatgpt_dump(self, file_path: str) -> bool:
        """Validate ChatGPT data dump format"""
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
                data = json.loads(content)
                
                # Check for required fields
                if not isinstance(data, dict):
                    return False
                
                # Check for conversations array
                if "conversations" not in data:
                    return False
                
                if not isinstance(data["conversations"], list):
                    return False
                
                # Validate at least one conversation
                if len(data["conversations"]) == 0:
                    return False
                
                # Validate conversation structure
                for conv in data["conversations"][:5]:  # Check first 5
                    if not isinstance(conv, dict):
                        return False
                    if "id" not in conv or "messages" not in conv:
                        return False
                
                return True
                
        except Exception as e:
            logger.error(f"ChatGPT dump validation failed: {e}")
            return False
    
    async def _parse_chatgpt_dump(self, file_path: str) -> List[ChatGPTConversation]:
        """Parse ChatGPT data dump file"""
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
                data = json.loads(content)
            
            conversations = []
            
            for conv_data in data.get("conversations", []):
                try:
                    # Parse conversation
                    conversation = ChatGPTConversation(
                        conversation_id=conv_data.get("id", ""),
                        title=conv_data.get("title", "Untitled"),
                        created_at=datetime.fromisoformat(conv_data.get("created_at", datetime.utcnow().isoformat())),
                        updated_at=datetime.fromisoformat(conv_data.get("updated_at", datetime.utcnow().isoformat())),
                        messages=conv_data.get("messages", []),
                        metadata=conv_data.get("metadata", {})
                    )
                    
                    conversations.append(conversation)
                    
                except Exception as e:
                    logger.warning(f"Failed to parse conversation: {e}")
                    continue
            
            logger.info(f"Parsed {len(conversations)} conversations from dump")
            return conversations
            
        except Exception as e:
            logger.error(f"Failed to parse ChatGPT dump: {e}")
            raise
    
    async def _process_conversations(
        self,
        conversations: List[ChatGPTConversation],
        options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process conversations and extract insights"""
        try:
            total_messages = sum(len(conv.messages) for conv in conversations)
            total_conversations = len(conversations)
            
            # Analyze conversation patterns
            patterns = await self._analyze_conversation_patterns(conversations)
            
            # Extract key topics
            topics = await self._extract_key_topics(conversations)
            
            # Generate summary
            summary = {
                "total_conversations": total_conversations,
                "total_messages": total_messages,
                "date_range": {
                    "earliest": min(conv.created_at for conv in conversations).isoformat(),
                    "latest": max(conv.updated_at for conv in conversations).isoformat()
                },
                "patterns": patterns,
                "topics": topics,
                "average_messages_per_conversation": total_messages / total_conversations if total_conversations > 0 else 0
            }
            
            # Generate metadata
            metadata = {
                "processing_options": options,
                "processing_timestamp": datetime.utcnow().isoformat(),
                "conversation_ids": [conv.conversation_id for conv in conversations]
            }
            
            return {
                "summary": summary,
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"Failed to process conversations: {e}")
            raise
    
    async def _analyze_conversation_patterns(
        self,
        conversations: List[ChatGPTConversation]
    ) -> Dict[str, Any]:
        """Analyze patterns in conversations"""
        try:
            patterns = {
                "message_lengths": [],
                "response_times": [],
                "conversation_durations": [],
                "user_message_patterns": [],
                "assistant_message_patterns": []
            }
            
            for conv in conversations:
                if len(conv.messages) < 2:
                    continue
                
                # Analyze message lengths
                for msg in conv.messages:
                    if isinstance(msg.get("content"), str):
                        patterns["message_lengths"].append(len(msg["content"]))
                
                # Analyze conversation duration
                if conv.messages:
                    first_msg = conv.messages[0]
                    last_msg = conv.messages[-1]
                    if "timestamp" in first_msg and "timestamp" in last_msg:
                        try:
                            first_time = datetime.fromisoformat(first_msg["timestamp"])
                            last_time = datetime.fromisoformat(last_msg["timestamp"])
                            duration = (last_time - first_time).total_seconds()
                            patterns["conversation_durations"].append(duration)
                        except:
                            pass
            
            # Calculate statistics
            if patterns["message_lengths"]:
                patterns["avg_message_length"] = sum(patterns["message_lengths"]) / len(patterns["message_lengths"])
                patterns["max_message_length"] = max(patterns["message_lengths"])
                patterns["min_message_length"] = min(patterns["message_lengths"])
            
            if patterns["conversation_durations"]:
                patterns["avg_conversation_duration"] = sum(patterns["conversation_durations"]) / len(patterns["conversation_durations"])
            
            return patterns
            
        except Exception as e:
            logger.error(f"Failed to analyze conversation patterns: {e}")
            return {}
    
    async def _extract_key_topics(
        self,
        conversations: List[ChatGPTConversation]
    ) -> List[Dict[str, Any]]:
        """Extract key topics from conversations"""
        try:
            topics = []
            topic_frequency = {}
            
            # Simple keyword extraction (in production, use more sophisticated NLP)
            keywords = [
                "python", "javascript", "api", "database", "machine learning",
                "ai", "data", "analysis", "code", "programming", "development",
                "web", "mobile", "cloud", "security", "testing", "deployment"
            ]
            
            for conv in conversations:
                conv_text = " ".join([
                    msg.get("content", "") for msg in conv.messages 
                    if isinstance(msg.get("content"), str)
                ]).lower()
                
                for keyword in keywords:
                    if keyword in conv_text:
                        topic_frequency[keyword] = topic_frequency.get(keyword, 0) + 1
            
            # Convert to sorted list
            for topic, frequency in sorted(topic_frequency.items(), key=lambda x: x[1], reverse=True):
                topics.append({
                    "topic": topic,
                    "frequency": frequency,
                    "percentage": (frequency / len(conversations)) * 100
                })
            
            return topics[:10]  # Return top 10 topics
            
        except Exception as e:
            logger.error(f"Failed to extract key topics: {e}")
            return []
    
    async def _filter_conversations_for_agent(
        self,
        conversations: List[ChatGPTConversation],
        agent_id: str,
        context_config: Dict[str, Any]
    ) -> List[ChatGPTConversation]:
        """Filter conversations relevant to a specific agent"""
        try:
            # Get agent info
            agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                return conversations
            
            agent_type = agent.type
            agent_config = agent.config or {}
            
            # Filter based on agent type
            if agent_type == "chatgpt":
                # For ChatGPT agents, return all conversations
                return conversations
            
            elif agent_type == "custom_gpt":
                # For Custom GPTs, filter by instructions/tools
                instructions = agent_config.get("instructions", "").lower()
                tools = agent_config.get("tools", [])
                
                relevant_conversations = []
                for conv in conversations:
                    conv_text = " ".join([
                        msg.get("content", "") for msg in conv.messages 
                        if isinstance(msg.get("content"), str)
                    ]).lower()
                    
                    # Check if conversation matches instructions
                    if any(keyword in conv_text for keyword in instructions.split()):
                        relevant_conversations.append(conv)
                        continue
                    
                    # Check if conversation involves tools
                    if tools and any(tool.lower() in conv_text for tool in tools):
                        relevant_conversations.append(conv)
                
                return relevant_conversations
            
            elif agent_type == "alex_os_agent":
                # For ALEX OS agents, filter by agent capabilities
                capabilities = agent_config.get("capabilities", [])
                
                relevant_conversations = []
                for conv in conversations:
                    conv_text = " ".join([
                        msg.get("content", "") for msg in conv.messages 
                        if isinstance(msg.get("content"), str)
                    ]).lower()
                    
                    # Check if conversation matches capabilities
                    if any(cap.lower() in conv_text for cap in capabilities):
                        relevant_conversations.append(conv)
                
                return relevant_conversations
            
            else:
                # For other agent types, return all conversations
                return conversations
                
        except Exception as e:
            logger.error(f"Failed to filter conversations for agent: {e}")
            return conversations
    
    async def _create_agent_context(
        self,
        conversations: List[ChatGPTConversation],
        context_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create context data for an agent"""
        try:
            # Extract relevant messages
            relevant_messages = []
            for conv in conversations:
                for msg in conv.messages:
                    if msg.get("role") in ["user", "assistant"]:
                        relevant_messages.append({
                            "role": msg.get("role"),
                            "content": msg.get("content", ""),
                            "conversation_id": conv.conversation_id,
                            "timestamp": msg.get("timestamp", conv.created_at.isoformat())
                        })
            
            # Create context summary
            context_summary = {
                "conversations_used": len(conversations),
                "messages_used": len(relevant_messages),
                "date_range": {
                    "earliest": min(conv.created_at for conv in conversations).isoformat(),
                    "latest": max(conv.updated_at for conv in conversations).isoformat()
                }
            }
            
            # Create context data
            context_data = {
                "messages": relevant_messages,
                "conversations": [
                    {
                        "id": conv.conversation_id,
                        "title": conv.title,
                        "message_count": len(conv.messages)
                    }
                    for conv in conversations
                ],
                "summary": context_summary
            }
            
            return {
                "summary": context_summary,
                "data": context_data
            }
            
        except Exception as e:
            logger.error(f"Failed to create agent context: {e}")
            raise
    
    async def _analyze_workflow_context(
        self,
        conversations: List[ChatGPTConversation],
        workflow_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze context for workflow execution"""
        try:
            # Extract workflow requirements
            workflow_steps = workflow_config.get("steps", [])
            workflow_type = workflow_config.get("type", "general")
            
            # Find relevant conversations
            relevant_conversations = []
            for conv in conversations:
                conv_text = " ".join([
                    msg.get("content", "") for msg in conv.messages 
                    if isinstance(msg.get("content"), str)
                ]).lower()
                
                # Check if conversation is relevant to workflow
                if any(step.get("type", "").lower() in conv_text for step in workflow_steps):
                    relevant_conversations.append(conv)
            
            return {
                "workflow_type": workflow_type,
                "relevant_conversations": relevant_conversations,
                "total_conversations": len(conversations),
                "relevance_score": len(relevant_conversations) / len(conversations) if conversations else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze workflow context: {e}")
            return {}
    
    async def _create_workflow_context(
        self,
        workflow_context: Dict[str, Any],
        workflow_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create context data for workflow execution"""
        try:
            relevant_conversations = workflow_context.get("relevant_conversations", [])
            
            # Extract workflow-relevant messages
            workflow_messages = []
            for conv in relevant_conversations:
                for msg in conv.messages:
                    if msg.get("role") in ["user", "assistant"]:
                        workflow_messages.append({
                            "role": msg.get("role"),
                            "content": msg.get("content", ""),
                            "conversation_id": conv.conversation_id,
                            "timestamp": msg.get("timestamp", conv.created_at.isoformat())
                        })
            
            # Create workflow context summary
            context_summary = {
                "workflow_type": workflow_context.get("workflow_type", "general"),
                "relevant_conversations": len(relevant_conversations),
                "total_conversations": workflow_context.get("total_conversations", 0),
                "relevance_score": workflow_context.get("relevance_score", 0),
                "messages_available": len(workflow_messages)
            }
            
            # Create workflow context data
            context_data = {
                "workflow_config": workflow_config,
                "messages": workflow_messages,
                "conversations": [
                    {
                        "id": conv.conversation_id,
                        "title": conv.title,
                        "relevance": "high"  # Could be calculated based on content
                    }
                    for conv in relevant_conversations
                ],
                "summary": context_summary
            }
            
            return {
                "summary": context_summary,
                "data": context_data,
                "conversations": relevant_conversations
            }
            
        except Exception as e:
            logger.error(f"Failed to create workflow context: {e}")
            raise
    
    async def _search_conversations(
        self,
        conversations: List[ChatGPTConversation],
        query: str,
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Search conversations with filters"""
        try:
            results = []
            query_lower = query.lower()
            
            for conv in conversations:
                # Apply filters
                if filters.get("date_from"):
                    date_from = datetime.fromisoformat(filters["date_from"])
                    if conv.created_at < date_from:
                        continue
                
                if filters.get("date_to"):
                    date_to = datetime.fromisoformat(filters["date_to"])
                    if conv.updated_at > date_to:
                        continue
                
                # Search in conversation content
                conv_text = " ".join([
                    msg.get("content", "") for msg in conv.messages 
                    if isinstance(msg.get("content"), str)
                ]).lower()
                
                if query_lower in conv_text:
                    # Calculate relevance score
                    relevance_score = conv_text.count(query_lower) / len(conv_text) if conv_text else 0
                    
                    results.append({
                        "conversation_id": conv.conversation_id,
                        "title": conv.title,
                        "relevance_score": relevance_score,
                        "message_count": len(conv.messages),
                        "created_at": conv.created_at.isoformat(),
                        "updated_at": conv.updated_at.isoformat(),
                        "matched_messages": [
                            {
                                "role": msg.get("role"),
                                "content": msg.get("content", ""),
                                "timestamp": msg.get("timestamp", conv.created_at.isoformat())
                            }
                            for msg in conv.messages
                            if query_lower in msg.get("content", "").lower()
                        ]
                    })
            
            # Sort by relevance score
            results.sort(key=lambda x: x["relevance_score"], reverse=True)
            
            return results[:filters.get("limit", 50)]
            
        except Exception as e:
            logger.error(f"Failed to search conversations: {e}")
            return [] 