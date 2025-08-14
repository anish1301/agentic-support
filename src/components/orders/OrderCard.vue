<template>
  <div 
    class="order-card group relative animate-fade-in-up"
    @mouseenter="handleHover"
    @mouseleave="handleHoverEnd"
    @click="handleCardClick"
    :tabindex="0"
    @keydown="handleKeydown"
    role="article"
    :aria-label="$t('orders.details.orderNumber', { number: order.id })"
  >
    <!-- Loading overlay -->
    <div v-if="isLoading" 
         class="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10 
                flex items-center justify-center rounded-lg">
      <div class="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full"></div>
    </div>

    <!-- Order Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="space-y-1">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 
                   dark:group-hover:text-primary-400 transition-colors duration-200">
          {{ order.id }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ $t('orders.details.orderDate') }}: {{ formatDate(order.orderDate) }}
        </p>
      </div>
      
      <OrderStatus :status="order.status" :orderId="order.id" />
    </div>

    <!-- Customer Info with progressive disclosure -->
    <ProgressiveDisclosure 
      expand-text="Show customer details"
      collapse-text="Hide customer details"
      class="mb-4"
    >
      <template #basic>
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg theme-transition">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center 
                        transform transition-transform duration-200 group-hover:scale-110">
              <span class="text-white text-sm font-medium">
                {{ order.customerName.charAt(0) }}
              </span>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ order.customerName }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ order.customerEmail }}</p>
            </div>
          </div>
        </div>
      </template>

      <template #advanced>
        <div class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span class="form-label">{{ $t('orders.details.customer') }}</span>
              <p class="text-gray-900 dark:text-gray-100">{{ order.customerName }}</p>
            </div>
            <div>
              <span class="form-label">{{ $t('orders.details.email') }}</span>
              <p class="text-gray-900 dark:text-gray-100">{{ order.customerEmail }}</p>
            </div>
            <div v-if="order.shippingAddress">
              <span class="form-label">{{ $t('orders.details.shipping') }}</span>
              <p class="text-gray-900 dark:text-gray-100 text-xs">
                {{ order.shippingAddress.street }}<br>
                {{ order.shippingAddress.city }}, {{ order.shippingAddress.state }} {{ order.shippingAddress.zip }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </ProgressiveDisclosure>

    <!-- Order Items with stagger animation -->
    <div class="mb-4">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        {{ $t('orders.details.items') }} ({{ order.items.length }})
      </h4>
      <div class="space-y-2" ref="itemsList">
        <div 
          v-for="(item, index) in order.items" 
          :key="item.id"
          class="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg 
                 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 
                 transform hover:scale-[1.02] hover:shadow-sm"
          :style="{ animationDelay: `${index * 100}ms` }"
        >
          <div class="relative overflow-hidden rounded-lg">
            <img 
              :src="item.image" 
              :alt="item.name"
              class="w-12 h-12 object-cover transform transition-transform duration-300 hover:scale-110"
              @error="handleImageError"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-200"></div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {{ item.name }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.variant }}</p>
            <p class="text-xs text-gray-600 dark:text-gray-300">
              {{ $t('orders.details.quantity') }}: {{ item.qty }} • {{ formatCurrency(item.price) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Total with animation -->
    <div class="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg 
                hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors duration-200">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ $t('orders.details.total') }}</span>
        <span class="text-lg font-bold text-primary-600 dark:text-primary-400 
                     transition-all duration-200 hover:scale-105" 
              ref="totalAmount">
          {{ formatCurrency(order.total) }}
        </span>
      </div>
    </div>

    <!-- Tracking Info (if applicable) -->
    <div v-if="order.trackingNumber && order.status !== 'cancelled'" 
         class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg animate-slide-in-right">
      <div class="flex items-center space-x-2">
        <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" 
             fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0H4m16 0l-2-2m0 0l-2 2m2-2v-2m0 2v2"></path>
        </svg>
        <div class="flex-1">
          <p class="text-sm font-medium text-blue-900 dark:text-blue-100">
            {{ order.carrier }}: {{ order.trackingNumber }}
          </p>
          <p class="text-xs text-blue-700 dark:text-blue-300">
            {{ order.status === 'delivered' 
               ? $t('orders.status.delivered') 
               : `${$t('orders.details.estimatedDelivery')}: ${formatDate(order.estimatedDelivery)}` }}
          </p>
        </div>
      </div>
    </div>

    <!-- Action Buttons with enhanced interactions -->
    <div class="flex flex-wrap gap-2">
      <button
        v-if="order.canCancel"
        @click.stop="handleAction('cancel', $event)"
        :aria-label="$t('orders.actions.cancel')"
        class="flex-1 btn-enhanced btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700 
               dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300
               focus:ring-red-500 group/btn"
      >
        <svg class="w-4 h-4 mr-1 transition-transform duration-200 group-hover/btn:rotate-90" 
             fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        {{ $t('orders.actions.cancel') }}
      </button>
      
      <button
        v-if="order.trackingNumber"
        @click.stop="handleAction('track', $event)"
        :aria-label="$t('orders.actions.track')"
        class="flex-1 btn-enhanced btn-secondary text-blue-600 hover:bg-blue-50 hover:text-blue-700
               dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300
               focus:ring-blue-500 group/btn"
      >
        <svg class="w-4 h-4 mr-1 transition-transform duration-200 group-hover/btn:scale-110" 
             fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        {{ $t('orders.actions.track') }}
      </button>
      
      <button
        v-if="order.canReturn"
        @click.stop="handleAction('return', $event)"
        :aria-label="$t('orders.actions.return')"
        class="flex-1 btn-enhanced btn-secondary text-orange-600 hover:bg-orange-50 hover:text-orange-700
               dark:text-orange-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-300
               focus:ring-orange-500 group/btn"
      >
        <svg class="w-4 h-4 mr-1 transition-transform duration-200 group-hover/btn:-translate-x-1" 
             fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
        </svg>
        {{ $t('orders.actions.return') }}
      </button>
    </div>

    <!-- Success/Error feedback overlay -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showFeedback" 
           class="absolute inset-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm z-20 
                  flex items-center justify-center rounded-lg">
        <div class="text-center space-y-2">
          <div class="text-3xl animate-bounce-gentle">
            {{ feedbackType === 'success' ? '✅' : '❌' }}
          </div>
          <p class="text-sm font-medium" 
             :class="feedbackType === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ feedbackMessage }}
          </p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, nextTick, onMounted } from 'vue'
import OrderStatus from './OrderStatus.vue'
import ProgressiveDisclosure from '../ui/ProgressiveDisclosure.vue'
import { useAnimations } from '../../utils/animations.js'
import { languageService } from '../../locales/index.js'
import { mapActions } from 'vuex'

export default {
  name: 'OrderCard',
  components: {
    OrderStatus,
    ProgressiveDisclosure
  },
  props: {
    order: {
      type: Object,
      required: true
    }
  },
  emits: ['action-triggered'],
  setup(props, { emit }) {
    const isLoading = ref(false)
    const showFeedback = ref(false)
    const feedbackType = ref('success')
    const feedbackMessage = ref('')
    const itemsList = ref(null)
    const totalAmount = ref(null)
    
    const { pulse, successPulse, ripple, staggerList } = useAnimations()

    onMounted(() => {
      // Stagger animate the items list
      if (itemsList.value) {
        const items = itemsList.value.querySelectorAll('div')
        staggerList(items, 100)
      }
    })

    const handleHover = () => {
      // Add subtle glow effect on hover
      if (totalAmount.value) {
        totalAmount.value.style.textShadow = '0 0 10px rgba(59, 130, 246, 0.3)'
      }
    }

    const handleHoverEnd = () => {
      if (totalAmount.value) {
        totalAmount.value.style.textShadow = ''
      }
    }

    const handleCardClick = () => {
      // Emit event to show expanded view
      emit('action-triggered', {
        action: 'view-details',
        orderId: props.order.id
      })
    }

    const showFeedbackMessage = (type, message, duration = 2000) => {
      feedbackType.value = type
      feedbackMessage.value = message
      showFeedback.value = true
      
      setTimeout(() => {
        showFeedback.value = false
      }, duration)
    }

    return {
      isLoading,
      showFeedback,
      feedbackType,
      feedbackMessage,
      itemsList,
      totalAmount,
      handleHover,
      handleHoverEnd,
      handleCardClick,
      showFeedbackMessage,
      pulse,
      successPulse,
      ripple
    }
  },
  methods: {
    ...mapActions('ui', ['openModal', 'showNotification']),
    
    formatDate(dateString) {
      return languageService.formatDate(dateString)
    },

    formatCurrency(amount) {
      return languageService.formatCurrency(amount)
    },
    
    handleKeydown(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        this.handleCardClick()
      }
    },

    handleImageError(event) {
      // Fallback image or placeholder
      event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiAyMkwyNCAxNEwzMiAyMlYzNEgxNlYyMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
    },
    
    async handleAction(action, event) {
      // Add ripple effect to button
      if (event && event.target) {
        this.ripple(event.target, event)
      }

      this.isLoading = true

      try {
        // For critical actions, show confirmation modal
        if (action === 'cancel' || action === 'return') {
          this.openModal({
            modalName: 'actionConfirmation',
            data: {
              action,
              orderId: this.order.id,
              orderData: this.order
            }
          })
        } else if (action === 'track') {
          // For non-critical actions, show tracking info directly
          this.showTrackingInfo()
        } else {
          // Emit for other actions
          this.$emit('action-triggered', {
            action,
            orderId: this.order.id,
            data: {
              reason: 'Manual action from order management'
            }
          })
        }

        // Show success feedback
        this.showFeedbackMessage('success', this.$t('actions.processing'))
        
        // Add success pulse animation
        if (this.totalAmount) {
          this.successPulse(this.totalAmount)
        }

      } catch (error) {
        console.error('Action failed:', error)
        this.showFeedbackMessage('error', this.$t('actions.error'))
      } finally {
        setTimeout(() => {
          this.isLoading = false
        }, 1000)
      }
    },
    
    showTrackingInfo() {
      this.showNotification({
        type: 'info',
        message: `📦 ${this.$t('orders.details.tracking')}: ${this.order.trackingNumber} ${this.$t('orders.details.via')} ${this.order.carrier}`,
        duration: 8000
      })
    }
  }
}
</script>

<style scoped>
/* Enhanced hover effects */
.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.dark .order-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

/* Smooth focus styles */
.order-card:focus {
  @apply outline-none ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800;
}

/* Button hover animations */
.btn-enhanced:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dark .btn-enhanced:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.btn-enhanced:active {
  transform: translateY(0);
}

/* Custom animations for specific elements */
@keyframes bounce-gentle {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

.animate-bounce-gentle {
  animation: bounce-gentle 0.6s ease-in-out;
}

/* Loading spinner enhancement */
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin-slow 1s linear infinite;
}

/* Image hover effects */
img {
  transition: all 0.3s ease;
}

img:hover {
  filter: brightness(1.1) contrast(1.05);
}

/* Progressive disclosure smooth animations */
.progressive-disclosure {
  overflow: hidden;
}

/* Stagger animation for items */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.order-card .space-y-2 > div {
  animation: slideInUp 0.3s ease-out forwards;
  opacity: 0;
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .order-card,
  .btn-enhanced,
  img,
  * {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .order-card {
    @apply border-2 border-black dark:border-white;
  }
  
  .btn-enhanced {
    @apply border-2 border-current;
  }
}
</style>
