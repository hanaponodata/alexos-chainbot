#!/usr/bin/env python3
"""
ChainBot LLM Backend
Purpose: Proxy GUI chat requests to Ollama on MacBook
Architecture: GUI (anywhere) -> Pi LLM Backend -> MacBook Ollama
"""

import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration - Ollama on MacBook
OLLAMA_HOST = os.environ.get('OLLAMA_HOST', '10.42.69.147')
OLLAMA_PORT = os.environ.get('OLLAMA_PORT', '11434')
OLLAMA_BASE_URL = f"http://{OLLAMA_HOST}:{OLLAMA_PORT}"

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        # Test connection to Ollama on MacBook
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            return jsonify({
                'status': 'healthy',
                'ollama': 'connected',
                'models': [m['name'] for m in models]
            })
        else:
            return jsonify({'status': 'unhealthy', 'ollama': 'error'}), 500
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy', 
            'ollama': 'disconnected', 
            'error': str(e)
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Proxy chat requests to Ollama on MacBook"""
    try:
        data = request.get_json()
        if not data or 'messages' not in data:
            return jsonify({'error': 'Missing messages in request'}), 400
        
        # Prepare payload for Ollama
        ollama_payload = {
            'model': data.get('model', 'llama3:latest'),
            'messages': data['messages'],
            'stream': data.get('stream', False)
        }
        
        logger.info(f"Proxying chat request to {OLLAMA_BASE_URL}/api/chat")
        logger.info(f"Payload: {json.dumps(ollama_payload, indent=2)}")
        
        # Forward request to Ollama on MacBook
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=ollama_payload,
            timeout=60
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            logger.error(f"Ollama error: {response.status_code} - {response.text}")
            return jsonify({
                'error': f'Ollama error: {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except requests.exceptions.ConnectionError:
        logger.error(f"Could not connect to Ollama at {OLLAMA_BASE_URL}")
        return jsonify({
            'error': 'Could not connect to Ollama',
            'ollama_url': OLLAMA_BASE_URL
        }), 503
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/models', methods=['GET'])
def models():
    """Get available models from Ollama"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Failed to get models'}), 500
    except Exception as e:
        logger.error(f"Models error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info(f"Starting ChainBot LLM Backend")
    logger.info(f"Ollama URL: {OLLAMA_BASE_URL}")
    logger.info(f"Listening on port 5002")
    
    app.run(
        host='0.0.0.0',
        port=5002,
        debug=False
    ) 