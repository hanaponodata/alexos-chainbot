# ChainBot Port Configuration

## Overview

ChainBot ALEX OS module uses a dedicated port range to avoid conflicts with other services.

## Port Range

- **Base Port**: 9000
- **Port Range**: 9000-9099
- **Default API Port**: 9000

## Configuration

### Environment Variables

```bash
# Set the API port (default: 9000)
API_PORT=9000
```

### Configuration File

In `config/default.yaml`:

```yaml
api:
  host: 127.0.0.1
  port: 9000  # ChainBot's default port
  debug: false
  workers: 1
  timeout: 30
```

### Server Startup

```bash
# Start with default port (9000)
python3 -m uvicorn app.main:app --reload

# Start with specific port
python3 -m uvicorn app.main:app --reload --port 9000

# Start with different port in range
python3 -m uvicorn app.main:app --reload --port 9001
```

## API Endpoints

With default configuration, ChainBot API endpoints are available at:

- **API Documentation**: http://localhost:9000/docs
- **Health Check**: http://localhost:9000/health
- **GPT Integration**: http://localhost:9000/api/gpt/*
- **Workflow API**: http://localhost:9000/api/workflows/*
- **Agent API**: http://localhost:9000/api/agents/*

## Port Conflicts

If port 9000 is already in use, you can:

1. **Use a different port in the range**:
   ```bash
   python3 -m uvicorn app.main:app --reload --port 9001
   ```

2. **Update environment variable**:
   ```bash
   export API_PORT=9001
   python3 -m uvicorn app.main:app --reload
   ```

3. **Update configuration file**:
   ```yaml
   api:
     port: 9001
   ```

## Integration with ALEX OS

When deployed as part of ALEX OS:

- ChainBot registers on port 9000 by default
- Other ALEX OS modules use different port ranges
- Load balancer routes requests to appropriate modules
- Health checks monitor port availability

## Development vs Production

### Development
- Uses port 9000 by default
- Can be changed via command line or environment
- Hot reload enabled

### Production
- Uses port 9000 by default
- Configured via systemd service
- Load balanced behind reverse proxy 