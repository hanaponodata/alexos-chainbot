"""
ChainBot Configuration Management
Handles loading and validation of configuration files
"""

import os
import yaml
import json
from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, validator
from pydantic_settings import BaseSettings


class DatabaseConfig(BaseModel):
    """Database configuration"""
    url: str = Field(..., description="Database connection URL")
    pool_size: int = Field(10, ge=1, le=100, description="Connection pool size")
    max_overflow: int = Field(20, ge=0, le=100, description="Maximum overflow connections")
    pool_timeout: int = Field(30, ge=1, le=300, description="Connection pool timeout in seconds")
    pool_recycle: int = Field(3600, ge=300, le=7200, description="Connection pool recycle time in seconds")
    echo: bool = Field(False, description="SQL echo mode")


class APIConfig(BaseModel):
    """API configuration"""
    host: str = Field("127.0.0.1", description="API host address")
    port: int = Field(8000, ge=1, le=65535, description="API port number")
    debug: bool = Field(False, description="API debug mode")
    workers: int = Field(1, ge=1, le=16, description="Number of worker processes")
    timeout: int = Field(30, ge=1, le=300, description="Request timeout in seconds")
    cors_origins: list = Field(["http://localhost:3000"], description="CORS allowed origins")


class SecurityConfig(BaseModel):
    """Security configuration"""
    secret_key: str = Field(..., min_length=32, description="Secret key for JWT tokens")
    algorithm: str = Field("HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(30, ge=1, le=1440, description="Access token expiration time in minutes")
    refresh_token_expire_days: int = Field(7, ge=1, le=365, description="Refresh token expiration time in days")
    password_min_length: int = Field(8, ge=6, le=128, description="Minimum password length")
    bcrypt_rounds: int = Field(12, ge=10, le=16, description="BCrypt rounds")


class LoggingConfig(BaseModel):
    """Logging configuration"""
    level: str = Field("INFO", description="Logging level")
    file: str = Field("/var/log/alex_os/chainbot.log", description="Log file path")
    format: str = Field("%(asctime)s - %(name)s - %(levelname)s - %(message)s", description="Log format string")
    max_size: int = Field(10485760, ge=1048576, description="Maximum log file size in bytes")
    backup_count: int = Field(5, ge=0, le=100, description="Number of backup log files")
    console: bool = Field(True, description="Enable console logging")


class ALEXOSConfig(BaseModel):
    """ALEX OS integration configuration"""
    event_bus_url: str = Field(..., description="ALEX OS event bus URL")
    webhook_url: str = Field(..., description="ALEX OS webhook URL")
    health_check_interval: int = Field(30, ge=5, le=300, description="Health check interval in seconds")
    metrics_enabled: bool = Field(True, description="Enable metrics collection")
# Resolved: Using production value
    module_registry_url: str = Field("http://10.42.69.208:8000/api/modules", description="Module registry URL")
# http://10.42.69.208:8000/api/modules
    module_registry_url: str = Field("http://10.42.69.208:8000/api/modules", description="Module registry URL")
# End resolution
    integration_timeout: int = Field(60, ge=10, le=300, description="Integration timeout in seconds")


class WorkflowEngineConfig(BaseModel):
    """Workflow engine configuration"""
    max_concurrent_workflows: int = Field(10, ge=1, le=100, description="Maximum concurrent workflows")
    max_workflow_duration: int = Field(3600, ge=60, le=86400, description="Maximum workflow duration in seconds")
    retry_attempts: int = Field(3, ge=0, le=10, description="Number of retry attempts")
    retry_delay: int = Field(5, ge=1, le=300, description="Retry delay in seconds")
    workflow_timeout: int = Field(1800, ge=60, le=3600, description="Workflow timeout in seconds")
    cleanup_interval: int = Field(300, ge=60, le=3600, description="Cleanup interval in seconds")
    max_workflow_history: int = Field(1000, ge=100, le=10000, description="Maximum workflow history entries")


class AgentManagementConfig(BaseModel):
    """Agent management configuration"""
    max_agents: int = Field(50, ge=1, le=1000, description="Maximum number of agents")
    agent_timeout: int = Field(300, ge=30, le=1800, description="Agent timeout in seconds")
    spawn_interval: int = Field(5, ge=1, le=60, description="Agent spawn interval in seconds")
    max_agent_memory: int = Field(512, ge=64, le=4096, description="Maximum agent memory in MB")
    agent_heartbeat_interval: int = Field(30, ge=5, le=300, description="Agent heartbeat interval in seconds")
    agent_cleanup_interval: int = Field(600, ge=60, le=3600, description="Agent cleanup interval in seconds")


class RaspberryPiConfig(BaseModel):
    """Raspberry Pi specific configuration"""
    hardware_monitoring: bool = Field(True, description="Enable Raspberry Pi hardware monitoring")
    temperature_threshold: int = Field(70, ge=50, le=100, description="Temperature threshold in Celsius")
    cpu_frequency_monitoring: bool = Field(True, description="Enable CPU frequency monitoring")
    memory_monitoring: bool = Field(True, description="Enable memory monitoring")
    disk_monitoring: bool = Field(True, description="Enable disk monitoring")
    network_monitoring: bool = Field(True, description="Enable network monitoring")
    gpio_monitoring: bool = Field(False, description="Enable GPIO monitoring")


class Config(BaseSettings):
    """Main configuration class"""
    # Module information
    module_name: str = Field("chainbot", description="Module name")
    module_version: str = Field("1.0.0", description="Module version")
    module_description: str = Field("Advanced workflow orchestration engine with AI agent management", description="Module description")
    
    # Configuration sections
    database: DatabaseConfig
    api: APIConfig
    security: SecurityConfig
    logging: LoggingConfig
    alex_os: ALEXOSConfig
    workflow_engine: WorkflowEngineConfig
    agent_management: AgentManagementConfig
    raspberry_pi: RaspberryPiConfig
    
    # Environment variable prefix
    class Config:
        env_prefix = "ALEX_OS_CHAINBOT_"
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    @validator("security")
    def validate_secret_key(cls, v):
        """Validate secret key is not default"""
        if v.secret_key == "your-secret-key-here-change-in-production":
            raise ValueError("Please change the default secret key in production")
        return v


# Global configuration instance
_config: Optional[Config] = None


def load_config(config_file: Optional[Path] = None) -> Dict[str, Any]:
    """
    Load configuration from file and environment variables
    
    Args:
        config_file: Path to configuration file (YAML/JSON)
        
    Returns:
        Configuration dictionary
    """
    global _config
    
    # Load from file if provided
    config_data = {}
    if config_file and config_file.exists():
        if config_file.suffix.lower() in ['.yaml', '.yml']:
            with open(config_file, 'r') as f:
                config_data = yaml.safe_load(f)
        elif config_file.suffix.lower() == '.json':
            with open(config_file, 'r') as f:
                config_data = json.load(f)
    
    # Load default configuration
    default_config_path = Path(__file__).parent / "default.yaml"
    if default_config_path.exists():
        with open(default_config_path, 'r') as f:
            default_config = yaml.safe_load(f)
            # Merge with file config
            config_data = {**default_config, **config_data}
    
    # Create configuration instance
    try:
        _config = Config(**config_data)
        return _config.dict()
    except Exception as e:
        raise ValueError(f"Invalid configuration: {e}")


def get_config() -> Config:
    """
    Get the current configuration instance
    
    Returns:
        Configuration instance
    """
    if _config is None:
        load_config()
    return _config


def get_database_url() -> str:
    """Get database URL from environment or config"""
    return os.getenv("ALEX_OS_CHAINBOT_DATABASE_URL") or get_config().database.url


def get_secret_key() -> str:
    """Get secret key from environment or config"""
    return os.getenv("ALEX_OS_CHAINBOT_SECRET_KEY") or get_config().security.secret_key


def get_api_host() -> str:
    """Get API host from environment or config"""
    return os.getenv("ALEX_OS_CHAINBOT_HOST") or get_config().api.host


def get_api_port() -> int:
    """Get API port from environment or config"""
    port = os.getenv("ALEX_OS_CHAINBOT_PORT")
    return int(port) if port else get_config().api.port
