/**
 * Rate Limiting Utility for Undo/Redo Operations
 * Prevents abuse and manages operation counts per order
 */

class UndoRedoRateLimit {
  constructor() {
    this.maxOperations = 3 // Maximum operations per order
    this.rateLimitDelay = 2000 // 2 seconds between operations
    this.operationCounts = new Map() // Track operations per order
    this.lastActionTimes = new Map() // Track last action time per order
  }

  /**
   * Check if operation is allowed for an order
   */
  canPerformOperation(orderId) {
    const count = this.getOperationCount(orderId)
    const lastTime = this.getLastActionTime(orderId)
    const now = Date.now()

    // Check max operations limit
    if (count >= this.maxOperations) {
      return {
        allowed: false,
        reason: 'max_operations',
        message: `Maximum ${this.maxOperations} operations reached for this order`,
        remaining: 0
      }
    }

    // Check rate limit
    if (now - lastTime < this.rateLimitDelay) {
      const waitTime = Math.ceil((this.rateLimitDelay - (now - lastTime)) / 1000)
      return {
        allowed: false,
        reason: 'rate_limit',
        message: `Please wait ${waitTime}s before performing another action`,
        remaining: this.maxOperations - count
      }
    }

    return {
      allowed: true,
      remaining: this.maxOperations - count - 1
    }
  }

  /**
   * Record an operation for an order
   */
  recordOperation(orderId) {
    const currentCount = this.getOperationCount(orderId)
    const newCount = currentCount + 1

    // Store in localStorage for persistence
    localStorage.setItem(`undoRedo_count_${orderId}`, newCount.toString())
    localStorage.setItem(`undoRedo_time_${orderId}`, Date.now().toString())

    // Update in-memory cache
    this.operationCounts.set(orderId, newCount)
    this.lastActionTimes.set(orderId, Date.now())

    return {
      count: newCount,
      remaining: this.maxOperations - newCount
    }
  }

  /**
   * Get operation count for an order
   */
  getOperationCount(orderId) {
    // Check in-memory first
    if (this.operationCounts.has(orderId)) {
      return this.operationCounts.get(orderId)
    }

    // Check localStorage
    const stored = localStorage.getItem(`undoRedo_count_${orderId}`)
    const count = stored ? parseInt(stored) : 0
    
    // Cache in memory
    this.operationCounts.set(orderId, count)
    return count
  }

  /**
   * Get last action time for an order
   */
  getLastActionTime(orderId) {
    // Check in-memory first
    if (this.lastActionTimes.has(orderId)) {
      return this.lastActionTimes.get(orderId)
    }

    // Check localStorage
    const stored = localStorage.getItem(`undoRedo_time_${orderId}`)
    const time = stored ? parseInt(stored) : 0
    
    // Cache in memory
    this.lastActionTimes.set(orderId, time)
    return time
  }

  /**
   * Reset operations for an order (admin function)
   */
  resetOperations(orderId) {
    localStorage.removeItem(`undoRedo_count_${orderId}`)
    localStorage.removeItem(`undoRedo_time_${orderId}`)
    this.operationCounts.delete(orderId)
    this.lastActionTimes.delete(orderId)
  }

  /**
   * Get statistics for all orders
   */
  getStatistics() {
    const stats = {
      totalOrders: 0,
      totalOperations: 0,
      ordersAtLimit: 0,
      averageOperations: 0
    }

    // Get all orders with undo/redo data
    const orders = new Set()
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('undoRedo_count_')) {
        const orderId = key.replace('undoRedo_count_', '')
        orders.add(orderId)
      }
    }

    stats.totalOrders = orders.size

    orders.forEach(orderId => {
      const count = this.getOperationCount(orderId)
      stats.totalOperations += count
      
      if (count >= this.maxOperations) {
        stats.ordersAtLimit++
      }
    })

    stats.averageOperations = stats.totalOrders > 0 
      ? Math.round((stats.totalOperations / stats.totalOrders) * 100) / 100 
      : 0

    return stats
  }

  /**
   * Clean up old entries (older than 24 hours)
   */
  cleanup() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    const keysToRemove = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('undoRedo_time_')) {
        const timeStamp = parseInt(localStorage.getItem(key) || '0')
        if (timeStamp < oneDayAgo) {
          const orderId = key.replace('undoRedo_time_', '')
          keysToRemove.push(`undoRedo_count_${orderId}`)
          keysToRemove.push(`undoRedo_time_${orderId}`)
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })

    // Clear in-memory cache for cleaned items
    this.operationCounts.clear()
    this.lastActionTimes.clear()

    return keysToRemove.length / 2 // Return number of orders cleaned
  }
}

// Export singleton instance
export const undoRedoRateLimit = new UndoRedoRateLimit()

// Auto-cleanup on page load
undoRedoRateLimit.cleanup()

export default undoRedoRateLimit
