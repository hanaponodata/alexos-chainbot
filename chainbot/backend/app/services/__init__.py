"""
Services initialization for ChainBot

Initializes and manages all service instances including:
- Agent Brain (GPT integration)
- OpenAI Client
- MacLink Client
- WebSocket Manager
- ALEX OS Registration
- Other business logic services
"""

import logging
from typing import Optional

from .agent_brain import AgentBrain
from .openai_client import OpenAIClient, OpenAIKeyManager
from .maclink_client import MacLinkClient, MacLinkManager
from .websocket_manager import WebSocketManager
from .alex_os_registration import initialize_alex_os_registration
from ..config import config

logger = logging.getLogger(__name__)

# Global service instances
agent_brain: Optional[AgentBrain] = None
openai_client: Optional[OpenAIClient] = None
maclink_client: Optional[MacLinkClient] = None
openai_key_manager: Optional[OpenAIKeyManager] = None
maclink_manager: Optional[MacLinkManager] = None
websocket_manager: Optional[WebSocketManager] = None

async def initialize_services():
    """Initialize all services"""
    global agent_brain, openai_client, maclink_client, openai_key_manager, maclink_manager, websocket_manager
    
    logger.info("Initializing ChainBot services...")
    
    # Initialize WebSocket manager
    websocket_manager = WebSocketManager()
    logger.info("WebSocket manager initialized")
    
    # Initialize key managers
    openai_key_manager = OpenAIKeyManager()
    maclink_manager = MacLinkManager()
    
    # Initialize agent brain
    agent_brain = AgentBrain()
    
    # Get configuration
    openai_config = config.get_openai_config()
    maclink_config = config.get_maclink_config()
    
    # Initialize OpenAI client if enabled
    if config.is_openai_enabled():
        api_key = openai_config.get("api_key")
        
        if api_key:
            try:
                openai_client = OpenAIClient(api_key)
                await openai_client.initialize()
                logger.info("OpenAI client initialized successfully")
                
                # Add to key manager
                openai_key_manager.add_key("default", api_key)
                
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
        else:
            logger.warning("OpenAI enabled but no API key provided")
    
    # Initialize MacLink client if enabled
    if config.is_maclink_enabled():
        base_url = maclink_config.get("base_url")
        api_key = maclink_config.get("api_key")
        
        if base_url:
            try:
                maclink_client = MacLinkClient(base_url, api_key)
                await maclink_client.initialize()
                logger.info("MacLink client initialized successfully")
                
                # Add to connection manager
                maclink_manager.add_connection("default", base_url, api_key)
                
            except Exception as e:
                logger.error(f"Failed to initialize MacLink client: {e}")
        else:
            logger.warning("MacLink enabled but no URL provided")
    
    # Initialize agent brain with clients
    try:
        openai_api_key = openai_config.get("api_key") if openai_client else None
        maclink_url = maclink_config.get("base_url") if maclink_client else None
        
        await agent_brain.initialize(openai_api_key, maclink_url)
        logger.info("Agent brain initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize agent brain: {e}")
    
    logger.info("Service initialization complete")

async def cleanup_services():
    """Clean up all services"""
    global agent_brain, openai_client, maclink_client, websocket_manager
    
    logger.info("Cleaning up ChainBot services...")
    
    if agent_brain:
        await agent_brain.cleanup()
    
    if openai_client:
        await openai_client.cleanup()
    
    if maclink_client:
        await maclink_client.cleanup()
    
    logger.info("Service cleanup complete")

def get_agent_brain() -> Optional[AgentBrain]:
    """Get the agent brain instance"""
    return agent_brain

def get_openai_client() -> Optional[OpenAIClient]:
    """Get the OpenAI client instance"""
    return openai_client

def get_maclink_client() -> Optional[MacLinkClient]:
    """Get the MacLink client instance"""
    return maclink_client

def get_openai_key_manager() -> Optional[OpenAIKeyManager]:
    """Get the OpenAI key manager instance"""
    return openai_key_manager

def get_maclink_manager() -> Optional[MacLinkManager]:
    """Get the MacLink manager instance"""
    return maclink_manager

def get_websocket_manager() -> Optional[WebSocketManager]:
    """Get the WebSocket manager instance"""
    return websocket_manager 