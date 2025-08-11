<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-4">
            <div class="flex-shrink-0">
              <h1 class="text-xl font-bold text-gray-900">
                Richpanel AI Agent
              </h1>
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                <button 
                  @click="activeView = 'chat'"
                  :class="[
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    activeView === 'chat' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  ]"
                >
                  Chat Support
                </button>
                <button 
                  @click="activeView = 'orders'"
                  :class="[
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    activeView === 'orders' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  ]"
                >
                  Orders
                </button>
              </div>
            </div>
          </div>
          
          <!-- Status indicator -->
          <div class="flex items-center space-x-2">
            <div class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span class="text-sm text-gray-600">AI Agent Active</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Chat View -->
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
    <ApiStatusWidget v-if="$data.activeView === 'chat'" />
  </div>
</template>

<script>
import ChatWindow from './components/chat/ChatWindow.vue'
import OrdersView from './components/orders/OrdersView.vue'
import OrdersSidebar from './components/orders/OrdersSidebar.vue'
import LoadingOverlay from './components/ui/LoadingOverlay.vue'
import NotificationToast from './components/ui/NotificationToast.vue'
import ApiStatusWidget from './components/ui/ApiStatusWidget.vue'
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
    ApiStatusWidget
  },
  data() {
    return {
      activeView: 'chat',
      apiConnected: false
    }
  },
  computed: {
    ...mapGetters({
      isLoading: 'ui/isLoading'
    })
  },
  async mounted() {
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
  }
}
</script>
