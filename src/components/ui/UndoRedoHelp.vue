<!--
  Undo/Redo Help Tooltip
  Shows users how to use undo/redo functionality
-->
<template>
  <div 
    v-if="showHelp"
    class="fixed bottom-20 right-6 z-30 max-w-xs"
  >
    <div class="bg-gray-900 text-white text-sm rounded-lg p-4 shadow-xl">
      <div class="flex items-start justify-between mb-2">
        <h4 class="font-semibold">💡 Undo/Redo Help</h4>
        <button 
          @click="dismissHelp"
          class="text-gray-400 hover:text-white ml-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="space-y-2 text-xs">
        <p><strong>Made a mistake?</strong> No problem!</p>
        
        <div class="space-y-1">
          <p>• <kbd class="bg-gray-700 px-1 rounded">Ctrl+Z</kbd> to undo</p>
          <p>• <kbd class="bg-gray-700 px-1 rounded">Ctrl+Shift+Z</kbd> to redo</p>
          <p>• Or use the floating buttons →</p>
        </div>
        
        <p class="text-gray-300 mt-2">
          Works for order cancellations, returns, and status changes.
        </p>
      </div>
      
      <!-- Arrow pointing to undo/redo buttons -->
      <div class="absolute right-0 top-1/2 transform translate-x-2 -translate-y-1/2">
        <svg class="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.41z"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UndoRedoHelp',
  data() {
    return {
      showHelp: false
    }
  },
  
  mounted() {
    // Show help after a delay if user hasn't seen it before
    setTimeout(() => {
      if (!this.hasSeenUndoHelp()) {
        this.showHelp = true
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          this.dismissHelp()
        }, 10000)
      }
    }, 5000)
  },
  
  methods: {
    hasSeenUndoHelp() {
      return localStorage.getItem('richpanel_seen_undo_help') === 'true'
    },
    
    dismissHelp() {
      this.showHelp = false
      localStorage.setItem('richpanel_seen_undo_help', 'true')
    }
  }
}
</script>

<style scoped>
kbd {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style>
