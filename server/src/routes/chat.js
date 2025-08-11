const express = require('express');
const router = express.Router();
const SmartHybridAIService = require('../services/smartHybridAI');

// Initialize smart hybrid AI service
const smartAI = new SmartHybridAIService();

// POST /api/chat - Smart hybrid processing
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, customerId = 'CUST-001' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Use smart hybrid AI service
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const aiResponse = await smartAI.processMessage(message, customerId, currentSessionId);
    
    const response = {
      message: aiResponse.message,
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
      type: 'agent',
      intent: aiResponse.intent,
      orderId: aiResponse.orderId,
      actions: aiResponse.actions || [],
      success: aiResponse.success !== false,
      context: {
        confidence: aiResponse.confidence,
        source: aiResponse.source,
        escalateToHuman: aiResponse.escalateToHuman || false
      }
    };
    
    // Handle human escalation
    if (aiResponse.escalation) {
      response.escalation = aiResponse.escalation;
      response.requiresHuman = true;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Smart hybrid chat error:', error);
    res.status(500).json({ 
      error: 'I encountered an issue processing your request. Please try again.',
      message: 'Sorry, I had a temporary issue. Let me connect you with a human agent.',
      type: 'agent',
      timestamp: new Date().toISOString(),
      escalateToHuman: true
    });
  }
});

// GET /api/chat/history/:sessionId - Get chat history
router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // Mock chat history
  const history = [
    {
      id: 1,
      message: "Hello! How can I help you today?",
      type: 'agent',
      timestamp: new Date().toISOString()
    }
  ];
  
  res.json({ sessionId, history });
});

// GET /api/chat/stats - Get smart hybrid AI service statistics
router.get('/stats', (req, res) => {
  try {
    const stats = smartAI.getServiceStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: 'Failed to get service statistics',
      message: error.message
    });
  }
});

// GET /api/chat/context/:sessionId - Get conversation context  
router.get('/context/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const context = smartAI.getContextMemory(sessionId);
    
    res.json({
      success: true,
      sessionId,
      context,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting context:', error);
    res.status(500).json({
      error: 'Failed to get conversation context',
      message: error.message
    });
  }
});

module.exports = router;
