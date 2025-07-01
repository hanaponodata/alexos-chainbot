#!/bin/bash

# Deploy ChainBot LLM Backend to Pi
echo "Deploying ChainBot LLM Backend to Pi..."

# Create the llmbackend directory on Pi if it doesn't exist
ssh -p 5420 alex@10.42.69.208 "mkdir -p /opt/alexos/modules/chainbot/llmbackend"

# Copy the new LLM backend to Pi
scp -P 5420 chainbot/llmbackend.py alex@10.42.69.208:/opt/alexos/modules/chainbot/llmbackend/

# Stop any existing LLM backend processes
ssh -p 5420 alex@10.42.69.208 "pkill -f llmbackend.py || true"

# Start the new LLM backend on Pi
ssh -p 5420 alex@10.42.69.208 << 'EOF'
cd /opt/alexos/modules/chainbot/llmbackend
export OLLAMA_HOST=10.42.69.147
export OLLAMA_PORT=11434
nohup python3 llmbackend.py > llmbackend.log 2>&1 &
echo "LLM Backend started with PID: $!"
EOF

echo "LLM Backend deployment complete!"
echo "Testing connection..."
sleep 3
curl -s http://10.42.69.208:5002/api/health | jq . 