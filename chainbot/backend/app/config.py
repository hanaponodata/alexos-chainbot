"""
Configuration management for ChainBot backend
"""

import os
import yaml
from typing import Dict, Any, Optional
from pathlib import Path

class Config:
    """Configuration manager for ChainBot"""
    
    def __init__(self):
        self._config = {}
        self._load_config()
    
    def _load_config(self):
        """Load configuration from environment and config files"""
        # Default configuration
        self._config = {
            # Server configuration
            "server": {
                "host": "0.0.0.0",  # Bind to all interfaces for Pi deployment
                "port": 9000,  # ChainBot base port
                "debug": False,
                "reload": False
            },
            
            # Database configuration
            "database": {
                "url": os.getenv("DATABASE_URL", "sqlite:///./chainbot.db"),
                "echo": False
            },
            
            # ALEX OS Integration
            "alex_os": {
                "module_registry_url": os.getenv("ALEX_OS_REGISTRY_URL", "http://10.42.69.208:8000"),
                "event_bus_url": os.getenv("ALEX_OS_EVENT_BUS_URL", "ws://10.42.69.208:8000/ws/events"),
                "webhook_url": os.getenv("ALEX_OS_WEBHOOK_URL", "http://10.42.69.208:9000/api/webhooks/chainbot"),
                "health_check_interval": int(os.getenv("ALEX_OS_HEALTH_INTERVAL", "60")),
                "registration_retry_interval": int(os.getenv("ALEX_OS_REGISTRATION_RETRY", "30")),
                "max_registration_attempts": int(os.getenv("ALEX_OS_MAX_REGISTRATION_ATTEMPTS", "10"))
            },
            
            # ChainBot Module Info
            "chainbot": {
                "name": "chainbot",
                "version": "1.0.0",
                "description": "Advanced workflow orchestration engine with AI agent management",
                "role": "workflow_orchestrator",
                "capabilities": [
                    "workflow_engine",
                    "agent_manager", 
                    "gui",
                    "websocket",
                    "chatgpt_import",
                    "gpt_integration",
                    "real_time_monitoring",
                    "audit_logging",
                    "multi_agent_coordination"
                ],
                "ui_features": [
                    "Agent Map Window",
                    "Code Agent Window", 
                    "Chat Window",
                    "Watchtower Window",
                    "Workflow Builder Window",
                    "Data Importer Window"
                ],
                "endpoints": [
                    "/api/agents/*",
                    "/api/workflows/*", 
                    "/api/gpt/*",
                    "/api/chatgpt/*",
                    "/api/audit/*",
                    "/api/websockets/*",
                    "/api/webhooks/chainbot/*"
                ],
                "health_endpoint": "/health",
                "docs_endpoint": "/docs"
            },
            
            # OpenAI Configuration
            "openai": {
                "api_key": os.getenv("OPENAI_API_KEY"),
                "base_url": os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
                "model": os.getenv("OPENAI_MODEL", "gpt-4"),
                "max_tokens": int(os.getenv("OPENAI_MAX_TOKENS", "4000")),
                "temperature": float(os.getenv("OPENAI_TEMPERATURE", "0.7")),
                "timeout": int(os.getenv("OPENAI_TIMEOUT", "30"))
            },
            
            # MacLink Configuration
            "maclink": {
                "base_url": os.getenv("MACLINK_BASE_URL", "http://localhost:8080"),
                "api_key": os.getenv("MACLINK_API_KEY"),
                "timeout": int(os.getenv("MACLINK_TIMEOUT", "30")),
                "enabled": os.getenv("MACLINK_ENABLED", "true").lower() == "true"
            },
            
            # WebSocket Configuration
            "websocket": {
                "max_connections": int(os.getenv("WS_MAX_CONNECTIONS", "100")),
                "heartbeat_interval": int(os.getenv("WS_HEARTBEAT_INTERVAL", "30")),
                "connection_timeout": int(os.getenv("WS_CONNECTION_TIMEOUT", "300")),
                "message_size_limit": int(os.getenv("WS_MESSAGE_SIZE_LIMIT", "1048576"))  # 1MB
            },
            
            # Security Configuration
            "security": {
                "secret_key": os.getenv("SECRET_KEY", "your-secret-key-change-in-production"),
                "algorithm": "HS256",
                "access_token_expire_minutes": int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")),
                "cors_origins": os.getenv("CORS_ORIGINS", "*").split(","),
                "rate_limit_requests": int(os.getenv("RATE_LIMIT_REQUESTS", "100")),
                "rate_limit_window": int(os.getenv("RATE_LIMIT_WINDOW", "60"))
            },
            
            # Logging Configuration
            "logging": {
                "level": os.getenv("LOG_LEVEL", "INFO"),
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "file": os.getenv("LOG_FILE", "chainbot.log"),
                "max_size": int(os.getenv("LOG_MAX_SIZE", "10485760")),  # 10MB
                "backup_count": int(os.getenv("LOG_BACKUP_COUNT", "5"))
            },
            
            # Audit Configuration
            "audit": {
                "enabled": os.getenv("AUDIT_ENABLED", "true").lower() == "true",
                "log_all_actions": os.getenv("AUDIT_LOG_ALL_ACTIONS", "true").lower() == "true",
                "retention_days": int(os.getenv("AUDIT_RETENTION_DAYS", "90")),
                "export_format": os.getenv("AUDIT_EXPORT_FORMAT", "json")
            },
            
            # Workflow Configuration
            "workflow": {
                "max_concurrent_workflows": int(os.getenv("MAX_CONCURRENT_WORKFLOWS", "10")),
                "workflow_timeout": int(os.getenv("WORKFLOW_TIMEOUT", "3600")),  # 1 hour
                "auto_retry_failed": os.getenv("AUTO_RETRY_FAILED", "true").lower() == "true",
                "max_retry_attempts": int(os.getenv("MAX_RETRY_ATTEMPTS", "3"))
            },
            
            # Agent Configuration
            "agent": {
                "max_concurrent_agents": int(os.getenv("MAX_CONCURRENT_AGENTS", "20")),
                "agent_timeout": int(os.getenv("AGENT_TIMEOUT", "300")),  # 5 minutes
                "default_agent_type": os.getenv("DEFAULT_AGENT_TYPE", "general_assistant"),
                "agent_heartbeat_interval": int(os.getenv("AGENT_HEARTBEAT_INTERVAL", "30"))
            },
            
            # GUI Configuration
            "gui": {
                "enabled": os.getenv("GUI_ENABLED", "true").lower() == "true",
                "port": int(os.getenv("GUI_PORT", "3000")),
                "host": os.getenv("GUI_HOST", "0.0.0.0"),
                "build_path": os.getenv("GUI_BUILD_PATH", "../gui/dist"),
                "serve_static": os.getenv("GUI_SERVE_STATIC", "true").lower() == "true"
            }
        }
        
        # Load from config file if exists
        config_file = Path("config.yaml")
        if config_file.exists():
            with open(config_file, 'r') as f:
                file_config = yaml.safe_load(f)
                self._merge_config(file_config)
        
        # Override with environment variables
        self._load_from_env()
    
    def _merge_config(self, config: Dict[str, Any]):
        """Merge configuration from file"""
        for key, value in config.items():
            if isinstance(value, dict) and key in self._config:
                self._config[key].update(value)
            else:
                self._config[key] = value
    
    def _load_from_env(self):
        """Load configuration from environment variables"""
        # Server config
        if os.getenv("HOST"):
            self._config["server"]["host"] = os.getenv("HOST")
        if os.getenv("PORT"):
            port = os.getenv("PORT")
            if port:
                self._config["server"]["port"] = int(port)
        if os.getenv("DEBUG"):
            debug = os.getenv("DEBUG")
            if debug:
                self._config["server"]["debug"] = debug.lower() == "true"
        
        # Database config
        if os.getenv("DATABASE_URL"):
            self._config["database"]["url"] = os.getenv("DATABASE_URL")
        
        # OpenAI config
        if os.getenv("OPENAI_API_KEY"):
            self._config["openai"]["api_key"] = os.getenv("OPENAI_API_KEY")
        if os.getenv("OPENAI_MODEL"):
            self._config["openai"]["model"] = os.getenv("OPENAI_MODEL")
        
        # MacLink config
        if os.getenv("MACLINK_BASE_URL"):
            self._config["maclink"]["base_url"] = os.getenv("MACLINK_BASE_URL")
        if os.getenv("MACLINK_API_KEY"):
            self._config["maclink"]["api_key"] = os.getenv("MACLINK_API_KEY")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value by dot notation key"""
        keys = key.split('.')
        value = self._config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any):
        """Set configuration value by dot notation key"""
        keys = key.split('.')
        config = self._config
        
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        
        config[keys[-1]] = value
    
    def get_all(self) -> Dict[str, Any]:
        """Get all configuration"""
        return self._config.copy()
    
    def get_alex_os_config(self) -> Dict[str, Any]:
        """Get ALEX OS specific configuration"""
        return self._config.get("alex_os", {})
    
    def get_chainbot_config(self) -> Dict[str, Any]:
        """Get ChainBot specific configuration"""
        return self._config.get("chainbot", {})
    
    def get_server_config(self) -> Dict[str, Any]:
        """Get server configuration"""
        return self._config.get("server", {})
    
    def get_database_config(self) -> Dict[str, Any]:
        """Get database configuration"""
        return self._config.get("database", {})
    
    def get_openai_config(self) -> Dict[str, Any]:
        """Get OpenAI configuration"""
        return self._config.get("openai", {})
    
    def get_maclink_config(self) -> Dict[str, Any]:
        """Get MacLink configuration"""
        return self._config.get("maclink", {})
    
    def get_websocket_config(self) -> Dict[str, Any]:
        """Get WebSocket configuration"""
        return self._config.get("websocket", {})
    
    def get_security_config(self) -> Dict[str, Any]:
        """Get security configuration"""
        return self._config.get("security", {})
    
    def get_logging_config(self) -> Dict[str, Any]:
        """Get logging configuration"""
        return self._config.get("logging", {})
    
    def get_audit_config(self) -> Dict[str, Any]:
        """Get audit configuration"""
        return self._config.get("audit", {})
    
    def get_workflow_config(self) -> Dict[str, Any]:
        """Get workflow configuration"""
        return self._config.get("workflow", {})
    
    def get_agent_config(self) -> Dict[str, Any]:
        """Get agent configuration"""
        return self._config.get("agent", {})
    
    def get_gui_config(self) -> Dict[str, Any]:
        """Get GUI configuration"""
        return self._config.get("gui", {})
    
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return not self.get("server.debug", True)
    
    def is_alex_os_enabled(self) -> bool:
        """Check if ALEX OS integration is enabled"""
        return bool(self.get("alex_os.module_registry_url"))
    
    def is_openai_enabled(self) -> bool:
        """Check if OpenAI integration is enabled"""
        return bool(self.get("openai.api_key"))
    
    def is_maclink_enabled(self) -> bool:
        """Check if MacLink integration is enabled"""
        return self.get("maclink.enabled", False)

# Global configuration instance
config = Config() 