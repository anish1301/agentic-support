<template>
  <div class="fixed top-4 right-4 z-50 space-y-2">
    <transition-group
      name="notification"
      tag="div"
      class="space-y-2"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'min-w-96 max-w-2xl w-auto bg-white dark:bg-gray-800 shadow-lg rounded-full pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden theme-transition',
          notificationClasses[notification.type] || notificationClasses.info
        ]"
      >
        <div class="px-6 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <component :is="getIcon(notification.type)" class="h-5 w-5" />
              </div>
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                {{ notification.message }}
              </p>
            </div>
            <div class="flex-shrink-0 ml-4">
              <button
                @click="removeNotification(notification.id)"
                class="bg-white dark:bg-gray-700 rounded-full inline-flex text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 theme-transition p-1"
              >
                <span class="sr-only">Close</span>
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'NotificationToast',
  computed: {
    ...mapGetters({
      notifications: 'ui/notifications'
    })
  },
  data() {
    return {
      notificationClasses: {
        success: 'ring-green-400/30 bg-green-50/50 dark:bg-green-900/20',
        error: 'ring-red-400/30 bg-red-50/50 dark:bg-red-900/20',
        warning: 'ring-yellow-400/30 bg-yellow-50/50 dark:bg-yellow-900/20',
        info: 'ring-blue-400/30 bg-blue-50/50 dark:bg-blue-900/20'
      }
    }
  },
  methods: {
    removeNotification(id) {
      this.$store.commit('ui/REMOVE_NOTIFICATION', id)
    },
    
    getIcon(type) {
      const icons = {
        success: {
          template: `
            <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          `
        },
        error: {
          template: `
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          `
        },
        warning: {
          template: `
            <svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.764 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          `
        },
        info: {
          template: `
            <svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          `
        }
      }
      
      return icons[type] || icons.info
    }
  }
}
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
