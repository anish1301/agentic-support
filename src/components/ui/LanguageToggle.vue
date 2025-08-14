<template>
  <div class="relative" ref="dropdownRef">
    <!-- Language Toggle Button -->
    <button
      @click="toggleDropdown"
      @keydown="handleKeydown"
      :aria-label="$t('a11y.changeLanguage', { current: currentLanguage?.name })"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      class="flex items-center space-x-2 p-2 rounded-lg text-gray-600 dark:text-gray-300 
             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 
             focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
             dark:focus:ring-offset-gray-800"
    >
      <span class="text-lg" :aria-hidden="true">{{ currentLanguage?.flag }}</span>
      <span class="hidden sm:block text-sm font-medium">{{ currentLanguage?.name }}</span>
      <svg 
        class="w-4 h-4 transition-transform duration-200" 
        :class="{ 'rotate-180': isOpen }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
               border border-gray-200 dark:border-gray-700 z-50 py-1"
        role="menu"
        :aria-labelledby="$attrs.id || 'language-toggle'"
      >
        <button
          v-for="(language, index) in availableLanguages"
          :key="language.code"
          @click="selectLanguage(language.code)"
          @keydown="handleOptionKeydown($event, index)"
          :class="[
            'w-full flex items-center space-x-3 px-4 py-2 text-left text-sm transition-colors duration-150',
            language.code === currentLocale 
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
            'focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700'
          ]"
          role="menuitem"
          :aria-selected="language.code === currentLocale"
        >
          <span class="text-base" :aria-hidden="true">{{ language.flag }}</span>
          <span>{{ language.name }}</span>
          <svg
            v-if="language.code === currentLocale"
            class="w-4 h-4 ml-auto text-primary-600 dark:text-primary-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { languageService } from '../../locales/index.js'

export default {
  name: 'LanguageToggle',
  setup() {
    const isOpen = ref(false)
    const dropdownRef = ref(null)
    
    const availableLanguages = computed(() => languageService.availableLocales)
    const currentLocale = computed(() => languageService.currentLocale)
    const currentLanguage = computed(() => languageService.getCurrentLanguageInfo())

    // Close dropdown when clicking outside
    onClickOutside(dropdownRef, () => {
      isOpen.value = false
    })

    const toggleDropdown = () => {
      isOpen.value = !isOpen.value
    }

    const selectLanguage = (locale) => {
      if (languageService.setLanguage(locale)) {
        isOpen.value = false
        
        // Emit language change event for components that need to react
        window.dispatchEvent(new CustomEvent('language-changed', { 
          detail: { locale, language: languageService.getCurrentLanguageInfo() } 
        }))
      }
    }

    // Keyboard navigation
    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        isOpen.value = false
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleDropdown()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        isOpen.value = true
        // Focus first option
        setTimeout(() => {
          const firstOption = dropdownRef.value?.querySelector('[role="menuitem"]')
          firstOption?.focus()
        }, 0)
      }
    }

    const handleOptionKeydown = (event, index) => {
      const options = dropdownRef.value?.querySelectorAll('[role="menuitem"]')
      
      if (event.key === 'Escape') {
        isOpen.value = false
        dropdownRef.value?.querySelector('button')?.focus()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        const nextIndex = (index + 1) % options.length
        options[nextIndex]?.focus()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        const prevIndex = index === 0 ? options.length - 1 : index - 1
        options[prevIndex]?.focus()
      } else if (event.key === 'Home') {
        event.preventDefault()
        options[0]?.focus()
      } else if (event.key === 'End') {
        event.preventDefault()
        options[options.length - 1]?.focus()
      }
    }

    return {
      isOpen,
      dropdownRef,
      availableLanguages,
      currentLocale,
      currentLanguage,
      toggleDropdown,
      selectLanguage,
      handleKeydown,
      handleOptionKeydown
    }
  }
}
</script>
