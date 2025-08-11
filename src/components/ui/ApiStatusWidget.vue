<template>
  <div class="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
    <h3 class="font-semibold mb-2">API Status</h3>
    <div class="space-y-2 text-sm">
      <div class="flex items-center space-x-2">
        <div 
          :class="[
            'w-3 h-3 rounded-full',
            backendStatus === 'connected' ? 'bg-green-500' : 
            backendStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          ]"
        ></div>
        <span>Backend: {{ backendStatus }}</span>
        <button 
          @click="testBackend" 
          class="text-blue-600 hover:text-blue-800 text-xs underline"
        >
          Test
        </button>
      </div>
      <div class="flex items-center space-x-2">
        <div 
          :class="[
            'w-3 h-3 rounded-full',
            apiStatus === 'connected' ? 'bg-green-500' : 
            apiStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          ]"
        ></div>
        <span>API: {{ apiStatus }}</span>
        <button 
          @click="testApi" 
          class="text-blue-600 hover:text-blue-800 text-xs underline"
        >
          Test
        </button>
      </div>
    </div>
    <div v-if="lastError" class="mt-2 text-xs text-red-600">
      Error: {{ lastError }}
    </div>
  </div>
</template>

<script>
import apiService from '../../services/apiService'

export default {
  name: 'ApiStatusWidget',
  data() {
    return {
      backendStatus: 'checking',
      apiStatus: 'checking',
      lastError: null
    }
  },
  async mounted() {
    await this.checkConnections()
  },
  methods: {
    async checkConnections() {
      await Promise.all([
        this.testBackend(),
        this.testApi()
      ])
    },
    
    async testBackend() {
      try {
        const response = await fetch('http://localhost:3002/health')
        if (response.ok) {
          this.backendStatus = 'connected'
          this.lastError = null
        } else {
          this.backendStatus = 'error'
          this.lastError = `Backend returned ${response.status}`
        }
      } catch (error) {
        this.backendStatus = 'error'
        this.lastError = `Backend: ${error.message}`
        console.error('Backend connection failed:', error)
      }
    },

    async testApi() {
      try {
        await apiService.healthCheck()
        this.apiStatus = 'connected'
        if (!this.lastError) this.lastError = null
      } catch (error) {
        this.apiStatus = 'error'
        this.lastError = `API: ${error.message}`
        console.error('API connection failed:', error)
      }
    }
  }
}
</script>
