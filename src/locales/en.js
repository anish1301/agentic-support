export default {
  // App
  app: {
    title: 'Richpanel AI Agent',
    subtitle: 'Autonomous Customer Support',
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    showMore: 'Show more',
    more: 'more'
  },

  // Navigation
  nav: {
    main: 'Main navigation',
    chatSupport: 'Chat Support',
    orders: 'Orders',
    dashboard: 'Dashboard',
    mobileMenu: 'Mobile menu'
  },

  // Theme
  theme: {
    toggle: 'Toggle theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System'
  },

  // Chat
  chat: {
    title: 'AI Support Chat',
    placeholder: 'Type your message here...',
    send: 'Send message',
    typing: 'AI is typing...',
    connecting: 'Connecting to AI agent...',
    connected: 'AI Agent Active',
    disconnected: 'AI Agent Offline',
    retry: 'Retry connection',
    welcome: "👋 Hello! I'm your AI support agent. I can help you with order cancellations, tracking, returns, and any questions you have. How can I assist you today?",
    errorConnection: "⚠️ I'm having trouble connecting to my backend services. Some features may not work properly.",
    messageError: 'Failed to send message. Please try again.',
    clearHistory: 'Clear chat history',
    exportChat: 'Export chat',
    voiceInput: 'Voice input',
    attachFile: 'Attach file'
  },

  // Orders
  orders: {
    title: 'Orders',
    noOrders: 'No orders found',
    loading: 'Loading orders...',
    searchPlaceholder: 'Search orders...',
    filterBy: 'Filter by',
    sortBy: 'Sort by',
    status: {
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      returned: 'Returned',
      refunded: 'Refunded'
    },
    actions: {
      cancel: 'Cancel Order',
      track: 'Track Package',
      return: 'Return Order',
      refund: 'Request Refund',
      reorder: 'Reorder',
      viewDetails: 'View Details'
    },
    details: {
      orderNumber: 'Order #{number}',
      orderDate: 'Order Date',
      customer: 'Customer',
      email: 'Email',
      total: 'Total',
      items: 'Items',
      quantity: 'Qty',
      shipping: 'Shipping',
      tracking: 'Tracking',
      via: 'via',
      estimatedDelivery: 'Estimated Delivery'
    }
  },

  // Actions & Confirmations
  actions: {
    confirm: 'Confirm Action',
    confirmCancel: 'Are you sure you want to cancel this order?',
    confirmReturn: 'Are you sure you want to return this order?',
    confirmRefund: 'Are you sure you want to request a refund?',
    processing: 'Processing your request...',
    success: 'Action completed successfully',
    error: 'Failed to complete action',
    undo: 'Undo',
    redo: 'Redo',
    undoSuccess: 'Action undone',
    redoSuccess: 'Action redone'
  },

  // Accessibility
  a11y: {
    skipToMain: 'Skip to main content',
    openMenu: 'Open navigation menu',
    closeMenu: 'Close navigation menu',
    expandSection: 'Expand section',
    collapseSection: 'Collapse section',
    sortAscending: 'Sort ascending',
    sortDescending: 'Sort descending',
    currentPage: 'Current page',
    goToPage: 'Go to page',
    loading: 'Loading content',
    searchResults: 'Search results',
    noResults: 'No results found',
    selectedItem: 'Selected item',
    toggleVisibility: 'Toggle visibility',
    changeLanguage: 'Change language to {current}'
  },

  // Forms
  forms: {
    required: 'This field is required',
    invalid: 'Please enter a valid value',
    email: 'Please enter a valid email address',
    phone: 'Please enter a valid phone number',
    minLength: 'Minimum {min} characters required',
    maxLength: 'Maximum {max} characters allowed',
    submit: 'Submit',
    reset: 'Reset',
    clear: 'Clear'
  },

  // Status Messages
  status: {
    online: 'Online',
    offline: 'Offline',
    connecting: 'Connecting...',
    syncing: 'Syncing...',
    saved: 'Saved',
    unsaved: 'Unsaved changes',
    error: 'Error occurred'
  },

  // Time & Dates
  time: {
    now: 'Now',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This week',
    lastWeek: 'Last week',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    daysAgo: '{days} days ago',
    hoursAgo: '{hours} hours ago',
    minutesAgo: '{minutes} minutes ago',
    secondsAgo: 'Just now'
  }
}
