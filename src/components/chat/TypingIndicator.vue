<template>
  <div class="flex justify-start mb-4">
    <div class="chat-bubble chat-bubble-agent">
      <div class="flex items-center space-x-2">
        <div class="flex space-x-1">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
        <span class="text-sm text-gray-500">AI agent is typing...</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TypingIndicator'
}
</script>
