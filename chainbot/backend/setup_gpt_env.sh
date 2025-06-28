#!/bin/bash
"""
Setup script for ChainBot GPT Integration

This script helps set up the environment for GPT integration:
- Creates .env file with required environment variables
- Validates configuration
- Provides setup instructions
"""

set -e

echo "🚀 ChainBot GPT Integration Setup"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "app/main.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# ChainBot GPT Integration Environment Variables

# OpenAI Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORGANIZATION_ID=your_organization_id_here  # Optional

# MacLink Configuration
# URL of your MacBook running MacLink server
MACLINK_URL=http://localhost:8080
MACLINK_API_KEY=your_maclink_api_key_here  # Optional

# Database Configuration
DATABASE_URL=postgresql://chainbot:password@localhost:5432/chainbot

# API Configuration
API_HOST=127.0.0.1
API_PORT=9000

# Security
SECRET_KEY=your-secret-key-here-change-in-production

# Development
DEBUG=false
EOF
    echo "✅ Created .env file"
else
    echo "ℹ️ .env file already exists"
fi

# Check if Python dependencies are installed
echo "🔍 Checking Python dependencies..."
if ! python3 -c "import yaml, aiohttp" 2>/dev/null; then
    echo "❌ Missing required Python packages. Please install them:"
    echo "   pip install pyyaml aiohttp"
    exit 1
fi

# Check if configuration file exists
if [ ! -f "../config/default.yaml" ]; then
    echo "❌ Configuration file not found at ../config/default.yaml"
    exit 1
fi

echo "✅ Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env file and add your OpenAI API key:"
echo "   OPENAI_API_KEY=sk-your-actual-api-key-here"
echo ""
echo "2. If using MacLink, update the MacLink URL:"
echo "   MACLINK_URL=http://your-macbook-ip:8080"
echo ""
echo "3. Test the integration:"
echo "   python3 test_gpt_integration.py"
echo ""
echo "4. Start the backend server:"
echo "   python3 -m uvicorn app.main:app --reload --port 9000"
echo ""
echo "5. Access the API documentation:"
echo "   http://localhost:9000/docs"
echo ""
echo "🔗 Useful links:"
echo "- OpenAI API Keys: https://platform.openai.com/api-keys"
echo "- MacLink Setup: https://github.com/your-maclink-repo"
echo "- ChainBot Documentation: ../README.md"
echo ""
echo "📝 Note: ChainBot uses ports 9000-9099. The default port is 9000." 