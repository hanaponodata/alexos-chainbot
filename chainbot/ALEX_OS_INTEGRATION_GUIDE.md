# ChainBot ALEX OS Integration Guide

## Overview

ChainBot is designed to operate as the primary agentic development interface for ALEX OS on Raspberry Pi. This guide covers the complete integration process, from deployment to operation.

## Architecture

### Core Components

1. **ALEX OS Registration Service** - Handles self-registration and health reporting
2. **WebSocket Manager** - Real-time communication for multi-window GUI
3. **Agent Brain** - Unified AI integration (OpenAI + MacLink)
4. **Webhook System** - Event emission and status updates
5. **GUI Windows** - Agent Map, Code Agent, Chat, Watchtower

### Network Configuration

- **Base Port**: 9000 (ChainBot default)
- **ALEX OS Host**: 10.42.69.208:8000
- **WebSocket**: ws://10.42.69.208:8000/ws/events
- **Health Check**: GET http://10.42.69.208:9000/health

## Deployment

### Prerequisites

- Raspberry Pi (3B+ or newer recommended)
- 2GB+ RAM
- 8GB+ storage
- Network connectivity to ALEX OS host

### Quick Deployment

```bash
# Clone ChainBot
git clone https://github.com/your-repo/chainbot.git
cd chainbot

# Run deployment script
sudo ./deploy_alex_os.sh
```

### Manual Deployment

1. **Install Dependencies**
```bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv git curl nginx supervisor ufw
```

2. **Create User**
```bash
sudo useradd -m -s /bin/bash chainbot
sudo usermod -aG sudo chainbot
```

3. **Setup Application**
```bash
sudo mkdir -p /opt/chainbot
sudo cp -r chainbot/* /opt/chainbot/
sudo chown -R chainbot:chainbot /opt/chainbot
```

4. **Install Python Dependencies**
```bash
cd /opt/chainbot
sudo -u chainbot python3 -m venv venv
sudo -u chainbot ./venv/bin/pip install -r requirements.txt
```

5. **Configure Environment**
```bash
sudo -u chainbot cp .env.template .env
sudo -u chainbot nano .env  # Edit with your API keys
```

6. **Start Service**
```bash
sudo systemctl enable chainbot
sudo systemctl start chainbot
```

## Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# MacLink Configuration (optional)
MACLINK_API_KEY=your-maclink-api-key-here

# Security
SECRET_KEY=your-secret-key-here

# ALEX OS Configuration
ALEX_OS_REGISTRY_URL=http://10.42.69.208:8000
ALEX_OS_EVENT_BUS_URL=ws://10.42.69.208:8000/ws/events
ALEX_OS_WEBHOOK_URL=http://your-pi-ip:9000/api/webhooks/chainbot

# Database (optional - defaults to SQLite)
DATABASE_URL=sqlite:///./chainbot.db

# Logging
LOG_LEVEL=INFO
LOG_FILE=chainbot.log
```

### Configuration File (config.yaml)

```yaml
# ChainBot Configuration for ALEX OS Integration
server:
  host: "0.0.0.0"
  port: 9000
  debug: false

alex_os:
  module_registry_url: "http://10.42.69.208:8000"
  event_bus_url: "ws://10.42.69.208:8000/ws/events"
  webhook_url: "http://your-pi-ip:9000/api/webhooks/chainbot"
  health_check_interval: 60
  registration_retry_interval: 30
  max_registration_attempts: 10

chainbot:
  name: "chainbot"
  version: "1.0.0"
  description: "Advanced workflow orchestration engine with AI agent management"
  role: "workflow_orchestrator"
  capabilities:
    - "workflow_engine"
    - "agent_manager"
    - "gui"
    - "websocket"
    - "chatgpt_import"
    - "gpt_integration"
    - "real_time_monitoring"
    - "audit_logging"
    - "multi_agent_coordination"
  ui_features:
    - "Agent Map Window"
    - "Code Agent Window"
    - "Chat Window"
    - "Watchtower Window"
    - "Workflow Builder Window"
    - "Data Importer Window"
  endpoints:
    - "/api/agents/*"
    - "/api/workflows/*"
    - "/api/gpt/*"
    - "/api/chatgpt/*"
    - "/api/audit/*"
    - "/api/websockets/*"
    - "/api/webhooks/chainbot/*"
  health_endpoint: "/health"
  docs_endpoint: "/docs"
```

## ALEX OS Integration

### Registration Process

1. **Self-Registration**
   - ChainBot automatically registers with ALEX OS on startup
   - Sends capabilities, UI features, and endpoint information
   - Retries on failure with exponential backoff

2. **Health Reporting**
   - Emits health status every 60 seconds
   - Reports workflow state, agent status, and system resources
   - Triggers attention alerts for issues

3. **Event Bus Integration**
   - Connects to ALEX OS event bus
   - Publishes workflow and agent events
   - Subscribes to system-wide events

### Webhook Endpoints

ChainBot provides the following webhook endpoints for ALEX OS:

```
POST /api/webhooks/chainbot/workflow/started
POST /api/webhooks/chainbot/workflow/completed
POST /api/webhooks/chainbot/workflow/failed
POST /api/webhooks/chainbot/agent/spawned
POST /api/webhooks/chainbot/agent/terminated
POST /api/webhooks/chainbot/entanglement/created
POST /api/webhooks/chainbot/entanglement/destroyed
POST /api/webhooks/chainbot/health
POST /api/webhooks/chainbot/status
POST /api/webhooks/chainbot/event
```

### Event Payloads

#### Workflow Events
```json
{
  "workflow_id": "uuid",
  "workflow_name": "Sample Workflow",
  "status": "started|completed|failed",
  "user_id": "user-uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "error": "Error message (if failed)",
  "duration": 120,
  "steps_completed": 5,
  "total_steps": 10
}
```

#### Agent Events
```json
{
  "agent_id": "uuid",
  "agent_name": "Sample Agent",
  "agent_type": "assistant",
  "status": "spawned|terminated",
  "user_id": "user-uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "reason": "Termination reason (if applicable)"
}
```

#### Health Reports
```json
{
  "agent_name": "chainbot",
  "agent_version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z",
  "status_id": "healthy|degraded|unhealthy",
  "workflow_state": "running|idle",
  "active_workflows": 2,
  "workflow_blockers": [],
  "log_excerpt": "Recent log entries",
  "requires_attention": false,
  "attention_reason": null,
  "gpt_integration_status": "healthy",
  "websocket_connections": 5,
  "active_agents": 3,
  "system_resources": {
    "cpu_usage": 25.5,
    "memory_usage": 45.2,
    "disk_usage": 30.1,
    "network_usage": 1.2
  }
}
```

## GUI Windows

### Agent Map Window

Real-time graph visualization of all agents, their relationships, and status.

**Features:**
- Drag-and-drop agent nodes
- Real-time status updates
- Interactive agent actions (spawn, kill, restart)
- Zoom and pan controls
- Layout management

**WebSocket Events:**
```json
{
  "type": "agent_map_update",
  "data": {
    "agents": [
      {
        "id": "uuid",
        "name": "Agent Name",
        "type": "assistant",
        "status": "running|idle|error",
        "position": {"x": 100, "y": 200},
        "connections": ["agent-uuid-1", "agent-uuid-2"]
      }
    ]
  }
}
```

### Code Agent Window

Modern code editor with AI assistance and version control.

**Features:**
- Monaco/VSCode-style editor
- Git integration (commit, rollback)
- AI code suggestions
- Real-time collaboration
- Syntax highlighting

### Chat Window

Multi-agent chat interface with context and commands.

**Features:**
- Multi-agent conversations
- Markdown rendering
- Slash commands
- Context recall
- File attachments

### Watchtower Window

Live monitoring and alerting dashboard.

**Features:**
- Real-time log feed
- System health metrics
- Event inspector
- Forensic audit trail
- Alert management

## Operation

### Startup Sequence

1. **Service Initialization**
   ```bash
   sudo systemctl start chainbot
   ```

2. **Registration with ALEX OS**
   - ChainBot registers automatically
   - Validates connectivity
   - Syncs agent index

3. **Health Check Verification**
   ```bash
   curl http://localhost:9000/health
   ```

4. **GUI Loading**
   - All windows load with live data
   - WebSocket connections established
   - Real-time updates begin

### Monitoring

#### Health Checks
```bash
# Manual health check
sudo /opt/chainbot/health_check.sh

# Service status
sudo systemctl status chainbot

# Monitor script
sudo /opt/chainbot/monitor.sh
```

#### Logs
```bash
# Service logs
sudo journalctl -u chainbot -f

# Application logs
tail -f /opt/chainbot/chainbot.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

#### Metrics
```bash
# Health endpoint
curl http://localhost:9000/health | jq

# Configuration
curl http://localhost:9000/config | jq

# WebSocket stats
curl http://localhost:9000/api/websockets/stats | jq
```

### Troubleshooting

#### Common Issues

1. **Registration Failed**
   ```bash
   # Check ALEX OS connectivity
   curl http://10.42.69.208:8000
   
   # Check service logs
   sudo journalctl -u chainbot -n 50
   ```

2. **WebSocket Connection Issues**
   ```bash
   # Check WebSocket endpoint
   curl -I http://localhost:9000/ws
   
   # Check nginx configuration
   sudo nginx -t
   ```

3. **GPT Integration Problems**
   ```bash
   # Check API key
   echo $OPENAI_API_KEY
   
   # Test GPT endpoint
   curl http://localhost:9000/api/gpt/health
   ```

4. **GUI Not Loading**
   ```bash
   # Check static files
   ls -la /opt/chainbot/gui/dist/
   
   # Check nginx configuration
   sudo cat /etc/nginx/sites-enabled/chainbot
   ```

#### Recovery Procedures

1. **Service Restart**
   ```bash
   sudo systemctl restart chainbot
   sudo systemctl restart nginx
   ```

2. **Configuration Reset**
   ```bash
   sudo cp /opt/chainbot/.env.template /opt/chainbot/.env
   sudo systemctl restart chainbot
   ```

3. **Database Reset**
   ```bash
   sudo -u chainbot rm /opt/chainbot/chainbot.db
   sudo systemctl restart chainbot
   ```

## Security

### Network Security

1. **Firewall Configuration**
   ```bash
   sudo ufw allow 9000
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. **SSL/TLS Setup**
   ```bash
   # Install certbot
   sudo apt-get install certbot python3-certbot-nginx
   
   # Get certificate
   sudo certbot --nginx -d your-domain.com
   ```

### Access Control

1. **API Authentication**
   - JWT-based authentication
   - Role-based access control
   - Rate limiting

2. **Environment Security**
   - Secure API key storage
   - Non-root service execution
   - File permission restrictions

## Performance

### Optimization

1. **Resource Limits**
   ```bash
   # Systemd service limits
   LimitNOFILE=65536
   LimitNPROC=4096
   ```

2. **Database Optimization**
   - Connection pooling
   - Query optimization
   - Index management

3. **Memory Management**
   - Garbage collection tuning
   - Memory leak monitoring
   - Resource cleanup

### Scaling

1. **Horizontal Scaling**
   - Load balancer configuration
   - Session management
   - Database clustering

2. **Vertical Scaling**
   - Resource allocation
   - Performance monitoring
   - Capacity planning

## Development

### Local Development

1. **Setup Development Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run Development Server**
   ```bash
   python -m app.main
   ```

3. **Run Tests**
   ```bash
   pytest tests/
   ```

### API Development

1. **API Documentation**
   - Available at http://localhost:9000/docs
   - Interactive Swagger UI
   - Request/response examples

2. **WebSocket Testing**
   ```bash
   # Test WebSocket connection
   wscat -c ws://localhost:9000/ws
   ```

## Support

### Documentation

- [API Reference](http://localhost:9000/docs)
- [Configuration Guide](./CONFIGURATION.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Monitoring

- Health endpoint: `GET /health`
- Metrics endpoint: `GET /metrics`
- Status endpoint: `GET /status`

### Logs

- Service logs: `journalctl -u chainbot`
- Application logs: `/opt/chainbot/chainbot.log`
- Nginx logs: `/var/log/nginx/`

### Contact

For issues and support:
1. Check the logs and health endpoints
2. Review this documentation
3. Create an issue in the repository
4. Contact the development team

---

**ChainBot ALEX OS Integration Guide**  
Version: 1.0.0  
Last Updated: 2024-01-01 