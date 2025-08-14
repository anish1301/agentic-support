<template>
  <div id="app" class="min-h-screen bg-gray-50 dark:bg-gray-900 theme-transition">
    <!-- Skip to main content link -->
    <a href="#main-content" class="skip-link">{{ $t('a11y.skipToMain') }}</a>
    
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 theme-transition" role="banner">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-4">
            <div class="flex-shrink-0">
              <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                {{ $t('app.title') }}
              </h1>
            </div>
            <div class="hidden md:block">
              <nav class="ml-10 flex items-baseline space-x-4" role="navigation" :aria-label="$t('nav.main')">
                <button 
                  @click="setActiveView('chat')"
                  @keydown="handleNavKeydown($event, 'chat')"
                  :class="[
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:focus-visible',
                    activeView === 'chat' 
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  ]"
                  :aria-current="activeView === 'chat' ? 'page' : false"
                >
                  {{ $t('nav.chatSupport') }}
                </button>
                <button 
                  @click="setActiveView('orders')"
                  @keydown="handleNavKeydown($event, 'orders')"
                  :class="[
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:focus-visible',
                    activeView === 'orders' 
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  ]"
                  :aria-current="activeView === 'orders' ? 'page' : false"
                >
                  {{ $t('nav.orders') }}
                </button>
              </nav>
            </div>
          </div>
          
          <!-- Header controls -->
          <div class="flex items-center space-x-4">
            <!-- Language toggle -->
            <LanguageToggle />
            
            <!-- Theme toggle -->
            <ThemeToggle />
            
            <!-- Status indicator -->
            <div class="flex items-center space-x-2">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 rounded-full animate-pulse" 
                     :class="apiConnected ? 'bg-green-400' : 'bg-red-400'"></div>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ apiConnected ? $t('chat.connected') : $t('chat.disconnected') }}
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
        <!-- Primary content area with loading states -->
        <div class="lg:col-span-2">
          <transition
            name="view-transition"
            :enter-active-class="TRANSITION_CLASSES.slideDown.enterActiveClass"
            :leave-active-class="TRANSITION_CLASSES.slideDown.leaveActiveClass"
            :enter-from-class="TRANSITION_CLASSES.slideDown.enterFromClass"
            :enter-to-class="TRANSITION_CLASSES.slideDown.enterToClass"
            :leave-from-class="TRANSITION_CLASSES.slideDown.leaveFromClass"
            :leave-to-class="TRANSITION_CLASSES.slideDown.leaveToClass"
            mode="out-in"
          >
            <KeepAlive>
              <component 
                :is="currentViewComponent" 
                :key="activeView"
                @loading="handleViewLoading"
                @loaded="handleViewLoaded"
              />
            </KeepAlive>
          </transition>
          
          <!-- View loading skeleton -->
          <SkeletonLoader 
            v-if="viewLoading" 
            :type="activeView === 'chat' ? 'chat' : 'order-card'" 
            :count="3" 
            show-header 
          />
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

    <!-- Mobile navigation menu overlay -->
    <div v-if="showMobileMenu" 
         @click="closeMobileMenu"
         class="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden"
         role="dialog"
         :aria-label="$t('nav.mobileMenu')">
      <div class="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform"
           :class="showMobileMenu ? 'translate-x-0' : '-translate-x-full'">
        <!-- Mobile menu content -->
        <div class="p-4 space-y-4">
          <button @click="closeMobileMenu" class="btn-ghost">
            {{ $t('app.close') }}
          </button>
          <!-- Mobile nav items -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { mapGetters } from 'vuex'
import ChatWindow from './components/chat/ChatWindow.vue'
import OrdersView from './components/orders/OrdersView.vue'
import OrdersSidebar from './components/orders/OrdersSidebar.vue'
import LoadingOverlay from './components/ui/LoadingOverlay.vue'
import NotificationToast from './components/ui/NotificationToast.vue'
import ApiStatusWidget from './components/ui/ApiStatusWidget.vue'
import ActionConfirmationModal from './components/ui/ActionConfirmationModal.vue'
import ThemeToggle from './components/ui/ThemeToggle.vue'
import LanguageToggle from './components/ui/LanguageToggle.vue'
import SkeletonLoader from './components/ui/SkeletonLoader.vue'
import apiService from './services/apiService'
import { TRANSITION_CLASSES } from './utils/animations.js'

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
    ThemeToggle,
    LanguageToggle,
    SkeletonLoader
  },
  setup() {
    const activeView = ref('chat')
    const apiConnected = ref(false)
    const viewLoading = ref(false)
    const showMobileMenu = ref(false)
    const isDevelopment = process.env.NODE_ENV !== 'production'

    const currentViewComponent = computed(() => {
      return activeView.value === 'chat' ? ChatWindow : OrdersView
    })

    // View management
    const setActiveView = (view) => {
      if (activeView.value !== view) {
        viewLoading.value = true
        activeView.value = view
        
        // Analytics tracking
        if (window.gtag) {
          window.gtag('event', 'view_change', {
            view_name: view
          })
        }
        
        // Hide loading after transition
        setTimeout(() => {
          viewLoading.value = false
        }, 300)
      }
    }

    const handleViewLoading = () => {
      viewLoading.value = true
    }

    const handleViewLoaded = () => {
      viewLoading.value = false
    }

    // Mobile menu
    const closeMobileMenu = () => {
      showMobileMenu.value = false
    }

    // Keyboard navigation
    const handleNavKeydown = (event, view) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setActiveView(view)
      }
    }

    return {
      activeView,
      apiConnected,
      viewLoading,
      showMobileMenu,
      isDevelopment,
      currentViewComponent,
      setActiveView,
      handleViewLoading,
      handleViewLoaded,
      closeMobileMenu,
      handleNavKeydown,
      TRANSITION_CLASSES
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
        this.$t('chat.errorConnection')
      )
    }

    // Add initial welcome message
    this.$store.dispatch('chat/addAgentMessage', 
      this.$t('chat.welcome')
    )

    // Load persisted orders if available
    this.$store.dispatch('orders/fetchOrders')

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts()

    // Listen for theme changes to update meta theme-color
    document.addEventListener('themeChanged', this.handleThemeChange)
    
    // Listen for language changes
    window.addEventListener('language-changed', this.handleLanguageChange)
  },

  beforeUnmount() {
    // Clean up event listeners
    this.removeKeyboardShortcuts()
    document.removeEventListener('themeChanged', this.handleThemeChange)
    window.removeEventListener('language-changed', this.handleLanguageChange)
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

      // Accessibility shortcuts
      if (event.altKey && event.key === '1') {
        event.preventDefault()
        this.setActiveView('chat')
      } else if (event.altKey && event.key === '2') {
        event.preventDefault()
        this.setActiveView('orders')
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
    },

    handleThemeChange(event) {
      // Update meta theme-color when theme changes
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', event.detail.isDark ? '#1f2937' : '#ffffff')
      }
    },

    handleLanguageChange(event) {
      console.log('Language changed to:', event.detail.locale)
      
      // Update document direction for RTL languages
      document.documentElement.setAttribute('lang', event.detail.locale)
    }
  }
}
</script>

<style scoped>
/* Component-specific animations */
.view-transition-enter-active,
.view-transition-leave-active {
  transition: all 0.3s ease-out;
}

.view-transition-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.view-transition-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Mobile menu animation */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: transform 0.3s ease-out;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  transform: translateX(-100%);
}
</style>
