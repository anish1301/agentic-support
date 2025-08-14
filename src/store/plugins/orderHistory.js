/**
 * Order History Plugin (Undo/Redo)
 * Tracks order operations and provides undo/redo capabilities
 * Simple command pattern implementation
 */

const MAX_HISTORY_SIZE = 50 // Maximum number of operations to track

// Define which order operations can be undone
const UNDOABLE_OPERATIONS = [
  'UPDATE_ORDER_STATUS',
  'CANCEL_ORDER',
  'RETURN_ORDER', 
  'UPDATE_ORDER_TRACKING'
]

/**
 * Create order history plugin
 * @param {Object} options - Configuration options
 * @returns {Function} Vuex plugin function
 */
export function createOrderHistoryPlugin(options = {}) {
  const {
    maxHistorySize = MAX_HISTORY_SIZE,
    undoableOps = UNDOABLE_OPERATIONS,
    debug = false
  } = options

  // History stacks
  const undoStack = []
  const redoStack = []

  return function orderHistoryPlugin(store) {
    // Subscribe to order mutations
    store.subscribe((mutation, state) => {
      if (mutation.type.startsWith('orders/') && isUndoableMutation(mutation, undoableOps)) {
        handleOrderMutation(store, mutation, state, undoStack, redoStack, maxHistorySize, debug)
      }
    })

    // Subscribe BEFORE mutations to capture previous state
    store.subscribeAction({
      before: (action, state) => {
        // Capture state before order actions
        if (action.type.startsWith('orders/')) {
          capturePreviousState(action, state, debug)
        }
      }
    })

    // Add undo/redo methods to store
    store.$orderHistory = {
      // Undo last operation
      undo: () => {
        return undoLastOperation(store, undoStack, redoStack, debug)
      },
      
      // Redo last undone operation
      redo: () => {
        return redoLastOperation(store, undoStack, redoStack, debug)
      },
      
      // Check if undo is available
      canUndo: () => {
        return undoStack.length > 0
      },
      
      // Check if redo is available
      canRedo: () => {
        return redoStack.length > 0
      },
      
      // Get undo history
      getUndoHistory: () => {
        return undoStack.map(entry => ({
          operation: entry.operation,
          orderId: entry.orderId,
          timestamp: entry.timestamp,
          description: entry.description
        }))
      },
      
      // Get redo history
      getRedoHistory: () => {
        return redoStack.map(entry => ({
          operation: entry.operation,
          orderId: entry.orderId,
          timestamp: entry.timestamp,
          description: entry.description
        }))
      },
      
      // Clear all history
      clearHistory: () => {
        undoStack.length = 0
        redoStack.length = 0
        if (debug) {
          console.log('🧹 Order history cleared')
        }
      }
    }
  }
}

/**
 * Check if mutation is undoable
 */
function isUndoableMutation(mutation, undoableOps) {
  const operationType = mutation.type.split('/')[1]
  return undoableOps.includes(operationType)
}

/**
 * Handle order mutation for history tracking
 */
function handleOrderMutation(store, mutation, state, undoStack, redoStack, maxHistorySize, debug) {
  try {
    const command = createUndoCommand(mutation, state)
    
    if (command) {
      // Add to undo stack
      undoStack.push(command)
      
      // Clear redo stack (can't redo after new operation)
      redoStack.length = 0
      
      // Limit history size
      if (undoStack.length > maxHistorySize) {
        undoStack.shift()
      }
      
      if (debug) {
        console.log(`📝 Order operation recorded: ${command.description}`)
      }
    }
  } catch (error) {
    console.error('❌ Error recording order operation:', error)
  }
}

/**
 * Create undo command from mutation
 */
function createUndoCommand(mutation, state) {
  const { type, payload } = mutation
  const operationType = type.split('/')[1]
  
  switch (operationType) {
    case 'UPDATE_ORDER_STATUS':
      return createStatusChangeCommand(payload, state)
      
    case 'CANCEL_ORDER':
      return createCancelOrderCommand(payload, state)
      
    case 'RETURN_ORDER':
      return createReturnOrderCommand(payload, state)
      
    case 'UPDATE_ORDER_TRACKING':
      return createTrackingUpdateCommand(payload, state)
      
    default:
      return null
  }
}

/**
 * Create status change undo command
 */
function createStatusChangeCommand(payload, state) {
  const { orderId, status: newStatus } = payload
  const order = state.orders.orders.find(o => o.id === orderId)
  
  if (!order) return null
  
  // Use captured previous state or fallback to action history
  let previousStatus = 'confirmed' // Default fallback
  
  if (previousOrderStates[orderId]) {
    previousStatus = previousOrderStates[orderId].status
    // Clean up after use
    delete previousOrderStates[orderId]
  } else {
    // Fallback: Find previous status from action history
    const previousActions = state.orders.actionHistory
      .filter(action => action.orderId === orderId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    if (previousActions.length > 1) {
      previousStatus = extractStatusFromAction(previousActions[1])
    }
  }
  
  return {
    operation: 'UPDATE_ORDER_STATUS',
    orderId,
    timestamp: new Date().toISOString(),
    description: `Change order ${orderId} status from ${newStatus} back to ${previousStatus}`,
    undoAction: {
      type: 'orders/UPDATE_ORDER_STATUS',
      payload: { 
        orderId, 
        status: previousStatus,
        additionalData: {
          canCancel: previousStatus !== 'delivered' && previousStatus !== 'cancelled',
          canReturn: previousStatus === 'delivered'
        }
      }
    },
    redoAction: {
      type: 'orders/UPDATE_ORDER_STATUS', 
      payload: { orderId, status: newStatus }
    }
  }
}

/**
 * Create cancel order undo command
 */
function createCancelOrderCommand(payload, state) {
  const orderId = payload.orderId || payload
  const order = state.orders.orders.find(o => o.id === orderId)
  
  if (!order) return null
  
  const previousStatus = order.status === 'cancelled' ? 'confirmed' : order.status
  
  return {
    operation: 'CANCEL_ORDER',
    orderId,
    timestamp: new Date().toISOString(),
    description: `Restore cancelled order ${orderId}`,
    undoAction: {
      type: 'orders/UPDATE_ORDER_STATUS',
      payload: { 
        orderId, 
        status: previousStatus,
        additionalData: {
          canCancel: true,
          canReturn: previousStatus === 'delivered'
        }
      }
    },
    redoAction: {
      type: 'orders/UPDATE_ORDER_STATUS',
      payload: {
        orderId,
        status: 'cancelled',
        additionalData: {
          canCancel: false,
          canReturn: false,
          cancellationReason: 'Customer request',
          cancelledAt: new Date().toISOString()
        }
      }
    }
  }
}

/**
 * Create return order undo command
 */
function createReturnOrderCommand(payload, state) {
  const orderId = payload.orderId || payload
  const order = state.orders.orders.find(o => o.id === orderId)
  
  if (!order) return null
  
  return {
    operation: 'RETURN_ORDER',
    orderId,
    timestamp: new Date().toISOString(),
    description: `Cancel return request for order ${orderId}`,
    undoAction: {
      type: 'orders/UPDATE_ORDER_STATUS',
      payload: { 
        orderId, 
        status: 'delivered',
        additionalData: {
          canReturn: true
        }
      }
    },
    redoAction: {
      type: 'orders/UPDATE_ORDER_STATUS',
      payload: {
        orderId,
        status: 'return_requested',
        additionalData: {
          canReturn: false,
          returnReason: 'Customer request',
          returnDate: new Date().toISOString()
        }
      }
    }
  }
}

/**
 * Create tracking update undo command
 */
function createTrackingUpdateCommand(payload, state) {
  const { orderId, trackingInfo } = payload
  const order = state.orders.orders.find(o => o.id === orderId)
  
  if (!order) return null
  
  const previousTrackingInfo = {
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    estimatedDelivery: order.estimatedDelivery
  }
  
  return {
    operation: 'UPDATE_ORDER_TRACKING',
    orderId,
    timestamp: new Date().toISOString(),
    description: `Restore previous tracking info for order ${orderId}`,
    undoAction: {
      type: 'orders/UPDATE_ORDER_TRACKING',
      payload: { orderId, trackingInfo: previousTrackingInfo }
    },
    redoAction: {
      type: 'orders/UPDATE_ORDER_TRACKING',
      payload: { orderId, trackingInfo }
    }
  }
}

/**
 * Undo last operation
 */
function undoLastOperation(store, undoStack, redoStack, debug) {
  if (undoStack.length === 0) {
    return { success: false, message: 'Nothing to undo' }
  }
  
  try {
    const command = undoStack.pop()
    
    // Execute undo action
    store.commit(command.undoAction.type, command.undoAction.payload)
    
    // Move to redo stack
    redoStack.push(command)
    
    if (debug) {
      console.log(`↩️ Undone: ${command.description}`)
    }
    
    return { 
      success: true, 
      message: `Undone: ${command.description}`,
      operation: command.operation,
      orderId: command.orderId
    }
  } catch (error) {
    console.error('❌ Error during undo:', error)
    return { success: false, message: 'Undo failed', error: error.message }
  }
}

/**
 * Redo last undone operation
 */
function redoLastOperation(store, undoStack, redoStack, debug) {
  if (redoStack.length === 0) {
    return { success: false, message: 'Nothing to redo' }
  }
  
  try {
    const command = redoStack.pop()
    
    // Execute redo action
    store.commit(command.redoAction.type, command.redoAction.payload)
    
    // Move back to undo stack
    undoStack.push(command)
    
    if (debug) {
      console.log(`↪️ Redone: ${command.description}`)
    }
    
    return { 
      success: true, 
      message: `Redone: ${command.description}`,
      operation: command.operation,
      orderId: command.orderId
    }
  } catch (error) {
    console.error('❌ Error during redo:', error)
    return { success: false, message: 'Redo failed', error: error.message }
  }
}

/**
 * Extract status from action history entry
 */
function extractStatusFromAction(action) {
  const statusMatch = action.action.match(/Status changed to (\w+)/)
  return statusMatch ? statusMatch[1] : 'confirmed'
}

// Store for capturing state before actions
let previousOrderStates = {}

/**
 * Capture previous state before action
 */
function capturePreviousState(action, state, debug) {
  if (action.type === 'orders/cancelOrder' && action.payload?.orderId) {
    const orderId = action.payload.orderId
    const order = state.orders.orders.find(o => o.id === orderId)
    if (order) {
      previousOrderStates[orderId] = {
        status: order.status,
        canCancel: order.canCancel,
        canReturn: order.canReturn,
        timestamp: new Date().toISOString()
      }
      if (debug) {
        console.log(`📸 Captured previous state for order ${orderId}:`, previousOrderStates[orderId])
      }
    }
  }
}
