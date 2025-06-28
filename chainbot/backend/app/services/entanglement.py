import asyncio
import json
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session
from app.models.entanglement import Entanglement
from app.models.agent import Agent
from app.models.session import Session as DBSession
from app.models.workflow import Workflow
from app.services.audit import log_action
from app.services.websocket_manager import ws_manager
from app.services.agent_spawner import AgentSpawner
from datetime import datetime
import uuid

class Message:
    """Represents a message between agents"""
    def __init__(self, sender_id: int, receiver_id: int, content: str, message_type: str = "text", metadata: Optional[Dict[str, Any]] = None):
        self.id = str(uuid.uuid4())
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.content = content
        self.message_type = message_type
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow()
        self.delivered = False

class EntanglementManager:
    """Manages agent entanglements and communication"""
    
    def __init__(self, db: Session, agent_spawner: AgentSpawner):
        self.db = db
        self.agent_spawner = agent_spawner
        self.entanglements: Dict[int, Dict[str, Any]] = {}
        self.message_queues: Dict[int, List[Message]] = {}
        self.agent_connections: Dict[int, Set[int]] = {}
        
    def create_entanglement(self, name: str, description: str, user_id: int) -> Entanglement:
        """Create a new entanglement"""
        entanglement = Entanglement(
            name=name,
            description=description
        )
        
        self.db.add(entanglement)
        self.db.commit()
        self.db.refresh(entanglement)
        
        # Initialize entanglement data structures
        self.entanglements[entanglement.id] = {
            "name": name,
            "description": description,
            "agents": set(),
            "sessions": set(),
            "workflows": set(),
            "created_at": datetime.utcnow()
        }
        
        self.message_queues[entanglement.id] = []
        self.agent_connections[entanglement.id] = set()
        
        # Log entanglement creation
        log_action(self.db, "entanglement_created", user_id, "entanglement", entanglement.id, 
                  meta={"name": name, "description": description})
        
        return entanglement
    
    def add_agent_to_entanglement(self, entanglement_id: int, agent_id: int, user_id: int) -> bool:
        """Add an agent to an entanglement"""
        entanglement = self.db.query(Entanglement).filter(Entanglement.id == entanglement_id).first()
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        
        if not entanglement or not agent:
            return False
        
        # Update database
        setattr(agent, 'entanglement_id', entanglement_id)
        self.db.commit()
        
        # Update in-memory structures
        if entanglement_id in self.entanglements:
            self.entanglements[entanglement_id]["agents"].add(agent_id)
            self.agent_connections[entanglement_id].add(agent_id)
        
        # Log agent addition
        log_action(self.db, "agent_added_to_entanglement", user_id, "agent", agent_id, 
                  meta={"entanglement_id": entanglement_id, "agent_name": agent.name})
        
        # Broadcast agent addition
        asyncio.create_task(self._broadcast_entanglement_event("agent_added", {
            "entanglement_id": entanglement_id,
            "agent_id": agent_id,
            "agent_name": agent.name
        }))
        
        return True
    
    def remove_agent_from_entanglement(self, entanglement_id: int, agent_id: int, user_id: int) -> bool:
        """Remove an agent from an entanglement"""
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        
        if not agent or getattr(agent, 'entanglement_id') != entanglement_id:
            return False
        
        # Update database
        setattr(agent, 'entanglement_id', None)
        self.db.commit()
        
        # Update in-memory structures
        if entanglement_id in self.entanglements:
            self.entanglements[entanglement_id]["agents"].discard(agent_id)
            self.agent_connections[entanglement_id].discard(agent_id)
        
        # Log agent removal
        log_action(self.db, "agent_removed_from_entanglement", user_id, "agent", agent_id, 
                  meta={"entanglement_id": entanglement_id, "agent_name": agent.name})
        
        # Broadcast agent removal
        asyncio.create_task(self._broadcast_entanglement_event("agent_removed", {
            "entanglement_id": entanglement_id,
            "agent_id": agent_id,
            "agent_name": agent.name
        }))
        
        return True
    
    async def send_message(self, sender_id: int, receiver_id: int, content: str, 
                          message_type: str = "text", metadata: Optional[Dict[str, Any]] = None) -> Message:
        """Send a message between agents in an entanglement"""
        
        # Find the entanglement that contains both agents
        entanglement_id = self._find_entanglement_for_agents(sender_id, receiver_id)
        if not entanglement_id:
            raise ValueError("Agents must be in the same entanglement to communicate")
        
        # Create message
        message = Message(sender_id, receiver_id, content, message_type, metadata)
        
        # Add to message queue
        if entanglement_id in self.message_queues:
            self.message_queues[entanglement_id].append(message)
        
        # Log message
        log_action(self.db, "message_sent", 0, "agent", sender_id, 
                  meta={"receiver_id": receiver_id, "entanglement_id": entanglement_id, "content": content})
        
        # Broadcast message
        await self._broadcast_entanglement_event("message_sent", {
            "entanglement_id": entanglement_id,
            "message": {
                "id": message.id,
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "content": content,
                "message_type": message_type,
                "timestamp": message.timestamp.isoformat()
            }
        })
        
        return message
    
    async def broadcast_message(self, sender_id: int, entanglement_id: int, content: str, 
                              message_type: str = "text", metadata: Optional[Dict[str, Any]] = None) -> List[Message]:
        """Broadcast a message to all agents in an entanglement"""
        
        if entanglement_id not in self.entanglements:
            raise ValueError(f"Entanglement {entanglement_id} not found")
        
        messages = []
        agents = self.entanglements[entanglement_id]["agents"]
        
        for receiver_id in agents:
            if receiver_id != sender_id:  # Don't send to self
                message = await self.send_message(sender_id, receiver_id, content, message_type, metadata)
                messages.append(message)
        
        return messages
    
    def get_messages(self, entanglement_id: int, agent_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get messages for a specific agent in an entanglement"""
        if entanglement_id not in self.message_queues:
            return []
        
        messages = []
        for message in reversed(self.message_queues[entanglement_id]):
            if message.sender_id == agent_id or message.receiver_id == agent_id:
                messages.append({
                    "id": message.id,
                    "sender_id": message.sender_id,
                    "receiver_id": message.receiver_id,
                    "content": message.content,
                    "message_type": message.message_type,
                    "timestamp": message.timestamp.isoformat(),
                    "metadata": message.metadata
                })
                
                if len(messages) >= limit:
                    break
        
        return messages
    
    async def coordinate_agents(self, entanglement_id: int, coordination_task: str, 
                              context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Coordinate multiple agents to work on a task together"""
        
        if entanglement_id not in self.entanglements:
            raise ValueError(f"Entanglement {entanglement_id} not found")
        
        agents = list(self.entanglements[entanglement_id]["agents"])
        if len(agents) < 2:
            raise ValueError("Need at least 2 agents for coordination")
        
        # Broadcast coordination task to all agents
        coordination_message = await self.broadcast_message(
            sender_id=0,  # System sender
            entanglement_id=entanglement_id,
            content=coordination_task,
            message_type="coordination",
            metadata=context
        )
        
        # Execute tasks with each agent
        results = {}
        for agent_id in agents:
            try:
                result = await self.agent_spawner.execute_agent_task(
                    agent_id=agent_id,
                    task=coordination_task,
                    context=context
                )
                results[agent_id] = result
            except Exception as e:
                results[agent_id] = {"error": str(e)}
        
        # Log coordination
        log_action(self.db, "agents_coordinated", 0, "entanglement", entanglement_id, 
                  meta={"task": coordination_task, "agents": agents, "results": results})
        
        return {
            "entanglement_id": entanglement_id,
            "task": coordination_task,
            "agents": agents,
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_entanglement_status(self, entanglement_id: int) -> Optional[Dict[str, Any]]:
        """Get status of an entanglement"""
        if entanglement_id not in self.entanglements:
            return None
        
        entanglement_data = self.entanglements[entanglement_id]
        agents = list(entanglement_data["agents"])
        
        return {
            "entanglement_id": entanglement_id,
            "name": entanglement_data["name"],
            "description": entanglement_data["description"],
            "agents": agents,
            "agent_count": len(agents),
            "message_count": len(self.message_queues.get(entanglement_id, [])),
            "created_at": entanglement_data["created_at"].isoformat()
        }
    
    def list_entanglements(self) -> List[Dict[str, Any]]:
        """List all entanglements"""
        entanglements = []
        for entanglement_id, data in self.entanglements.items():
            status = self.get_entanglement_status(entanglement_id)
            if status:
                entanglements.append(status)
        return entanglements
    
    def _find_entanglement_for_agents(self, agent1_id: int, agent2_id: int) -> Optional[int]:
        """Find the entanglement that contains both agents"""
        for entanglement_id, data in self.entanglements.items():
            if agent1_id in data["agents"] and agent2_id in data["agents"]:
                return entanglement_id
        return None
    
    async def _broadcast_entanglement_event(self, event_type: str, data: Dict[str, Any]):
        """Broadcast entanglement events via WebSocket"""
        try:
            await ws_manager.broadcast({
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception as e:
            # Log WebSocket broadcast errors but don't fail the operation
            print(f"WebSocket broadcast error: {e}")
    
    def cleanup_entanglement(self, entanglement_id: int, user_id: int) -> bool:
        """Clean up an entanglement and remove all associated data"""
        
        if entanglement_id not in self.entanglements:
            return False
        
        # Remove all agents from entanglement
        agents = list(self.entanglements[entanglement_id]["agents"])
        for agent_id in agents:
            self.remove_agent_from_entanglement(entanglement_id, agent_id, user_id)
        
        # Clean up in-memory structures
        if entanglement_id in self.entanglements:
            del self.entanglements[entanglement_id]
        if entanglement_id in self.message_queues:
            del self.message_queues[entanglement_id]
        if entanglement_id in self.agent_connections:
            del self.agent_connections[entanglement_id]
        
        # Log cleanup
        log_action(self.db, "entanglement_cleaned_up", user_id, "entanglement", entanglement_id)
        
        return True 