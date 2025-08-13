<template>
  <div class="p-4 border-t border-gray-200">
    <form @submit.prevent="sendMessage" class="flex space-x-2">
      <div class="flex-1 relative">
        <input
          v-model="inputMessage"
          type="text"
          placeholder="Type your message..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          :disabled="isProcessing"
          @keydown.enter.prevent="sendMessage"
          ref="messageInput"
        />
        
        <!-- Suggested Questions -->
        <div v-if="showSuggestions && suggestedQuestions.length" class="absolute bottom-full left-0 right-0 mb-2">
          <div class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 space-y-1 theme-transition">
            <p class="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">Suggested questions:</p>
            <button
              v-for="suggestion in suggestedQuestions"
              :key="suggestion"
              @click="selectSuggestion(suggestion)"
              class="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
      </div>
      
      <button
        type="submit"
        :disabled="!inputMessage.trim() || isProcessing"
        class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        <svg 
          v-if="!isProcessing"
          class="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
        </svg>
        <svg 
          v-else
          class="w-5 h-5 animate-spin" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span class="hidden sm:inline">
          {{ isProcessing ? 'Processing...' : 'Send' }}
        </span>
      </button>
    </form>
    
    <!-- Quick Actions -->
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="action in quickActions"
        :key="action"
        @click="selectSuggestion(action)"
        class="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
      >
        {{ action }}
      </button>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'MessageInput',
  data() {
    return {
      inputMessage: '',
      showSuggestions: false,
      suggestedQuestions: [
        'Cancel order ORD-12345',
        'Track my order ORD-12346',
        'Return order ORD-12347',
        'Where is my order?',
        'I want to cancel my recent order'
      ],
      quickActions: [
        'Track order',
        'Cancel order', 
        'Return item',
        'Order status',
        'Refund status'
      ]
    }
  },
  computed: {
    ...mapGetters({
      isProcessing: 'agent/isProcessing'
    })
  },
  methods: {
    sendMessage() {
      if (!this.inputMessage.trim() || this.isProcessing) return
      
      this.$emit('send-message', this.inputMessage.trim())
      this.inputMessage = ''
      this.showSuggestions = false
    },
    
    selectSuggestion(suggestion) {
      this.inputMessage = suggestion
      this.showSuggestions = false
      this.$nextTick(() => {
        this.$refs.messageInput.focus()
      })
    },
    
    handleInputFocus() {
      if (!this.inputMessage.trim()) {
        this.showSuggestions = true
      }
    },
    
    handleInputBlur() {
      // Delay hiding suggestions to allow clicking on them
      setTimeout(() => {
        this.showSuggestions = false
      }, 150)
    }
  },
  mounted() {
    // Focus on input when component mounts
    this.$nextTick(() => {
      this.$refs.messageInput.focus()
    })
  }
}
</script>
