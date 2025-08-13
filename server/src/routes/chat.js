const express = require('express');
const router = express.Router();
const simpleAIService = require('../services/simpleAIService');

// POST /api/chat - Simple AI chat processing with state-based context
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, customerId = 'CUST-001' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`[ChatRoute] Processing: "${message}" for customer: ${customerId}, session: ${sessionId}`);
    
    // Use simple AI service with state-based context
    const aiResponse = await simpleAIService.processUserRequest(message, customerId, sessionId);
    
    const response = {
      message: aiResponse.message,
      sessionId: aiResponse.sessionId,
      timestamp: new Date().toISOString(),
      type: 'agent',
      actions: aiResponse.actions || [],
      success: true,
      needsConfirmation: aiResponse.needsConfirmation || false
    };
    
    res.json(response);
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ 
      error: 'I encountered an issue processing your request. Please try again.',
      message: 'Sorry, I had a temporary issue. How can I help you?',
      type: 'agent',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/chat/history/:sessionId - Get chat history
router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
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

module.exports = router;
