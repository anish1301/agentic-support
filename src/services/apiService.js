// API service for communicating with the backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Chat endpoints
  async sendMessage(message, sessionId) {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    });
  }

  async getChatHistory(sessionId) {
    return this.request(`/chat/history/${sessionId}`);
  }

  // Order endpoints
  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(orderId) {
    return this.request(`/orders/${orderId}`);
  }

  async cancelOrder(orderId) {
    return this.request(`/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  }

  async returnOrder(orderId) {
    return this.request(`/orders/${orderId}/return`, {
      method: 'POST',
    });
  }

  // Agent endpoints
  async executeAction(action, orderId, parameters = {}) {
    return this.request('/agent/action', {
      method: 'POST',
      body: JSON.stringify({ action, orderId, parameters }),
    });
  }

  async getAgentCapabilities() {
    return this.request('/agent/capabilities');
  }

  // Health check
  async healthCheck() {
    const url = `${this.baseURL.replace('/api', '')}/health`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }
}

export default new ApiService();
