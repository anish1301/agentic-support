import { createI18n } from 'vue-i18n'
import { useStorage } from '@vueuse/core'

// Import language files
import en from './en.js'
import es from './es.js'
import fr from './fr.js'

// Supported languages
export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }
]

// Get browser language
const getBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage
  const langCode = browserLang.split('-')[0]
  return SUPPORTED_LOCALES.find(locale => locale.code === langCode)?.code || 'en'
}

// Create persistent locale storage
const savedLocale = useStorage('app-locale', getBrowserLanguage())

// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: savedLocale.value,
  fallbackLocale: 'en',
  globalInjection: true,
  messages: {
    en,
    es,
    fr
  }
})

// Language service
export class LanguageService {
  constructor(i18nInstance) {
    this.i18n = i18nInstance
    this.savedLocale = savedLocale
  }

  get currentLocale() {
    return this.i18n.global.locale.value
  }

  get availableLocales() {
    return SUPPORTED_LOCALES
  }

  setLanguage(locale) {
    if (SUPPORTED_LOCALES.find(l => l.code === locale)) {
      this.i18n.global.locale.value = locale
      this.savedLocale.value = locale
      
      // Update document language
      document.documentElement.lang = locale
      
      // Update document direction (for RTL languages in future)
      document.documentElement.dir = this.isRTL(locale) ? 'rtl' : 'ltr'
      
      return true
    }
    return false
  }

  isRTL(locale) {
    // Add RTL languages here when needed
    const rtlLocales = ['ar', 'he', 'fa', 'ur']
    return rtlLocales.includes(locale)
  }

  getCurrentLanguageInfo() {
    return SUPPORTED_LOCALES.find(lang => lang.code === this.currentLocale)
  }

  // Translation helpers
  t(key, params = {}) {
    return this.i18n.global.t(key, params)
  }

  te(key) {
    return this.i18n.global.te(key)
  }

  // Pluralization helper
  tc(key, choice, params = {}) {
    return this.i18n.global.tc(key, choice, params)
  }

  // Date and time formatting
  formatDate(date, options = {}) {
    const locale = this.currentLocale
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(new Date(date))
  }

  formatTime(date, options = {}) {
    const locale = this.currentLocale
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(new Date(date))
  }

  formatDateTime(date, options = {}) {
    const locale = this.currentLocale
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(new Date(date))
  }

  // Number formatting
  formatNumber(number, options = {}) {
    const locale = this.currentLocale
    return new Intl.NumberFormat(locale, options).format(number)
  }

  formatCurrency(amount, currency = 'USD', options = {}) {
    const locale = this.currentLocale
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...options
    }).format(amount)
  }

  // Relative time formatting
  formatRelativeTime(date) {
    const now = new Date()
    const targetDate = new Date(date)
    const diffInSeconds = Math.floor((now - targetDate) / 1000)

    if (diffInSeconds < 60) {
      return this.t('time.secondsAgo')
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return this.t('time.minutesAgo', { minutes })
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return this.t('time.hoursAgo', { hours })
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return this.t('time.daysAgo', { days })
    } else {
      return this.formatDate(date)
    }
  }
}

// Create language service instance
export const languageService = new LanguageService(i18n)

// Initialize document language
document.documentElement.lang = savedLocale.value

export default i18n
