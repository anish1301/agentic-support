// Vue 3 animation utilities and micro-interactions
import { ref, nextTick } from 'vue'

// Animation configuration
export const ANIMATION_CONFIG = {
  // Durations (in ms)
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 750
  },
  
  // Easing functions
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }
}

// Vue transition classes
export const TRANSITION_CLASSES = {
  // Fade transitions
  fade: {
    enterActiveClass: 'transition-opacity duration-300 ease-out',
    leaveActiveClass: 'transition-opacity duration-200 ease-in',
    enterFromClass: 'opacity-0',
    enterToClass: 'opacity-100',
    leaveFromClass: 'opacity-100',
    leaveToClass: 'opacity-0'
  },

  // Slide transitions
  slideDown: {
    enterActiveClass: 'transition-all duration-300 ease-out',
    leaveActiveClass: 'transition-all duration-200 ease-in',
    enterFromClass: 'opacity-0 transform -translate-y-2',
    enterToClass: 'opacity-100 transform translate-y-0',
    leaveFromClass: 'opacity-100 transform translate-y-0',
    leaveToClass: 'opacity-0 transform -translate-y-2'
  },

  slideUp: {
    enterActiveClass: 'transition-all duration-300 ease-out',
    leaveActiveClass: 'transition-all duration-200 ease-in',
    enterFromClass: 'opacity-0 transform translate-y-2',
    enterToClass: 'opacity-100 transform translate-y-0',
    leaveFromClass: 'opacity-100 transform translate-y-0',
    leaveToClass: 'opacity-0 transform translate-y-2'
  },

  slideRight: {
    enterActiveClass: 'transition-all duration-300 ease-out',
    leaveActiveClass: 'transition-all duration-200 ease-in',
    enterFromClass: 'opacity-0 transform -translate-x-4',
    enterToClass: 'opacity-100 transform translate-x-0',
    leaveFromClass: 'opacity-100 transform translate-x-0',
    leaveToClass: 'opacity-0 transform -translate-x-4'
  },

  // Scale transitions
  scale: {
    enterActiveClass: 'transition-all duration-200 ease-out',
    leaveActiveClass: 'transition-all duration-150 ease-in',
    enterFromClass: 'opacity-0 transform scale-95',
    enterToClass: 'opacity-100 transform scale-100',
    leaveFromClass: 'opacity-100 transform scale-100',
    leaveToClass: 'opacity-0 transform scale-95'
  },

  // Bounce scale
  bounceScale: {
    enterActiveClass: 'transition-all duration-400 ease-out',
    leaveActiveClass: 'transition-all duration-200 ease-in',
    enterFromClass: 'opacity-0 transform scale-50',
    enterToClass: 'opacity-100 transform scale-100',
    leaveFromClass: 'opacity-100 transform scale-100',
    leaveToClass: 'opacity-0 transform scale-95'
  }
}

// Micro-interaction utility class
export class MicroInteractions {
  // Pulse animation for buttons
  static pulse(element) {
    element.style.transform = 'scale(0.95)'
    element.style.transition = 'transform 0.1s ease-out'
    
    setTimeout(() => {
      element.style.transform = 'scale(1)'
      element.style.transition = 'transform 0.1s ease-in'
    }, 100)
  }

  // Shake animation for errors
  static shake(element) {
    element.style.animation = 'shake 0.5s ease-in-out'
    
    setTimeout(() => {
      element.style.animation = ''
    }, 500)
  }

  // Success check animation
  static successPulse(element) {
    element.style.transform = 'scale(1.1)'
    element.style.transition = 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    
    setTimeout(() => {
      element.style.transform = 'scale(1)'
    }, 200)
  }

  // Ripple effect
  static ripple(element, event) {
    const rect = element.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    
    const ripple = document.createElement('div')
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-animation 0.6s linear;
      pointer-events: none;
      z-index: 1;
    `
    
    element.style.position = 'relative'
    element.style.overflow = 'hidden'
    element.appendChild(ripple)
    
    setTimeout(() => {
      ripple.remove()
    }, 600)
  }

  // Smooth height animation
  static animateHeight(element, fromHeight, toHeight, duration = 300) {
    element.style.height = fromHeight + 'px'
    element.style.transition = `height ${duration}ms ease-out`
    
    setTimeout(() => {
      element.style.height = toHeight + 'px'
    }, 10)
    
    setTimeout(() => {
      element.style.height = ''
      element.style.transition = ''
    }, duration)
  }

  // Stagger animation for lists
  static staggerList(elements, delay = 100) {
    elements.forEach((element, index) => {
      element.style.opacity = '0'
      element.style.transform = 'translateY(20px)'
      
      setTimeout(() => {
        element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
        element.style.opacity = '1'
        element.style.transform = 'translateY(0)'
      }, index * delay)
    })
  }

  // Loading shimmer effect
  static shimmer(element) {
    element.style.background = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)'
    element.style.backgroundSize = '200% 100%'
    element.style.animation = 'shimmer 1.5s infinite'
  }

  // Smooth scroll to element
  static smoothScrollTo(element, offset = 0) {
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    const offsetPosition = elementPosition - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }

  // Count up animation for numbers
  static countUp(element, start, end, duration = 1000) {
    const range = end - start
    const increment = range / (duration / 16) // 60 FPS
    let current = start

    const timer = setInterval(() => {
      current += increment
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        current = end
        clearInterval(timer)
      }
      element.textContent = Math.round(current)
    }, 16)
  }

  // Typewriter effect
  static typewriter(element, text, speed = 50) {
    element.textContent = ''
    let i = 0
    
    const timer = setInterval(() => {
      element.textContent += text.charAt(i)
      i++
      
      if (i >= text.length) {
        clearInterval(timer)
      }
    }, speed)
  }

  // Highlight flash effect
  static highlight(element, color = 'rgba(255, 235, 59, 0.5)') {
    const originalBg = element.style.backgroundColor
    element.style.backgroundColor = color
    element.style.transition = 'background-color 0.3s ease-out'
    
    setTimeout(() => {
      element.style.backgroundColor = originalBg
    }, 600)
  }
}

// Vue composable for animations
export function useAnimations() {
  const isAnimating = ref(false)

  const animate = async (animationFn, duration = 300) => {
    if (isAnimating.value) return
    
    isAnimating.value = true
    
    try {
      await animationFn()
      await new Promise(resolve => setTimeout(resolve, duration))
    } finally {
      isAnimating.value = false
    }
  }

  const fadeIn = (element, duration = 300) => {
    return animate(() => {
      element.style.opacity = '0'
      element.style.transition = `opacity ${duration}ms ease-out`
      
      return nextTick().then(() => {
        element.style.opacity = '1'
      })
    }, duration)
  }

  const slideIn = (element, direction = 'down', duration = 300) => {
    const transforms = {
      down: 'translateY(-20px)',
      up: 'translateY(20px)',
      left: 'translateX(20px)',
      right: 'translateX(-20px)'
    }

    return animate(() => {
      element.style.opacity = '0'
      element.style.transform = transforms[direction]
      element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`
      
      return nextTick().then(() => {
        element.style.opacity = '1'
        element.style.transform = 'translate(0)'
      })
    }, duration)
  }

  return {
    isAnimating,
    animate,
    fadeIn,
    slideIn,
    ...MicroInteractions
  }
}

// CSS Keyframes (to be added to global styles)
export const CSS_KEYFRAMES = `
@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 40px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes slideInRight {
  from {
    transform: translate3d(100%, 0, 0);
    visibility: visible;
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    transform: translate3d(0, -30px, 0) scaleY(1.1);
  }
  70% {
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    transform: translate3d(0, -15px, 0) scaleY(1.05);
  }
  90% {
    transform: translate3d(0, -4px, 0) scaleY(1.02);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
  }
}
`
