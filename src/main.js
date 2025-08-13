import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import store from './store'
import i18n from './locales/index.js'
import themeService from './services/themeService.js'

// Global error handler for uncaught promise rejections (mostly from browser extensions)
window.addEventListener('unhandledrejection', event => {
  // Suppress browser extension errors
  if (event.reason && event.reason.message && 
      event.reason.message.includes('message channel closed')) {
    console.debug('Suppressed browser extension error:', event.reason.message)
    event.preventDefault()
  }
})

// Initialize app
const app = createApp(App)

// Install plugins
app.use(store)
app.use(i18n)

// Global properties
app.config.globalProperties.$theme = themeService
app.config.globalProperties.$t = i18n.global.t

// Add meta theme-color for mobile browsers
const metaThemeColor = document.createElement('meta')
metaThemeColor.name = 'theme-color'
metaThemeColor.content = themeService.isDark.value ? '#1f2937' : '#ffffff'
document.head.appendChild(metaThemeColor)

// Add skip to main content link for accessibility
const skipLink = document.createElement('a')
skipLink.href = '#main-content'
skipLink.className = 'skip-link'
skipLink.textContent = 'Skip to main content'
skipLink.setAttribute('tabindex', '1')
document.body.insertBefore(skipLink, document.body.firstChild)

// Global error handler
app.config.errorHandler = (error, instance, info) => {
  console.error('Global error:', error, info)
  
  // Send error to analytics or error reporting service
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: error.toString(),
      fatal: false
    })
  }
}

// Mount app
app.mount('#app')
