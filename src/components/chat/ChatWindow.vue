<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
    <!-- Chat Header -->
    <div class="p-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">AI Support Agent</h3>
            <p class="text-sm text-gray-500">Online • Ready to help</p>
          </div>
        </div>
        
        <button 
          @click="clearChat"
          class="text-gray-400 hover:text-gray-600 transition-colors"
          title="Clear chat"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Messages Area -->
    <div 
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
      style="max-height: calc(600px - 120px - 80px);"
    >
      <MessageBubble 
        v-for="message in messages" 
        :key="message.id"
        :message="message"
      />
      
      <!-- Typing Indicator -->
      <TypingIndicator v-if="isTyping" />
    </div>

    <!-- Message Input -->
    <MessageInput @send-message="handleSendMessage" />
  </div>
</template>

<script>
import MessageBubble from './MessageBubble.vue'
import MessageInput from './MessageInput.vue'
import TypingIndicator from './TypingIndicator.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'ChatWindow',
  components: {
    MessageBubble,
    MessageInput,
    TypingIndicator
  },
  computed: {
    ...mapGetters({
      messages: 'chat/chatMessages',
      isTyping: 'chat/isAgentTyping'
    })
  },
  methods: {
    handleSendMessage(content) {
      this.$store.dispatch('chat/sendMessage', { content, type: 'user' })
    },
    
    clearChat() {
      this.$store.dispatch('chat/clearChat')
      // Add welcome message after clearing
      setTimeout(() => {
        this.$store.dispatch('chat/addAgentMessage', 
          "👋 Hello! I'm your AI support agent. How can I assist you today?"
        )
      }, 500)
    },
    
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    }
  },
  watch: {
    messages: {
      handler() {
        this.scrollToBottom()
      },
      deep: true
    },
    isTyping() {
      this.scrollToBottom()
    }
  },
  mounted() {
    this.scrollToBottom()
  }
}
</script>
