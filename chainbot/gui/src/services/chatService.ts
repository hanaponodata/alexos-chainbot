// Chat service for ChatGPT API integration
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  success: boolean;
  message: ChatMessage | null;
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  sessionId?: string;
  context: string;
}

class ChatService {
  private baseUrl = 'http://10.42.69.208:5002/api/chat';
  private conversationHistory: ChatMessage[] = [];

  // Add message to conversation history
  addMessage(role: 'user' | 'assistant' | 'system', content: string) {
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date()
    };
    this.conversationHistory.push(message);
    this.saveConversationHistory();
    return message;
  }

  // Get conversation history
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  // Clear conversation history
  clearConversationHistory() {
    this.conversationHistory = [];
    localStorage.removeItem('conversation_history');
  }

  // Save conversation to localStorage
  private saveConversationHistory() {
    localStorage.setItem('conversation_history', JSON.stringify(this.conversationHistory));
  }

  // Load conversation from localStorage
  loadConversationHistory() {
    const saved = localStorage.getItem('conversation_history');
    if (saved) {
      try {
        this.conversationHistory = JSON.parse(saved).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (error) {
        console.error('Failed to load conversation history:', error);
        this.conversationHistory = [];
      }
    }
  }

  // Get API key (for compatibility - not used with ChainBot backend)
  getApiKey(): string {
    return localStorage.getItem('chatgpt_api_key') || '';
  }

  // Set API key (for compatibility - not used with ChainBot backend)
  setApiKey(apiKey: string) {
    localStorage.setItem('chatgpt_api_key', apiKey);
  }

  // Get conversation context
  getContext(): string {
    return this.conversationHistory
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  // Send message to ChainBot backend (which proxies to Ollama on MacBook)
  async sendMessage(message: string): Promise<ChatResponse> {
    try {
      // Add user message to history
      this.addMessage('user', message);

      // Prepare the request for the ChainBot backend
      const requestBody = {
        messages: [
          {
            role: 'system',
            content: 'You are ChainBot, an AI agent assistant running on a Raspberry Pi that connects to a MacBook running Ollama with Llama 3. Be helpful, concise, and friendly.'
          },
          ...this.conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        stream: false
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add assistant response to history
      const safeContent = typeof data.message?.content === 'string' ? data.message.content : '';
      const assistantMessage = this.addMessage('assistant', safeContent);

      return {
        success: true,
        message: assistantMessage,
        response: data.message.content,
        context: this.getContext()
      };

    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        message: null,
        response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: this.getContext()
      };
    }
  }

  // Export conversation as JSON
  exportConversation(): string {
    return JSON.stringify({
      conversation: this.conversationHistory,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }

  // Import conversation from JSON
  importConversation(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.conversation && Array.isArray(data.conversation)) {
        this.conversationHistory = data.conversation.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        this.saveConversationHistory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import conversation:', error);
      return false;
    }
  }
}

// Export singleton instance
export const chatService = new ChatService(); 