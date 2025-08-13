import { createStore } from 'vuex'
import chat from './modules/chat'
import orders from './modules/orders'
import ui from './modules/ui'
import agent from './modules/agent'

// Import plugins
import { createPersistencePlugin } from './plugins/persistence'
import { createOptimisticUpdatesPlugin } from './plugins/optimisticUpdates'
import { createOrderHistoryPlugin } from './plugins/orderHistory'
import { createMongoChatPlugin } from './utils/mongoChat'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Configure plugins
const plugins = [
  // Persistence plugin - saves orders and UI state to localStorage
  createPersistencePlugin({
    debug: isDevelopment,
    modules: ['orders', 'ui', 'agent'],
    whitelist: {
      orders: ['orders', 'actionHistory'], // Don't persist selectedOrder (temporary)
      ui: ['theme'], // Don't persist modals/notifications (temporary)
      agent: ['processingHistory', 'capabilities'] // Don't persist isProcessing (temporary)
    }
  }),
  
  // Optimistic updates plugin - provides immediate feedback and rollback
  createOptimisticUpdatesPlugin({
    debug: isDevelopment,
    timeout: 10000 // 10 seconds timeout
  }),
  
  // Order history plugin - undo/redo for order operations
  createOrderHistoryPlugin({
    debug: isDevelopment,
    maxHistorySize: 50,
    undoableOps: ['UPDATE_ORDER_STATUS']
  }),
  
  // MongoDB chat plugin - chat persistence to database
  createMongoChatPlugin({
    debug: isDevelopment,
    fallbackToLocal: true
  })
]

const store = createStore({
  modules: {
    chat,
    orders,
    ui,
    agent
  },
  plugins,
  strict: isDevelopment
})

// Add helper methods to store instance for easy access
store.helpers = {
  // Persistence helpers
  clearStorage: () => store.$persistence?.clearStorage(),
  exportState: () => store.$persistence?.exportState(),
  importState: (state) => store.$persistence?.importState(state),
  
  // Optimistic update helpers
  startOptimistic: (updateId, module) => store.$optimistic?.startUpdate(updateId, module),
  confirmOptimistic: (updateId) => store.$optimistic?.confirmUpdate(updateId),
  rollbackOptimistic: (updateId) => store.$optimistic?.rollbackUpdate(updateId),
  getPendingUpdates: () => store.$optimistic?.getPendingUpdates() || [],
  
  // Undo/Redo helpers
  undo: () => store.$orderHistory?.undo(),
  redo: () => store.$orderHistory?.redo(),
  canUndo: () => store.$orderHistory?.canUndo() || false,
  canRedo: () => store.$orderHistory?.canRedo() || false,
  getUndoHistory: () => store.$orderHistory?.getUndoHistory() || [],
  getRedoHistory: () => store.$orderHistory?.getRedoHistory() || [],
  
  // MongoDB chat helpers
  isMongoAvailable: () => store.$mongoChat?.isAvailable() || false,
  getChatAnalytics: () => store.$mongoChat?.getChatAnalytics(),
  searchMessages: (query, sessionId) => store.$mongoChat?.searchMessages(query, sessionId)
}

// Add global error handler for plugins
store.subscribe((mutation, state) => {
  // Handle any global errors or logging here
  if (isDevelopment) {
    // Log all mutations in development
    console.log('🔄 Mutation:', mutation.type, mutation.payload)
  }
})

export default store
