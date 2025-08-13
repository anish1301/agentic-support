<template>
  <div id="app" class="min-h-screen bg-gray-50 dark:bg-gray-900 theme-transition">
    <!-- Skip to main content link -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 theme-transition" role="banner">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-4">
            <div class="flex-shrink-0">
              <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                Richpanel AI Agent
              </h1>
            </div>
            <div class="hidden md:block">
              <nav class="ml-10 flex items-baseline space-x-4" role="navigation">
                <button 
                  @click="activeView = 'chat'"
                  :class="[
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:focus-visible',
                    activeView === 'chat' 
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  ]"
                >
                  Chat Support
                </button>
                <button 
                  @click="activeView = 'orders'"
                  :class="[
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:focus-visible',
                    activeView === 'orders' 
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  ]"
                >
                  Orders
                </button>
              </nav>
            </div>
          </div>
          
          <!-- Header controls -->
          <div class="flex items-center space-x-4">
            <!-- Theme toggle -->
            <ThemeToggle v-if="$theme" />
            
            <!-- Status indicator -->
            <div class="flex items-center space-x-2">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full animate-pulse" 
                     :class="apiConnected ? 'bg-green-400' : 'bg-red-400'"></div>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ apiConnected ? 'AI Agent Active' : 'AI Agent Offline' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main id="main-content" class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8" role="main">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Primary content area -->
        <div class="lg:col-span-2">
          <ChatWindow v-if="activeView === 'chat'" />
          <OrdersView v-else-if="activeView === 'orders'" />
        </div>
        
        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <OrdersSidebar />
        </div>
      </div>
    </main>

    <!-- Global Loading Overlay -->
    <LoadingOverlay v-if="isLoading" />
    
    <!-- Notifications -->
    <NotificationToast />
    
    <!-- API Status Widget (dev mode only) -->
    <ApiStatusWidget v-if="isDevelopment && activeView === 'chat'" />
    
    <!-- Action Confirmation Modal -->
    <ActionConfirmationModal />
  </div>
</template>

<script>
import ChatWindow from './components/chat/ChatWindow.vue'
import OrdersView from './components/orders/OrdersView.vue'
import OrdersSidebar from './components/orders/OrdersSidebar.vue'
import LoadingOverlay from './components/ui/LoadingOverlay.vue'
import NotificationToast from './components/ui/NotificationToast.vue'
import ApiStatusWidget from './components/ui/ApiStatusWidget.vue'
import ActionConfirmationModal from './components/ui/ActionConfirmationModal.vue'
import ThemeToggle from './components/ui/ThemeToggle.vue'
import apiService from './services/apiService'
import { mapGetters } from 'vuex'

export default {
  name: 'App',
  components: {
    ChatWindow,
    OrdersView,
    OrdersSidebar,
    LoadingOverlay,
    NotificationToast,
    ApiStatusWidget,
    ActionConfirmationModal,
    ThemeToggle
  },
  data() {
    return {
      activeView: 'chat',
      apiConnected: false,
      isDevelopment: process.env.NODE_ENV !== 'production'
    }
  },
  computed: {
    ...mapGetters({
      isLoading: 'ui/isLoading'
    })
  },
  async mounted() {
    // Initialize chat session (MongoDB integration)
    this.$store.dispatch('chat/initializeSession')

    // Test API connection
    try {
      await apiService.healthCheck()
      this.apiConnected = true
      console.log('✅ API connection successful')
    } catch (error) {
      console.error('❌ API connection failed:', error)
      this.$store.dispatch('chat/addAgentMessage', 
        "⚠️ I'm having trouble connecting to my backend services. Some features may not work properly."
      )
    }

    // Add initial welcome message
    this.$store.dispatch('chat/addAgentMessage', 
      "👋 Hello! I'm your AI support agent. I can help you with order cancellations, tracking, returns, and any questions you have. How can I assist you today?"
    )

    // Load persisted orders if available
    this.$store.dispatch('orders/fetchOrders')

    // Set up keyboard shortcuts for undo/redo
    this.setupKeyboardShortcuts()
  },

  beforeUnmount() {
    // Clean up keyboard shortcuts
    this.removeKeyboardShortcuts()
  },

  methods: {
    setupKeyboardShortcuts() {
      document.addEventListener('keydown', this.handleKeyboardShortcuts)
    },

    removeKeyboardShortcuts() {
      document.removeEventListener('keydown', this.handleKeyboardShortcuts)
    },

    handleKeyboardShortcuts(event) {
      // Ctrl+Z or Cmd+Z for Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        this.handleUndo()
      }
      
      // Ctrl+Shift+Z or Ctrl+Y or Cmd+Shift+Z for Redo
      if (((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') || 
          (event.ctrlKey && event.key === 'y')) {
        event.preventDefault()
        this.handleRedo()
      }
    },

    async handleUndo() {
      const canUndo = this.$store.helpers?.canUndo()
      if (!canUndo) return

      try {
        const result = this.$store.helpers?.undo()
        if (result?.success) {
          this.$store.dispatch('ui/showNotification', {
            type: 'success',
            message: `⌨️ ${result.message}`,
            duration: 4000
          })
        }
      } catch (error) {
        console.error('Keyboard undo failed:', error)
      }
    },

    async handleRedo() {
      const canRedo = this.$store.helpers?.canRedo()
      if (!canRedo) return

      try {
        const result = this.$store.helpers?.redo()
        if (result?.success) {
          this.$store.dispatch('ui/showNotification', {
            type: 'success',
            message: `⌨️ ${result.message}`,
            duration: 4000
          })
        }
      } catch (error) {
        console.error('Keyboard redo failed:', error)
      }
    }
  }
}
</script>

<style scoped>
/* Enhanced hover effects */
.theme-transition {
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Focus visible styles */
.focus-visible:focus-visible {
  @apply outline-none ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800;
}
</style>
