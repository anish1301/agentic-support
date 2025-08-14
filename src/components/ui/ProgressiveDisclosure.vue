<template>
  <div class="progressive-disclosure">
    <!-- Always visible content -->
    <div class="basic-content">
      <slot name="basic" />
    </div>

    <!-- Expandable advanced content -->
    <div v-if="showAdvanced || isExpanded" class="advanced-content">
      <!-- Show More/Less Toggle -->
      <button
        v-if="hasAdvancedContent"
        @click="toggleExpanded"
        @keydown="handleKeydown"
        :aria-expanded="isExpanded"
        :aria-controls="advancedContentId"
        :aria-label="isExpanded ? $t('a11y.collapseSection') : $t('a11y.expandSection')"
        class="w-full flex items-center justify-between py-2 px-3 text-left text-sm font-medium 
               text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 
               hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200
               focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
               dark:focus:ring-offset-gray-800 mb-3"
        :class="{ 'mb-0': !isExpanded }"
      >
        <span class="flex items-center space-x-2">
          <svg
            class="w-4 h-4 transition-transform duration-200"
            :class="{ 'rotate-90': isExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span>{{ toggleText }}</span>
        </span>
        <span v-if="badge" class="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
          {{ badge }}
        </span>
      </button>

      <!-- Advanced content with smooth transition -->
      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
        enter-to-class="opacity-100 transform translate-y-0 max-h-screen"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 transform translate-y-0 max-h-screen"
        leave-to-class="opacity-0 transform -translate-y-2 max-h-0"
      >
        <div
          v-show="isExpanded"
          :id="advancedContentId"
          class="advanced-section overflow-hidden"
          role="region"
          :aria-labelledby="toggleButtonId"
        >
          <div class="space-y-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <slot name="advanced" />
            
            <!-- Progressive steps if configured -->
            <div v-if="steps.length > 0" class="space-y-3">
              <div v-for="(step, index) in visibleSteps" :key="index" class="step-item">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                       :class="getStepClasses(step, index)">
                    <span v-if="step.completed">✓</span>
                    <span v-else>{{ index + 1 }}</span>
                  </div>
                  <div class="flex-1">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {{ step.title }}
                    </h4>
                    <p v-if="step.description" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {{ step.description }}
                    </p>
                    <!-- Step content -->
                    <div v-if="step.active && step.content" class="mt-3">
                      <component :is="step.content" v-bind="step.props" />
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Show more steps button -->
              <button
                v-if="hasMoreSteps"
                @click="showMoreSteps"
                class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 
                       dark:hover:text-primary-300 font-medium focus:outline-none focus:underline"
              >
                {{ $t('app.showMore') }} ({{ remainingStepsCount }} {{ $t('app.more') }})
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue'

export default {
  name: 'ProgressiveDisclosure',
  props: {
    // Initial expanded state
    expanded: {
      type: Boolean,
      default: false
    },
    // Always show advanced content (no toggle)
    showAdvanced: {
      type: Boolean,
      default: false
    },
    // Toggle button text
    expandText: {
      type: String,
      default: 'Show advanced options'
    },
    collapseText: {
      type: String,
      default: 'Hide advanced options'
    },
    // Badge text next to toggle
    badge: {
      type: String,
      default: null
    },
    // Progressive steps configuration
    steps: {
      type: Array,
      default: () => []
    },
    // How many steps to show initially
    initialStepsCount: {
      type: Number,
      default: 3
    },
    // Auto-expand on certain conditions
    expandWhen: {
      type: [Function, Boolean],
      default: null
    }
  },
  emits: ['expanded', 'collapsed'],
  setup(props, { emit, slots }) {
    const isExpanded = ref(props.expanded)
    const visibleStepsCount = ref(props.initialStepsCount)
    const advancedContentId = `advanced-content-${Math.random().toString(36).substr(2, 9)}`
    const toggleButtonId = `toggle-button-${Math.random().toString(36).substr(2, 9)}`

    const hasAdvancedContent = computed(() => {
      return !props.showAdvanced && (slots.advanced || props.steps.length > 0)
    })

    const toggleText = computed(() => {
      return isExpanded.value ? props.collapseText : props.expandText
    })

    const visibleSteps = computed(() => {
      return props.steps.slice(0, visibleStepsCount.value)
    })

    const hasMoreSteps = computed(() => {
      return props.steps.length > visibleStepsCount.value
    })

    const remainingStepsCount = computed(() => {
      return props.steps.length - visibleStepsCount.value
    })

    // Watch for expandWhen condition changes
    watch(
      () => props.expandWhen,
      (condition) => {
        if (typeof condition === 'function') {
          if (condition()) {
            isExpanded.value = true
          }
        } else if (typeof condition === 'boolean' && condition) {
          isExpanded.value = true
        }
      },
      { immediate: true }
    )

    const toggleExpanded = async () => {
      isExpanded.value = !isExpanded.value
      
      if (isExpanded.value) {
        emit('expanded')
        // Focus management for accessibility
        await nextTick()
        const advancedContent = document.getElementById(advancedContentId)
        if (advancedContent) {
          const firstFocusable = advancedContent.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          if (firstFocusable) {
            firstFocusable.focus()
          }
        }
      } else {
        emit('collapsed')
      }
    }

    const showMoreSteps = () => {
      visibleStepsCount.value = Math.min(
        visibleStepsCount.value + props.initialStepsCount,
        props.steps.length
      )
    }

    const getStepClasses = (step, index) => {
      if (step.completed) {
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
      } else if (step.active) {
        return 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300'
      } else {
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      }
    }

    const handleKeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleExpanded()
      }
    }

    return {
      isExpanded,
      advancedContentId,
      toggleButtonId,
      hasAdvancedContent,
      toggleText,
      visibleSteps,
      hasMoreSteps,
      remainingStepsCount,
      toggleExpanded,
      showMoreSteps,
      getStepClasses,
      handleKeydown
    }
  }
}
</script>

<style scoped>
.progressive-disclosure {
  @apply space-y-0;
}

.step-item {
  @apply transition-all duration-200 ease-in-out;
}

.step-item:hover {
  @apply bg-gray-50 dark:bg-gray-700 rounded-lg p-2 -m-2;
}

/* Smooth height transitions */
.advanced-section {
  transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
}
</style>
