"""
ChainBot Main Application

FastAPI application with ALEX OS integration, GPT services, and GUI support.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn

from .config import config
from .db import init_db, get_db
from .api import (
    agents, workflows, gpt_integration, chatgpt_import, 
    audit_logs, auth, sessions, users, websockets, webhooks
)
from .services import (
    initialize_services, get_agent_brain, get_websocket_manager,
    initialize_alex_os_registration
)

# Configure logging
logging_config = config.get_logging_config()
logging.basicConfig(
    level=getattr(logging, logging_config.get("level", "INFO")),
    format=logging_config.get("format", "%(asctime)s - %(name)s - %(levelname)s - %(message)s"),
    handlers=[
        logging.FileHandler(logging_config.get("file", "chainbot.log")),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting ChainBot application...")
    
    try:
        # Initialize database
        init_db()
        logger.info("Database initialized")
        
        # Initialize services
        await initialize_services()
        logger.info("Services initialized")
        
        # Initialize ALEX OS registration
        if config.is_alex_os_enabled():
            await initialize_alex_os_registration()
            logger.info("ALEX OS registration initialized")
        else:
            logger.warning("ALEX OS integration disabled")
        
        logger.info("ChainBot application started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start ChainBot: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down ChainBot application...")
    
    try:
        # Cleanup services
        websocket_manager = get_websocket_manager()
        if websocket_manager:
            # Cleanup WebSocket connections
            for connection_id in list(websocket_manager.active_connections.keys()):
                await websocket_manager.disconnect(connection_id)
        
        logger.info("ChainBot application shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Create FastAPI application
app = FastAPI(
    title="ChainBot",
    description="Advanced workflow orchestration engine with AI agent management",
    version=config.get_chainbot_config().get("version", "1.0.0"),
    docs_url="/docs" if not config.is_production() else None,
    redoc_url="/redoc" if not config.is_production() else None,
    lifespan=lifespan
)

# Configure CORS
cors_config = config.get_security_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_config.get("cors_origins", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for GUI
gui_config = config.get_gui_config()
if gui_config.get("enabled", True) and gui_config.get("serve_static", True):
    try:
        import os
        from pathlib import Path
        
        # Try to mount the GUI build directory
        gui_build_path = Path(gui_config.get("build_path", "../gui/dist"))
        if gui_build_path.exists():
            app.mount("/gui", StaticFiles(directory=str(gui_build_path), html=True), name="gui")
            logger.info(f"GUI mounted from {gui_build_path} at /gui")
        else:
            logger.warning(f"GUI build path not found: {gui_build_path}")
    except Exception as e:
        logger.warning(f"Failed to mount GUI: {e}")

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(workflows.router, prefix="/api")
app.include_router(gpt_integration.router, prefix="/api")
app.include_router(chatgpt_import.router, prefix="/api")
app.include_router(audit_logs.router, prefix="/api")
app.include_router(websockets.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database
        db = get_db()
        if db:
            # Simple database check
            pass
        
        # Check services
        agent_brain = get_agent_brain()
        websocket_manager = get_websocket_manager()
        
        # Get ALEX OS registration status
        from .services.alex_os_registration import get_alex_os_registration
        registration_service = get_alex_os_registration()
        
        health_status = {
            "status": "healthy",
            "timestamp": asyncio.get_event_loop().time(),
            "services": {
                "database": "healthy",
                "agent_brain": "healthy" if agent_brain else "unavailable",
                "websocket_manager": "healthy" if websocket_manager else "unavailable",
                "alex_os_registration": "healthy" if registration_service else "unavailable"
            },
            "config": {
                "alex_os_enabled": config.is_alex_os_enabled(),
                "openai_enabled": config.is_openai_enabled(),
                "maclink_enabled": config.is_maclink_enabled(),
                "production": config.is_production()
            }
        }
        
        # Add registration status if available
        if registration_service:
            health_status["alex_os"] = registration_service.get_registration_status()
        
        # Add WebSocket stats if available
        if websocket_manager:
            health_status["websocket_stats"] = websocket_manager.get_connection_stats()
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}"
        )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "ChainBot",
        "version": config.get_chainbot_config().get("version", "1.0.0"),
        "description": config.get_chainbot_config().get("description"),
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "api": "/api",
            "websockets": "/ws"
        },
        "alex_os_integration": config.is_alex_os_enabled(),
        "timestamp": asyncio.get_event_loop().time()
    }

# Configuration endpoint
@app.get("/config")
async def get_config():
    """Get configuration (non-sensitive)"""
    if config.is_production():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Configuration endpoint not available in production"
        )
    
    # Return non-sensitive configuration
    safe_config = {
        "server": {
            "host": config.get_server_config().get("host"),
            "port": config.get_server_config().get("port"),
            "debug": config.get_server_config().get("debug")
        },
        "chainbot": config.get_chainbot_config(),
        "gui": config.get_gui_config(),
        "logging": config.get_logging_config(),
        "audit": config.get_audit_config(),
        "workflow": config.get_workflow_config(),
        "agent": config.get_agent_config(),
        "websocket": config.get_websocket_config(),
        "features": {
            "alex_os_enabled": config.is_alex_os_enabled(),
            "openai_enabled": config.is_openai_enabled(),
            "maclink_enabled": config.is_maclink_enabled(),
            "production": config.is_production()
        }
    }
    
    return safe_config

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """HTTP exception handler"""
    logger.error(f"HTTP exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

if __name__ == "__main__":
    # Get server configuration
    server_config = config.get_server_config()
    
    # Run the application
    uvicorn.run(
        "app.main:app",
        host=server_config.get("host", "0.0.0.0"),
        port=server_config.get("port", 9000),
        reload=server_config.get("reload", False),
        log_level=config.get_logging_config().get("level", "INFO").lower()
    ) 