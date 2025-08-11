<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
      <!-- Spinner -->
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600"></div>
      
      <!-- Loading Text -->
      <div class="text-center">
        <h3 class="text-lg font-medium text-gray-900">Processing...</h3>
        <p class="text-sm text-gray-500 mt-1">Please wait while we handle your request</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingOverlay'
}
</script>
