<!--
  Action Confirmation Modal
  Provides confirmation for critical order actions with undo/redo context
-->
<template>
  <teleport to="body">
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        @click.self="closeModal"
      >
        <transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 transform scale-95"
          enter-to-class="opacity-100 transform scale-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100 transform scale-100"
          leave-to-class="opacity-0 transform scale-95"
        >
          <div
            v-if="isOpen"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 theme-transition"
          >
            <!-- Header -->
            <div class="flex items-center mb-4">
              <div 
                class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3"
                :class="iconBgClass"
              >
                <component :is="iconComponent" class="w-5 h-5" :class="iconClass" />
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ title }}
                </h3>
                <p class="text-sm text-gray-600">
                  {{ subtitle }}
                </p>
              </div>
            </div>

            <!-- Content -->
            <div class="mb-6">
              <p class="text-gray-700 mb-4">
                {{ message }}
              </p>
              
              <!-- Undo Information -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div class="flex items-start space-x-2">
                  <svg class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div class="text-sm text-blue-800">
                    <p class="font-medium">Don't worry if you change your mind!</p>
                    <p>You can undo this action using the undo button that will appear after confirmation.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex space-x-3">
              <button
                @click="closeModal"
                class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                @click="confirmAction"
                :disabled="isProcessing"
                class="flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                :class="confirmButtonClass"
              >
                <svg 
                  v-if="isProcessing" 
                  class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isProcessing ? 'Processing...' : confirmText }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'ActionConfirmationModal',
  data() {
    return {
      isProcessing: false
    }
  },
  
  computed: {
    ...mapGetters('ui', ['getModal']),
    
    modalData() {
      return this.getModal('actionConfirmation')
    },
    
    isOpen() {
      return this.modalData.isOpen
    },
    
    action() {
      return this.modalData.action
    },
    
    orderId() {
      return this.modalData.orderId
    },
    
    title() {
      const titles = {
        'cancel': 'Cancel Order',
        'return': 'Request Return',
        'update_status': 'Update Order'
      }
      return titles[this.action] || 'Confirm Action'
    },
    
    subtitle() {
      return `Order ${this.orderId}`
    },
    
    message() {
      const messages = {
        'cancel': 'Are you sure you want to cancel this order? This action will stop the order from being processed and shipped.',
        'return': 'Are you sure you want to request a return for this order? This will initiate the return process.',
        'update_status': 'Are you sure you want to update this order status?'
      }
      return messages[this.action] || 'Are you sure you want to perform this action?'
    },
    
    confirmText() {
      const texts = {
        'cancel': 'Yes, Cancel Order',
        'return': 'Yes, Request Return', 
        'update_status': 'Yes, Update Order'
      }
      return texts[this.action] || 'Confirm'
    },
    
    iconComponent() {
      const icons = {
        'cancel': 'XIcon',
        'return': 'ReturnIcon',
        'update_status': 'CheckIcon'
      }
      
      // Return SVG components directly
      if (this.action === 'cancel') {
        return 'svg'
      } else if (this.action === 'return') {
        return 'svg'
      } else {
        return 'svg'
      }
    },
    
    iconClass() {
      const classes = {
        'cancel': 'text-red-600',
        'return': 'text-orange-600',
        'update_status': 'text-green-600'
      }
      return classes[this.action] || 'text-gray-600'
    },
    
    iconBgClass() {
      const classes = {
        'cancel': 'bg-red-100',
        'return': 'bg-orange-100', 
        'update_status': 'bg-green-100'
      }
      return classes[this.action] || 'bg-gray-100'
    },
    
    confirmButtonClass() {
      if (this.isProcessing) {
        return 'bg-gray-600 cursor-not-allowed'
      }
      
      const classes = {
        'cancel': 'bg-red-600 hover:bg-red-700',
        'return': 'bg-orange-600 hover:bg-orange-700',
        'update_status': 'bg-green-600 hover:bg-green-700'
      }
      return classes[this.action] || 'bg-gray-600 hover:bg-gray-700'
    }
  },
  
  methods: {
    ...mapActions('ui', ['closeModal', 'showNotification']),
    ...mapActions('orders', ['cancelOrder', 'returnOrder']),
    
    async confirmAction() {
      if (this.isProcessing) return
      
      this.isProcessing = true
      
      try {
        let result = null
        
        // Execute the appropriate action
        switch (this.action) {
          case 'cancel':
            result = await this.cancelOrder({
              orderId: this.orderId,
              reason: 'User requested cancellation'
            })
            break
            
          case 'return':
            result = await this.returnOrder({
              orderId: this.orderId,
              reason: 'User requested return'
            })
            break
            
          case 'update_status':
            // Handle status update if needed
            result = { success: true, message: 'Status updated' }
            break
            
          default:
            result = { success: false, message: 'Unknown action' }
        }
        
        // Show result notification
        this.showNotification({
          type: result.success ? 'success' : 'error',
          message: result.message,
          duration: result.success ? 6000 : 4000
        })
        
        // Close modal
        this.closeModal('actionConfirmation')
        
      } catch (error) {
        console.error('Action failed:', error)
        this.showNotification({
          type: 'error',
          message: 'Action failed. Please try again.'
        })
      } finally {
        this.isProcessing = false
      }
    }
  }
}
</script>
