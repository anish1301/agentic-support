import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import store from './store'

// Global error handler for uncaught promise rejections (mostly from browser extensions)
window.addEventListener('unhandledrejection', event => {
  // Suppress browser extension errors
  if (event.reason && event.reason.message && 
      event.reason.message.includes('message channel closed')) {
    console.debug('Suppressed browser extension error:', event.reason.message)
    event.preventDefault()
  }
})

createApp(App).use(store).mount('#app')
