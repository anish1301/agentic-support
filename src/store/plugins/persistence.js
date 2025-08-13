/**
 * Vuex Persistence Plugin
 * Automatically saves and restores state from localStorage
 * Simple, debuggable implementation with error handling
 */

const STORAGE_KEY = 'richpanel_ai_agent_state'
const STATE_VERSION = '1.0.0'

// Define which modules should be persisted
const PERSISTED_MODULES = ['orders', 'ui', 'agent']

// Define which parts of each module to persist
const MODULE_WHITELIST = {
  orders: ['orders', 'actionHistory'], // Don't persist selectedOrder (temporary)
  ui: ['theme', 'notifications'], // Don't persist modals (temporary)
  agent: ['processingHistory', 'capabilities'] // Don't persist isProcessing (temporary)
}

/**
 * Create persistence plugin
 * @param {Object} options - Configuration options
 * @returns {Function} Vuex plugin function
 */
export function createPersistencePlugin(options = {}) {
  const {
    storageKey = STORAGE_KEY,
    modules = PERSISTED_MODULES,
    whitelist = MODULE_WHITELIST,
    debug = false
  } = options

  return function persistencePlugin(store) {
    // Load persisted state on store creation
    try {
      const savedState = loadPersistedState(storageKey, debug)
      if (savedState) {
        store.replaceState(mergeState(store.state, savedState))
        if (debug) {
          console.log('✅ Persisted state loaded successfully', savedState)
        }
      }
    } catch (error) {
      console.error('❌ Error loading persisted state:', error)
      // Clear corrupted data
      localStorage.removeItem(storageKey)
    }

    // Subscribe to state changes and save to localStorage
    store.subscribe((mutation, state) => {
      try {
        // Only save state for whitelisted modules
        if (shouldPersistMutation(mutation, modules)) {
          const stateToSave = extractPersistableState(state, whitelist)
          saveStateToStorage(storageKey, stateToSave, debug)
        }
      } catch (error) {
        console.error('❌ Error saving state to localStorage:', error)
      }
    })

    // Add helper methods to store
    store.$persistence = {
      clearStorage: () => clearStorage(storageKey, debug),
      exportState: () => loadPersistedState(storageKey, debug),
      importState: (state) => {
        saveStateToStorage(storageKey, state, debug)
        store.replaceState(mergeState(store.state, state))
      }
    }
  }
}

/**
 * Load persisted state from localStorage
 */
function loadPersistedState(storageKey, debug = false) {
  try {
    const serializedState = localStorage.getItem(storageKey)
    if (!serializedState) {
      if (debug) console.log('📝 No persisted state found')
      return null
    }

    const parsed = JSON.parse(serializedState)
    
    // Check version compatibility
    if (parsed.version !== STATE_VERSION) {
      if (debug) {
        console.log(`🔄 State version mismatch. Saved: ${parsed.version}, Current: ${STATE_VERSION}`)
      }
      // Handle migration here if needed
      return null
    }

    return parsed.state
  } catch (error) {
    console.error('❌ Error parsing persisted state:', error)
    return null
  }
}

/**
 * Save state to localStorage
 */
function saveStateToStorage(storageKey, state, debug = false) {
  try {
    const stateWithMeta = {
      version: STATE_VERSION,
      timestamp: new Date().toISOString(),
      state
    }
    
    const serializedState = JSON.stringify(stateWithMeta)
    localStorage.setItem(storageKey, serializedState)
    
    if (debug) {
      console.log('💾 State saved to localStorage', { size: serializedState.length })
    }
  } catch (error) {
    console.error('❌ Error saving state to localStorage:', error)
  }
}

/**
 * Check if mutation should trigger persistence
 */
function shouldPersistMutation(mutation, modules) {
  const moduleName = mutation.type.split('/')[0]
  return modules.includes(moduleName)
}

/**
 * Extract only the persistable parts of state
 */
function extractPersistableState(state, whitelist) {
  const persistableState = {}
  
  Object.keys(whitelist).forEach(moduleName => {
    if (state[moduleName]) {
      persistableState[moduleName] = {}
      
      whitelist[moduleName].forEach(key => {
        if (state[moduleName][key] !== undefined) {
          persistableState[moduleName][key] = state[moduleName][key]
        }
      })
    }
  })
  
  return persistableState
}

/**
 * Merge saved state with current state
 */
function mergeState(currentState, savedState) {
  const mergedState = { ...currentState }
  
  Object.keys(savedState).forEach(moduleName => {
    if (mergedState[moduleName] && savedState[moduleName]) {
      mergedState[moduleName] = {
        ...mergedState[moduleName],
        ...savedState[moduleName]
      }
    }
  })
  
  return mergedState
}

/**
 * Clear all persisted storage
 */
function clearStorage(storageKey, debug = false) {
  try {
    localStorage.removeItem(storageKey)
    if (debug) {
      console.log('🧹 Persisted storage cleared')
    }
  } catch (error) {
    console.error('❌ Error clearing storage:', error)
  }
}

/**
 * Debug helper to inspect current storage
 */
export function debugPersistence() {
  const state = loadPersistedState(STORAGE_KEY, true)
  console.log('🔍 Current persisted state:', state)
  
  // Calculate storage size
  const serialized = localStorage.getItem(STORAGE_KEY)
  if (serialized) {
    console.log('📊 Storage size:', (serialized.length / 1024).toFixed(2), 'KB')
  }
}
