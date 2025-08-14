class ConversationContext {
  constructor() {
    // Store conversation contexts by sessionId
    this.contexts = new Map();
  }

  // Get or create context for a session
  getContext(sessionId) {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, {
        sessionId,
        messages: [], // Store conversation history
        waitingFor: null, // What we're waiting for (confirmation, selection, etc.)
        pendingAction: null, // Action waiting for confirmation
        lastIntent: null, // Last detected intent
        entities: {}, // Extracted entities
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return this.contexts.get(sessionId);
  }

  // Add message to context
  addMessage(sessionId, message, type = 'user', metadata = {}) {
    const context = this.getContext(sessionId);
    context.messages.push({
      message,
      type,
      timestamp: new Date(),
      ...metadata
    });
    context.updatedAt = new Date();
    return context;
  }

  // Set what we're waiting for
  setWaitingFor(sessionId, waitingFor, pendingAction = null) {
    const context = this.getContext(sessionId);
    context.waitingFor = waitingFor;
    context.pendingAction = pendingAction;
    context.updatedAt = new Date();
    return context;
  }

  // Clear waiting state
  clearWaiting(sessionId) {
    const context = this.getContext(sessionId);
    context.waitingFor = null;
    context.pendingAction = null;
    context.updatedAt = new Date();
    return context;
  }

  // Update entities
  updateEntities(sessionId, entities) {
    const context = this.getContext(sessionId);
    context.entities = { ...context.entities, ...entities };
    context.updatedAt = new Date();
    return context;
  }

  // Set last intent
  setLastIntent(sessionId, intent) {
    const context = this.getContext(sessionId);
    context.lastIntent = intent;
    context.updatedAt = new Date();
    return context;
  }

  // Check if we're waiting for something
  isWaitingFor(sessionId, waitingType = null) {
    const context = this.getContext(sessionId);
    if (waitingType) {
      return context.waitingFor === waitingType;
    }
    return context.waitingFor !== null;
  }

  // Get recent conversation for context
  getRecentContext(sessionId, messageCount = 5) {
    const context = this.getContext(sessionId);
    return context.messages.slice(-messageCount).map(m => 
      `${m.type}: ${m.message}`
    ).join('\n');
  }

  // Clean up old contexts (optional - to prevent memory leaks)
  cleanup(maxAgeHours = 24) {
    const cutoff = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    for (const [sessionId, context] of this.contexts.entries()) {
      if (context.updatedAt < cutoff) {
        this.contexts.delete(sessionId);
      }
    }
  }
}

// Single instance to share across the application
const conversationContext = new ConversationContext();

module.exports = conversationContext;
