<!--
  Undo Notification Component
  Shows user-friendly undo/redo notifications after order actions
-->
<template>
  <!-- Undo Notification Bar -->
  <transition
    enter-active-class="transform transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transform transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="showUndoBar"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div class="bg-gray-900 text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-4 max-w-md">
        <!-- Action Icon -->
        <div class="flex-shrink-0">
          <svg 
            v-if="lastAction?.operation === 'CANCEL_ORDER'"
            class="w-5 h-5 text-red-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <svg 
            v-else-if="lastAction?.operation === 'RETURN_ORDER'"
            class="w-5 h-5 text-orange-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
          </svg>
          <svg 
            v-else
            class="w-5 h-5 text-blue-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        
        <!-- Message -->
        <div class="flex-1">
          <p class="text-sm font-medium">{{ undoMessage }}</p>
          <p v-if="countdown > 0" class="text-xs text-gray-300">
            Auto-dismissing in {{ countdown }}s
          </p>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center space-x-2">
          <button
            @click="handleUndo"
            :disabled="!canUndo"
            class="px-3 py-1 text-xs font-medium bg-white text-gray-900 rounded hover:bg-gray-100 transition-colors"
            :class="{ 'opacity-50 cursor-not-allowed': !canUndo }"
          >
            Undo
          </button>
          <button
            @click="dismissUndoBar"
            class="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </transition>

  <!-- Undo/Redo Help Tooltip -->
  <UndoRedoHelp />

  <!-- Undo/Redo Floating Action Button -->
  <div 
    v-if="(canUndo || canRedo) && !showUndoBar" 
    class="fixed bottom-6 right-6 z-40"
  >
    <div class="flex flex-col space-y-2">
      <!-- Undo Button -->
      <button
        v-if="canUndo"
        @click="handleUndo"
        class="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        :title="`Undo: ${getLastUndoDescription()}`"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
        </svg>
      </button>
      
      <!-- Redo Button -->
      <button
        v-if="canRedo"
        @click="handleRedo"
        class="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        :title="`Redo: ${getLastRedoDescription()}`"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import UndoRedoHelp from './UndoRedoHelp.vue'

export default {
  name: 'UndoRedoWidget',
  components: {
    UndoRedoHelp
  },
  data() {
    return {
      showUndoBar: false,
      countdown: 0,
      countdownInterval: null,
      autoDismissTimeout: null,
      lastAction: null
    }
  },
  
  computed: {
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
    },
    
    undoMessage() {
      if (!this.lastAction) return 'Action completed'
      
      const actionMessages = {
        'CANCEL_ORDER': `Order ${this.lastAction.orderId} has been cancelled`,
        'RETURN_ORDER': `Return requested for order ${this.lastAction.orderId}`,
        'UPDATE_ORDER_STATUS': `Order ${this.lastAction.orderId} status updated`
      }
      
      return actionMessages[this.lastAction.operation] || 'Action completed'
    }
  },
  
  mounted() {
    // Listen for order actions that should show undo notification
    this.$store.subscribe((mutation, state) => {
      if (this.shouldShowUndoNotification(mutation)) {
        this.showUndoNotification(mutation)
      }
    })
  },
  
  beforeUnmount() {
    this.clearTimers()
  },
  
  methods: {
    ...mapActions('ui', ['showNotification']),
    
    shouldShowUndoNotification(mutation) {
      // Show undo notification for critical order actions
      const criticalActions = [
        'orders/UPDATE_ORDER_STATUS',
        'orders/CANCEL_ORDER', 
        'orders/RETURN_ORDER'
      ]
      
      return criticalActions.includes(mutation.type)
    },
    
    showUndoNotification(mutation) {
      // Extract action info
      this.lastAction = {
        operation: mutation.type.split('/')[1],
        orderId: mutation.payload?.orderId,
        timestamp: new Date().toISOString()
      }
      
      // Show the undo bar
      this.showUndoBar = true
      
      // Start countdown
      this.startCountdown()
      
      // Auto-dismiss after 8 seconds
      this.autoDismissTimeout = setTimeout(() => {
        this.dismissUndoBar()
      }, 8000)
    },
    
    startCountdown() {
      this.countdown = 8
      this.countdownInterval = setInterval(() => {
        this.countdown--
        if (this.countdown <= 0) {
          clearInterval(this.countdownInterval)
        }
      }, 1000)
    },
    
    dismissUndoBar() {
      this.showUndoBar = false
      this.lastAction = null
      this.clearTimers()
    },
    
    clearTimers() {
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval)
        this.countdownInterval = null
      }
      if (this.autoDismissTimeout) {
        clearTimeout(this.autoDismissTimeout)
        this.autoDismissTimeout = null
      }
    },
    
    async handleUndo() {
      try {
        const result = this.$store.helpers?.undo()
        
        if (result?.success) {
          this.showNotification({
            type: 'success',
            message: `✅ ${result.message}`,
            duration: 4000
          })
          
          this.dismissUndoBar()
        } else {
          this.showNotification({
            type: 'error',
            message: result?.message || 'Unable to undo action'
          })
        }
      } catch (error) {
        console.error('Undo failed:', error)
        this.showNotification({
          type: 'error',
          message: 'Undo operation failed'
        })
      }
    },
    
    async handleRedo() {
      try {
        const result = this.$store.helpers?.redo()
        
        if (result?.success) {
          this.showNotification({
            type: 'success',
            message: `✅ ${result.message}`,
            duration: 4000
          })
        } else {
          this.showNotification({
            type: 'error',
            message: result?.message || 'Unable to redo action'
          })
        }
      } catch (error) {
        console.error('Redo failed:', error)
        this.showNotification({
          type: 'error',
          message: 'Redo operation failed'
        })
      }
    },
    
    getLastUndoDescription() {
      const lastUndo = this.undoHistory[this.undoHistory.length - 1]
      return lastUndo?.description || 'Undo last action'
    },
    
    getLastRedoDescription() {
      const lastRedo = this.redoHistory[this.redoHistory.length - 1]
      return lastRedo?.description || 'Redo last action'
    }
  }
}
</script>

<style scoped>
/* Ensure smooth animations */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
