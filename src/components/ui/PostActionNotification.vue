<!--
  Post-Action Notification
  Shows a toast notification after order actions with undo option
-->
<template>
  <transition
    enter-active-class="transform transition duration-300 ease-out"
    enter-from-class="translate-y-2 opacity-0 scale-95"
    enter-to-class="translate-y-0 opacity-100 scale-100"
    leave-active-class="transform transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100 scale-100"
    leave-to-class="translate-y-2 opacity-0 scale-95"
  >
    <div
      v-if="show"
      class="fixed top-4 right-4 z-50 max-w-sm"
    >
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div class="flex items-start space-x-3">
          <!-- Success Icon -->
          <div class="flex-shrink-0">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>

          <!-- Content -->
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900">
              {{ title }}
            </p>
            <p class="text-xs text-gray-600 mt-1">
              {{ message }}
            </p>

            <!-- Action Buttons -->
            <div class="mt-3 flex items-center space-x-2">
              <button
                v-if="showUndo && canUndo"
                @click="handleUndo"
                class="text-xs font-medium text-blue-600 hover:text-blue-500"
              >
                Undo Action
              </button>
              <button
                @click="dismiss"
                class="text-xs font-medium text-gray-500 hover:text-gray-400"
              >
                Dismiss
              </button>
            </div>
          </div>

          <!-- Close Button -->
          <button
            @click="dismiss"
            class="flex-shrink-0 text-gray-400 hover:text-gray-500"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'PostActionNotification',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    orderId: {
      type: String,
      required: true
    },
    showUndo: {
      type: Boolean,
      default: true
    }
  },

  computed: {
    canUndo() {
      const undoHistory = this.$store.helpers?.getUndoHistory() || []
      return undoHistory.some(entry => entry.orderId === this.orderId)
    }
  },

  mounted() {
    // Auto-dismiss after 8 seconds
    if (this.show) {
      setTimeout(() => {
        this.dismiss()
      }, 8000)
    }
  },

  methods: {
    handleUndo() {
      this.$emit('undo')
      this.dismiss()
    },

    dismiss() {
      this.$emit('dismiss')
    }
  }
}
</script>
