import { ref, computed } from 'vue'
import { usePreferredColorScheme, useStorage } from '@vueuse/core'

class ThemeService {
  constructor() {
    // Use VueUse to detect system preference
    this.systemPreference = usePreferredColorScheme()
    
    // Store user preference (null means follow system)
    this.userPreference = useStorage('theme-preference', null)
    
    // Reactive theme state
    this.isDark = computed(() => {
      if (this.userPreference.value === null) {
        return this.systemPreference.value === 'dark'
      }
      return this.userPreference.value === 'dark'
    })

    // Initialize theme
    this.applyTheme()
    
    // Watch for changes
    this.watchThemeChanges()
  }

  watchThemeChanges() {
    // Watch system preference changes
    this.systemPreference.value && this.applyTheme()
    
    // Watch user preference changes
    if (this.userPreference.value !== null) {
      this.applyTheme()
    }
  }

  applyTheme() {
    const root = document.documentElement
    
    if (this.isDark.value) {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', this.isDark.value ? '#1f2937' : '#ffffff')
    }
  }

  toggleTheme() {
    const currentTheme = this.isDark.value ? 'dark' : 'light'
    this.userPreference.value = currentTheme === 'dark' ? 'light' : 'dark'
    this.applyTheme()
  }

  setTheme(theme) {
    // theme can be 'light', 'dark', or 'system'
    if (theme === 'system') {
      this.userPreference.value = null
    } else {
      this.userPreference.value = theme
    }
    this.applyTheme()
  }

  getCurrentTheme() {
    if (this.userPreference.value === null) {
      return 'system'
    }
    return this.userPreference.value
  }

  getThemeOptions() {
    return [
      { value: 'light', label: 'Light', icon: '☀️' },
      { value: 'dark', label: 'Dark', icon: '🌙' },
      { value: 'system', label: 'System', icon: '💻' }
    ]
  }
}

// Create singleton instance
export const themeService = new ThemeService()
export default themeService
