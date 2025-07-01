#!/usr/bin/env python3
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ollama URL - pointing to MacBook's Ollama instance
OLLAMA_URL = "http://10.42.69.147:11434/api/chat"

@app.route('/api/chat', methods=['POST'])
def chat():
    """Proxy chat requests to Ollama"""
    try:
        data = request.get_json()
        
        if not data or 'messages' not in data:
            return jsonify({'error': 'Missing messages in request'}), 400
        
        # Prepare request for Ollama
        ollama_request = {
            'model': 'llama3:latest',
            'messages': data['messages'],
            'stream': False
        }
        
        logger.info(f"Proxying request to Ollama: {ollama_request}")
        
        # Send request to Ollama
        response = requests.post(OLLAMA_URL, json=ollama_request, timeout=60)
        
        if response.status_code == 200:
            ollama_data = response.json()
            
            # Format response for ChainBot frontend
            chainbot_response = {
                'success': True,
                'message': {
                    'id': f"msg_{int(time.time() * 1000)}",
                    'role': 'assistant',
                    'content': ollama_data.get('message', {}).get('content', ''),
                    'timestamp': time.time()
                },
                'response': ollama_data.get('message', {}).get('content', ''),
                'usage': ollama_data.get('usage', {})
            }
            
            logger.info(f"Successfully proxied response from Ollama")
            return jsonify(chainbot_response)
        else:
            logger.error(f"Ollama returned error: {response.status_code} - {response.text}")
            return jsonify({'error': f'Ollama error: {response.status_code}'}), 500
            
    except requests.exceptions.Timeout:
        logger.error("Request to Ollama timed out")
        return jsonify({'error': 'Request timed out'}), 504
    except requests.exceptions.ConnectionError:
        logger.error("Could not connect to Ollama")
        return jsonify({'error': 'Could not connect to Ollama'}), 503
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        # Test connection to Ollama on MacBook
        response = requests.get("http://10.42.69.147:11434/api/tags", timeout=5)
        if response.status_code == 200:
            return jsonify({'status': 'healthy', 'ollama': 'connected'})
        else:
            return jsonify({'status': 'unhealthy', 'ollama': 'error'}), 500
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'ollama': 'disconnected', 'error': str(e)}), 500

if __name__ == '__main__':
    import time
    print("Starting ChainBot Backend...")
    print("This backend proxies requests to Ollama running on localhost:11434")
    print("Access the API at: http://localhost:5002")
    app.run(host='0.0.0.0', port=5002, debug=True) 