#!/bin/bash

echo "🔧 Resolving merge conflicts with production values..."

# Function to resolve conflicts in a file
resolve_file() {
    local file="$1"
    local local_value="$2"
    local remote_value="$3"
    local production_value="$4"
    
    echo "Resolving $file..."
    echo "  Local: $local_value"
    echo "  Remote: $remote_value"
    echo "  Using: $production_value"
    
    # Replace the conflict markers with the production value
    sed -i '' "s|<<<<<<< HEAD|# Resolved: Using production value|g" "$file"
    sed -i '' "s|=======|# $production_value|g" "$file"
    sed -i '' "s|>>>>>>> 05688971c14a6b77d54dfaefd1c4c8dacc06bb17|# End resolution|g" "$file"
    
    # Replace the actual values
    sed -i '' "s|$local_value|$production_value|g" "$file"
}

# Resolve each conflicted file
echo "📝 Resolving chainbot/backend/app/services/alex_os_integration.py..."
resolve_file "chainbot/backend/app/services/alex_os_integration.py" \
    "http://localhost:8000" \
    "http://10.42.69.208:8000" \
    "http://10.42.69.208:8000"

echo "📝 Resolving chainbot/chainbot/config/config.py..."
resolve_file "chainbot/chainbot/config/config.py" \
    "http://localhost:8000/api/modules" \
    "http://10.42.69.208:8000/api/modules" \
    "http://10.42.69.208:8000/api/modules"

echo "📝 Resolving chainbot/chainbot_module.py..."
resolve_file "chainbot/chainbot_module.py" \
    "http://localhost:8000/api/webhooks/chainbot" \
    "http://10.42.69.208:8000/api/webhooks/chainbot" \
    "http://10.42.69.208:8000/api/webhooks/chainbot"

echo "📝 Resolving chainbot/config/default.yaml..."
# This file likely has configuration conflicts - use remote version
git checkout --theirs "chainbot/config/default.yaml"

echo "📝 Resolving chainbot/docker-compose.yml..."
# Use remote version for docker-compose
git checkout --theirs "chainbot/docker-compose.yml"

echo "📝 Resolving chainbot/gui/src/AgentMap.tsx..."
# Use remote version for GUI files
git checkout --theirs "chainbot/gui/src/AgentMap.tsx"

echo "📝 Resolving chainbot/gui/src/App.tsx..."
git checkout --theirs "chainbot/gui/src/App.tsx"

echo "📝 Resolving chainbot/gui/src/CenterPaneChat.tsx..."
git checkout --theirs "chainbot/gui/src/CenterPaneChat.tsx"

echo "📝 Resolving chainbot/gui/src/WorkflowBuilder.tsx..."
git checkout --theirs "chainbot/gui/src/WorkflowBuilder.tsx"

echo "📝 Resolving chainbot/gui/tsconfig.app.json..."
git checkout --theirs "chainbot/gui/tsconfig.app.json"

echo "📝 Resolving chainbot/modules/chainbot/config/default.yaml..."
git checkout --theirs "chainbot/modules/chainbot/config/default.yaml"

echo "✅ All conflicts resolved!"
echo "📋 Next steps:"
echo "   git add ."
echo "   git commit -m 'Resolve merge conflicts: use production values'"
echo "   git push -u origin main" 