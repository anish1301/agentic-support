<!--
  Advanced State Management Debug Panel
  Simple, debuggable interface to test all new features
-->
<template>
  <div class="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 max-w-md z-50 theme-transition">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Debug Panel</h3>
      <button 
        @click="isExpanded = !isExpanded"
        class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        {{ isExpanded ? '−' : '+' }}
      </button>
    </div>
    
    <div v-if="isExpanded" class="space-y-4">
      <!-- Persistence Section -->
      <div class="border-b pb-3">
        <h4 class="font-medium text-gray-700 mb-2">💾 Persistence</h4>
        <div class="grid grid-cols-2 gap-2">
          <button @click="clearStorage" class="debug-btn bg-red-100 text-red-700">
            Clear Storage
          </button>
          <button @click="exportState" class="debug-btn bg-blue-100 text-blue-700">
            Export State
          </button>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          Storage: {{ storageSize }} KB
        </div>
      </div>
      
      <!-- Optimistic Updates Section -->
      <div class="border-b pb-3">
        <h4 class="font-medium text-gray-700 mb-2">🚀 Optimistic Updates</h4>
        <div class="text-xs text-gray-600">
          Pending: {{ pendingUpdates.length }}
        </div>
        <div v-if="pendingUpdates.length > 0" class="text-xs text-orange-600">
          {{ pendingUpdates.join(', ') }}
        </div>
      </div>
      
      <!-- Undo/Redo Section -->
      <div class="border-b pb-3">
        <h4 class="font-medium text-gray-700 mb-2">↩️ Undo/Redo</h4>
        <div class="grid grid-cols-2 gap-2">
          <button 
            @click="undo" 
            :disabled="!canUndo"
            class="debug-btn"
            :class="canUndo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'"
          >
            Undo ({{ undoHistory.length }})
          </button>
          <button 
            @click="redo" 
            :disabled="!canRedo"
            class="debug-btn"
            :class="canRedo ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'"
          >
            Redo ({{ redoHistory.length }})
          </button>
        </div>
        <div v-if="undoHistory.length > 0" class="text-xs text-gray-600 mt-1">
          Last: {{ undoHistory[undoHistory.length - 1]?.description }}
        </div>
      </div>
      
      <!-- MongoDB Section -->
      <div class="border-b pb-3">
        <h4 class="font-medium text-gray-700 mb-2">🗄️ MongoDB Chat</h4>
        <div class="flex items-center justify-between">
          <span class="text-xs" :class="isMongoConnected ? 'text-green-600' : 'text-red-600'">
            {{ isMongoConnected ? '✅ Connected' : '❌ Disconnected' }}
          </span>
          <button @click="testMongo" class="debug-btn bg-yellow-100 text-yellow-700">
            Test Connection
          </button>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          Session: {{ currentSessionId || 'None' }}
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div>
        <h4 class="font-medium text-gray-700 mb-2">⚡ Quick Actions</h4>
        <div class="space-y-2">
          <button @click="simulateOrderCancel" class="debug-btn bg-red-100 text-red-700 w-full">
            Test Order Cancel
          </button>
          <button @click="simulateOrderReturn" class="debug-btn bg-orange-100 text-orange-700 w-full">
            Test Order Return
          </button>
          <button @click="showStats" class="debug-btn bg-indigo-100 text-indigo-700 w-full">
            Show Statistics
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'DebugPanel',
  data() {
    return {
      isExpanded: false,
      storageSize: 0
    }
  },
  computed: {
    ...mapGetters('orders', ['allOrders']),
    ...mapGetters('chat', ['isMongoConnected', 'currentSessionId', 'messageCount']),
    
    pendingUpdates() {
      return this.$store.helpers?.getPendingUpdates() || []
    },
    
    canUndo() {
      return this.$store.helpers?.canUndo() || false
    },
    
    canRedo() {
      return this.$store.helpers?.canRedo() || false
    },
    
    undoHistory() {
      return this.$store.helpers?.getUndoHistory() || []
    },
    
    redoHistory() {
      return this.$store.helpers?.getRedoHistory() || []
    }
  },
  
  mounted() {
    this.calculateStorageSize()
    // Update storage size every 5 seconds
    setInterval(this.calculateStorageSize, 5000)
  },
  
  methods: {
    ...mapActions('orders', ['cancelOrder', 'returnOrder']),
    ...mapActions('ui', ['showNotification']),
    
    // Persistence methods
    clearStorage() {
      this.$store.helpers?.clearStorage()
      this.showNotification({
        type: 'info',
        message: '🧹 Local storage cleared'
      })
      this.calculateStorageSize()
    },
    
    exportState() {
      const state = this.$store.helpers?.exportState()
      if (state) {
        console.log('📊 Exported State:', state)
        this.showNotification({
          type: 'success',
          message: '📊 State exported to console'
        })
      }
    },
    
    // Undo/Redo methods
    async undo() {
      const result = this.$store.helpers?.undo()
      if (result?.success) {
        this.showNotification({
          type: 'info',
          message: `↩️ ${result.message}`
        })
      }
    },
    
    async redo() {
      const result = this.$store.helpers?.redo()
      if (result?.success) {
        this.showNotification({
          type: 'info',
          message: `↪️ ${result.message}`
        })
      }
    },
    
    // MongoDB methods
    async testMongo() {
      const isAvailable = this.$store.helpers?.isMongoAvailable()
      this.showNotification({
        type: isAvailable ? 'success' : 'warning',
        message: `🗄️ MongoDB: ${isAvailable ? 'Available' : 'Unavailable'}`
      })
      
      if (isAvailable) {
        try {
          const analytics = await this.$store.helpers?.getChatAnalytics()
          console.log('📈 MongoDB Analytics:', analytics)
        } catch (error) {
          console.error('Error getting analytics:', error)
        }
      }
    },
    
    // Quick action methods
    async simulateOrderCancel() {
      const firstOrder = this.allOrders.find(order => order.canCancel)
      if (firstOrder) {
        const result = await this.cancelOrder({
          orderId: firstOrder.id,
          reason: 'Debug test cancellation'
        })
        
        this.showNotification({
          type: result.success ? 'success' : 'error',
          message: result.message
        })
      } else {
        this.showNotification({
          type: 'warning',
          message: 'No cancellable orders found'
        })
      }
    },
    
    async simulateOrderReturn() {
      const deliveredOrder = this.allOrders.find(order => order.status === 'delivered' && order.canReturn)
      if (deliveredOrder) {
        const result = await this.returnOrder({
          orderId: deliveredOrder.id,
          reason: 'Debug test return'
        })
        
        this.showNotification({
          type: result.success ? 'success' : 'error',
          message: result.message
        })
      } else {
        this.showNotification({
          type: 'warning',
          message: 'No returnable orders found'
        })
      }
    },
    
    showStats() {
      const stats = {
        orders: this.allOrders.length,
        messages: this.messageCount,
        pendingUpdates: this.pendingUpdates.length,
        undoHistory: this.undoHistory.length,
        redoHistory: this.redoHistory.length,
        mongoConnected: this.isMongoConnected,
        storageSize: this.storageSize
      }
      
      console.log('📊 Application Statistics:', stats)
      this.showNotification({
        type: 'info',
        message: '📊 Statistics logged to console'
      })
    },
    
    calculateStorageSize() {
      try {
        const storageKey = 'richpanel_ai_agent_state'
        const item = localStorage.getItem(storageKey)
        this.storageSize = item ? (item.length / 1024).toFixed(2) : 0
      } catch (error) {
        this.storageSize = 0
      }
    }
  }
}
</script>

<style scoped>
.debug-btn {
  @apply px-3 py-1 rounded text-xs font-medium border transition-colors;
}

.debug-btn:disabled {
  @apply cursor-not-allowed opacity-50;
}

.debug-btn:not(:disabled):hover {
  @apply opacity-80;
}
</style>
