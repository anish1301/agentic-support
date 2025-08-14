/**
 * Optimistic Updates Plugin
 * Provides immediate UI feedback and rollback capabilities
 * Simple implementation with clear error handling
 */

const ROLLBACK_TIMEOUT = 10000 // 10 seconds timeout for rollback

/**
 * Create optimistic updates plugin
 * @param {Object} options - Configuration options
 * @returns {Function} Vuex plugin function
 */
export function createOptimisticUpdatesPlugin(options = {}) {
  const {
    timeout = ROLLBACK_TIMEOUT,
    debug = false
  } = options

  // Store for tracking optimistic updates
  const pendingUpdates = new Map()
  const stateSnapshots = new Map()

  return function optimisticUpdatesPlugin(store) {
    // Add helper methods to store
    store.$optimistic = {
      // Start an optimistic update
      startUpdate: (updateId, snapshotKey = null) => {
        return startOptimisticUpdate(store, updateId, snapshotKey, debug)
      },
      
      // Confirm an optimistic update (remove from pending)
      confirmUpdate: (updateId) => {
        return confirmOptimisticUpdate(updateId, pendingUpdates, stateSnapshots, debug)
      },
      
      // Rollback an optimistic update
      rollbackUpdate: (updateId) => {
        return rollbackOptimisticUpdate(store, updateId, pendingUpdates, stateSnapshots, debug)
      },
      
      // Get pending updates
      getPendingUpdates: () => {
        return Array.from(pendingUpdates.keys())
      },
      
      // Check if update is pending
      isPending: (updateId) => {
        return pendingUpdates.has(updateId)
      }
    }

    // Subscribe to mutations to track state changes
    store.subscribe((mutation, state) => {
      // Handle automatic rollback on timeout
      handleAutoRollback(store, mutation, pendingUpdates, stateSnapshots, timeout, debug)
    })
  }
}

/**
 * Start an optimistic update
 */
function startOptimisticUpdate(store, updateId, snapshotKey, debug) {
  try {
    // Create state snapshot before optimistic update
    const snapshot = createStateSnapshot(store.state, snapshotKey)
    
    stateSnapshots.set(updateId, {
      snapshot,
      snapshotKey,
      timestamp: Date.now()
    })
    
    pendingUpdates.set(updateId, {
      status: 'pending',
      startTime: Date.now()
    })
    
    if (debug) {
      console.log(`🚀 Optimistic update started: ${updateId}`)
    }
    
    return {
      success: true,
      updateId,
      hasSnapshot: !!snapshot
    }
  } catch (error) {
    console.error(`❌ Error starting optimistic update ${updateId}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Confirm an optimistic update
 */
function confirmOptimisticUpdate(updateId, pendingUpdates, stateSnapshots, debug) {
  try {
    if (!pendingUpdates.has(updateId)) {
      if (debug) {
        console.warn(`⚠️ Attempted to confirm non-existent update: ${updateId}`)
      }
      return { success: false, error: 'Update not found' }
    }
    
    // Remove from pending updates
    pendingUpdates.delete(updateId)
    stateSnapshots.delete(updateId)
    
    if (debug) {
      console.log(`✅ Optimistic update confirmed: ${updateId}`)
    }
    
    return { success: true, updateId }
  } catch (error) {
    console.error(`❌ Error confirming update ${updateId}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Rollback an optimistic update
 */
function rollbackOptimisticUpdate(store, updateId, pendingUpdates, stateSnapshots, debug) {
  try {
    if (!stateSnapshots.has(updateId)) {
      if (debug) {
        console.warn(`⚠️ No snapshot found for rollback: ${updateId}`)
      }
      return { success: false, error: 'No snapshot available' }
    }
    
    const { snapshot, snapshotKey } = stateSnapshots.get(updateId)
    
    // Restore state from snapshot
    if (snapshotKey) {
      // Restore specific module
      store.commit(`${snapshotKey}/RESTORE_STATE`, snapshot)
    } else {
      // Restore entire state
      store.replaceState({ ...store.state, ...snapshot })
    }
    
    // Clean up
    pendingUpdates.delete(updateId)
    stateSnapshots.delete(updateId)
    
    if (debug) {
      console.log(`🔄 Optimistic update rolled back: ${updateId}`)
    }
    
    return { success: true, updateId }
  } catch (error) {
    console.error(`❌ Error rolling back update ${updateId}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a state snapshot
 */
function createStateSnapshot(state, snapshotKey) {
  try {
    if (snapshotKey) {
      // Snapshot specific module
      return state[snapshotKey] ? JSON.parse(JSON.stringify(state[snapshotKey])) : null
    } else {
      // Snapshot entire state
      return JSON.parse(JSON.stringify(state))
    }
  } catch (error) {
    console.error('❌ Error creating state snapshot:', error)
    return null
  }
}

/**
 * Handle automatic rollback on timeout
 */
function handleAutoRollback(store, mutation, pendingUpdates, stateSnapshots, timeout, debug) {
  const now = Date.now()
  
  // Check for timed out updates
  for (const [updateId, updateInfo] of pendingUpdates.entries()) {
    if (now - updateInfo.startTime > timeout) {
      if (debug) {
        console.warn(`⏰ Auto-rolling back timed out update: ${updateId}`)
      }
      
      rollbackOptimisticUpdate(store, updateId, pendingUpdates, stateSnapshots, debug)
      
      // Notify user of rollback
      store.dispatch('ui/showNotification', {
        type: 'warning',
        message: 'Operation timed out and was reversed. Please try again.',
        duration: 8000
      }, { root: true }).catch(() => {
        // Ignore notification errors
      })
    }
  }
}

/**
 * Helper function to generate unique update IDs
 */
export function generateUpdateId(prefix = 'update') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debug helper to inspect optimistic updates
 */
export function debugOptimisticUpdates(store) {
  if (store.$optimistic) {
    const pending = store.$optimistic.getPendingUpdates()
    console.log('🔍 Pending optimistic updates:', pending)
    
    pending.forEach(updateId => {
      console.log(`  - ${updateId}: pending for ${Date.now() - updateId.split('_')[1]}ms`)
    })
  } else {
    console.log('❌ Optimistic updates plugin not installed')
  }
}
