<template>
  <div 
    :class="[
      'flex mb-4',
      message.sender === 'customer' ? 'justify-end' : 'justify-start'
    ]"
  >
    <div 
      :class="[
        'chat-bubble',
        message.sender === 'customer' ? 'chat-bubble-user' : 'chat-bubble-agent'
      ]"
    >
      <!-- Message Content -->
      <div 
        class="text-sm leading-relaxed"
        v-html="formatMessage(message.content)"
      ></div>
      
      <!-- Timestamp -->
      <div 
        :class="[
          'text-xs mt-1 opacity-70',
          message.sender === 'customer' ? 'text-primary-100' : 'text-gray-500'
        ]"
      >
        {{ formatTimestamp(message.timestamp) }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MessageBubble',
  props: {
    message: {
      type: Object,
      required: true
    }
  },
  methods: {
    formatMessage(content) {
      // Convert markdown-like formatting to HTML
      return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/\n/g, '<br>') // Line breaks
        .replace(/📦|🚚|✅|❌|📤|📋/g, '<span class="text-lg">$&</span>') // Emojis
    },
    
    formatTimestamp(timestamp) {
      if (!timestamp) return ''
      
      const date = new Date(timestamp)
      const now = new Date()
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      
      if (diffInMinutes < 1) return 'Just now'
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      
      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) return `${diffInHours}h ago`
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }
}
</script>
