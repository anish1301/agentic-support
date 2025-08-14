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
  async sendMessage(message, sessionId, userOrders = []) {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId, userOrders }),
    });
  }

  async getChatHistory(sessionId) {
    return this.request(`/chat/history/${sessionId}`);
  }

  // Order endpoints - with MongoDB support
  async getOrders(useMongoDB = true) {
    const endpoint = useMongoDB ? '/mongo-orders' : '/orders';
    return this.request(endpoint);
  }

  async getOrder(orderId, useMongoDB = true) {
    const endpoint = useMongoDB ? `/mongo-orders/${orderId}` : `/orders/${orderId}`;
    return this.request(endpoint);
  }

  async cancelOrder(orderId, reason = '', useMongoDB = true) {
    const endpoint = useMongoDB ? `/mongo-orders/${orderId}/cancel` : `/orders/${orderId}/cancel`;
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async returnOrder(orderId, reason = '', useMongoDB = true) {
    const endpoint = useMongoDB ? `/mongo-orders/${orderId}/return` : `/orders/${orderId}/return`;
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async undoCancelOrder(orderId, useMongoDB = true) {
    const endpoint = useMongoDB ? `/mongo-orders/${orderId}/undo-cancel` : `/orders/${orderId}/undo-cancel`;
    return this.request(endpoint, {
      method: 'POST',
    });
  }

  async undoReturnOrder(orderId, useMongoDB = true) {
    const endpoint = useMongoDB ? `/mongo-orders/${orderId}/undo-return` : `/orders/${orderId}/undo-return`;
    return this.request(endpoint, {
      method: 'POST',
    });
  }

  async getOrderAnalytics(useMongoDB = true) {
    const endpoint = useMongoDB ? '/mongo-orders/analytics/summary' : '/orders/analytics';
    return this.request(endpoint);
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
