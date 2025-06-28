# ChainBot GPT Integration Guide

## Overview

ChainBot now includes comprehensive GPT integration that supports both OpenAI's GPT models and local LLMs via MacLink. This integration provides a unified interface for AI-powered workflow orchestration and agent management.

## Features

- **Multi-Provider Support**: OpenAI GPT models and local LLMs via MacLink
- **Unified Agent Brain**: Single interface for all completion generation
- **Persona Management**: Pre-configured and customizable agent personas
- **Conversation History**: Automatic conversation tracking and context management
- **Health Monitoring**: Real-time provider health checks and status monitoring
- **Rate Limiting**: Built-in rate limiting and quota management
- **Error Recovery**: Automatic retry logic and fallback mechanisms

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Agent Brain   │    │  OpenAI Client  │    │ MacLink Client  │
│   (Unified)     │◄──►│   (Remote)      │    │   (Local)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  GPT Integration│    │  Key Manager    │    │ Connection Mgr  │
│     API Routes  │    │   (OpenAI)      │    │   (MacLink)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORGANIZATION_ID=your_organization_id_here  # Optional

# MacLink Configuration
MACLINK_URL=http://localhost:8080
MACLINK_API_KEY=your_maclink_api_key_here  # Optional

# Other Configuration
DATABASE_URL=postgresql://chainbot:password@localhost:5432/chainbot
API_HOST=127.0.0.1
API_PORT=9000
SECRET_KEY=your-secret-key-here-change-in-production
```

### Configuration File

The GPT integration settings are defined in `config/default.yaml`:

```yaml
gpt_integration:
  enabled: true
  default_provider: "openai"  # openai or maclink
  
  openai:
    enabled: true
    api_key: ""  # Set via environment variable
    organization_id: ""
    default_model: "gpt-4o"
    max_tokens: 2048
    temperature: 0.7
    timeout: 30
    max_retries: 3
    
  maclink:
    enabled: true
    macbook_url: "http://localhost:8080"
    api_key: ""
    default_model: "llama2"
    max_tokens: 2048
    temperature: 0.7
    timeout: 60
    max_retries: 3
    
  agent_brain:
    enabled: true
    conversation_history_limit: 50
    context_window_size: 10
    confidence_threshold: 0.7
    fallback_provider: "openai"
```

**Note**: ChainBot uses ports 9000-9099. The default API port is 9000.

## Setup

### 1. Quick Setup

Run the setup script:

```bash
cd chainbot/backend
./setup_gpt_env.sh
```

### 2. Manual Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**:
   ```bash
   # Copy and edit the .env file
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Test Integration**:
   ```bash
   python3 test_gpt_integration.py
   ```

4. **Start Server**:
   ```bash
   python3 -m uvicorn app.main:app --reload --port 9000
   ```

5. **Access the API documentation**:
   ```bash
   http://localhost:9000/docs
   ```

## API Usage

### Generate Completions

```bash
curl -X POST "http://localhost:9000/api/gpt/completion" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "prompt": "What is the capital of France?",
    "agent_id": "agent_001",
    "provider": "openai",
    "model": "gpt-4o"
  }'
```

### Check Provider Status

```bash
curl "http://localhost:9000/api/gpt/providers/status" \
  -H "Authorization: Bearer your_jwt_token"
```

### Health Check

```bash
curl "http://localhost:9000/api/gpt/health" \
  -H "Authorization: Bearer your_jwt_token"
```

### List Personas

```bash
curl "http://localhost:9000/api/gpt/personas" \
  -H "Authorization: Bearer your_jwt_token"
```

## Agent Personas

ChainBot comes with pre-configured personas:

### General Assistant
- **Provider**: OpenAI
- **Model**: gpt-4o
- **Use Case**: General knowledge and conversation

### Code Assistant
- **Provider**: OpenAI
- **Model**: gpt-4o
- **Use Case**: Software development and debugging

### Creative Writer
- **Provider**: MacLink
- **Model**: llama2
- **Use Case**: Creative writing and storytelling

### Analyst
- **Provider**: OpenAI
- **Model**: gpt-4o
- **Use Case**: Data analysis and research

## Integration with Workflows

The GPT integration can be used in workflow steps:

```python
# Example workflow step using GPT
workflow_step = {
    "type": "gpt_completion",
    "name": "analyze_data",
    "config": {
        "prompt": "Analyze the following data: {{input_data}}",
        "agent_id": "data_analyst_001",
        "persona": "analyst",
        "provider": "openai",
        "model": "gpt-4o"
    }
}
```

## Monitoring and Health Checks

### Health Endpoints

- `/health` - Overall system health
- `/api/gpt/health` - GPT integration health
- `/api/gpt/providers/status` - Provider status

### Metrics

The integration provides metrics for:
- Request counts per provider
- Response times
- Error rates
- Token usage

## Error Handling

### Common Errors

1. **API Key Issues**:
   ```
   OpenAI error: Invalid API key
   ```
   - Check your `OPENAI_API_KEY` environment variable
   - Verify the key is valid and has sufficient credits

2. **MacLink Connection Issues**:
   ```
   MacLink error: Connection refused
   ```
   - Ensure MacLink server is running on your MacBook
   - Check the `MACLINK_URL` configuration

3. **Rate Limiting**:
   ```
   Rate limit exceeded
   ```
   - The system automatically handles rate limiting
   - Consider upgrading your OpenAI plan

### Fallback Behavior

- If OpenAI is unavailable, the system falls back to MacLink
- If MacLink is unavailable, the system falls back to OpenAI
- If both are unavailable, an error is returned

## Security Considerations

### API Key Management

- Store API keys in environment variables, not in code
- Use different keys for development and production
- Rotate keys regularly using the key rotation API

### Rate Limiting

- Built-in rate limiting prevents quota exhaustion
- Configurable limits per provider
- Automatic retry with exponential backoff

### Input Validation

- All prompts are validated before sending to providers
- Conversation history is sanitized
- Maximum token limits are enforced

## Troubleshooting

### Debug Mode

Enable debug logging:

```bash
export DEBUG=true
python3 -m uvicorn app.main:app --reload --log-level debug
```

### Test Individual Components

```bash
# Test configuration
python3 -c "from app.config import config; print(config.get_gpt_config())"

# Test service initialization
python3 -c "import asyncio; from app.services import initialize_services; asyncio.run(initialize_services())"
```

### Common Issues

1. **Import Errors**: Ensure you're in the correct directory and Python path is set
2. **Configuration Errors**: Check that `config/default.yaml` exists and is valid YAML
3. **Network Issues**: Verify internet connectivity for OpenAI and local network for MacLink

## Performance Optimization

### Caching

- Conversation history is cached in memory
- Persona configurations are cached
- Provider status is cached with TTL

### Connection Pooling

- HTTP connections are pooled for efficiency
- Automatic connection cleanup on shutdown

### Async Processing

- All GPT operations are asynchronous
- Non-blocking I/O for better performance

## Development

### Adding New Providers

1. Create a new client class in `app/services/`
2. Implement the required interface
3. Add provider to `CompletionProvider` enum
4. Update agent brain to handle the new provider

### Custom Personas

```python
from app.services.agent_brain import AgentPersona, CompletionProvider

custom_persona = AgentPersona(
    name="custom_assistant",
    description="Custom AI assistant",
    system_prompt="You are a custom assistant...",
    preferred_provider=CompletionProvider.OPENAI,
    preferred_model="gpt-4o",
    temperature=0.7,
    max_tokens=2048,
    capabilities=["custom_capability"]
)

agent_brain.add_persona(custom_persona)
```

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review the API documentation at `http://localhost:9000/docs`
3. Check the logs for detailed error messages
4. Run the test script to validate your setup

## Changelog

### Version 1.0.0
- Initial GPT integration implementation
- OpenAI and MacLink support
- Unified agent brain
- Persona management
- Health monitoring
- API endpoints for all features 