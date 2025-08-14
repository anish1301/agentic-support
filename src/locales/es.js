export default {
  // App
  app: {
    title: 'Agente de IA Richpanel',
    subtitle: 'Soporte Autónomo al Cliente',
    loading: 'Cargando...',
    error: 'Ocurrió un error',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior'
  },

  // Navigation
  nav: {
    chatSupport: 'Chat de Soporte',
    orders: 'Pedidos',
    dashboard: 'Panel'
  },

  // Theme
  theme: {
    toggle: 'Cambiar tema',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema'
  },

  // Chat
  chat: {
    title: 'Chat de Soporte IA',
    placeholder: 'Escribe tu mensaje aquí...',
    send: 'Enviar mensaje',
    typing: 'IA está escribiendo...',
    connecting: 'Conectando con agente IA...',
    connected: 'Agente IA Activo',
    disconnected: 'Agente IA Desconectado',
    retry: 'Reintentar conexión',
    welcome: "👋 ¡Hola! Soy tu agente de soporte IA. Puedo ayudarte con cancelaciones de pedidos, seguimiento, devoluciones y cualquier pregunta que tengas. ¿Cómo puedo asistirte hoy?",
    errorConnection: "⚠️ Tengo problemas para conectarme a mis servicios. Algunas funciones pueden no funcionar correctamente.",
    messageError: 'Error al enviar mensaje. Por favor, inténtalo de nuevo.',
    clearHistory: 'Limpiar historial',
    exportChat: 'Exportar chat',
    voiceInput: 'Entrada de voz',
    attachFile: 'Adjuntar archivo'
  },

  // Orders
  orders: {
    title: 'Pedidos',
    noOrders: 'No se encontraron pedidos',
    loading: 'Cargando pedidos...',
    searchPlaceholder: 'Buscar pedidos...',
    filterBy: 'Filtrar por',
    sortBy: 'Ordenar por',
    status: {
      pending: 'Pendiente',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      returned: 'Devuelto',
      refunded: 'Reembolsado'
    },
    actions: {
      cancel: 'Cancelar Pedido',
      track: 'Rastrear Paquete',
      return: 'Devolver Pedido',
      refund: 'Solicitar Reembolso',
      reorder: 'Reordenar',
      viewDetails: 'Ver Detalles'
    },
    details: {
      orderNumber: 'Número de Pedido',
      orderDate: 'Fecha del Pedido',
      customer: 'Cliente',
      email: 'Correo',
      total: 'Total',
      items: 'Artículos',
      shipping: 'Envío',
      tracking: 'Número de Seguimiento',
      estimatedDelivery: 'Entrega Estimada'
    }
  },

  // Actions & Confirmations
  actions: {
    confirm: 'Confirmar Acción',
    confirmCancel: '¿Estás seguro de que quieres cancelar este pedido?',
    confirmReturn: '¿Estás seguro de que quieres devolver este pedido?',
    confirmRefund: '¿Estás seguro de que quieres solicitar un reembolso?',
    processing: 'Procesando tu solicitud...',
    success: 'Acción completada exitosamente',
    error: 'Error al completar la acción',
    undo: 'Deshacer',
    redo: 'Rehacer',
    undoSuccess: 'Acción deshecha',
    redoSuccess: 'Acción rehecha'
  },

  // Accessibility
  a11y: {
    skipToMain: 'Saltar al contenido principal',
    openMenu: 'Abrir menú de navegación',
    closeMenu: 'Cerrar menú de navegación',
    expandSection: 'Expandir sección',
    collapseSection: 'Contraer sección',
    sortAscending: 'Ordenar ascendente',
    sortDescending: 'Ordenar descendente',
    currentPage: 'Página actual',
    goToPage: 'Ir a la página',
    loading: 'Cargando contenido',
    searchResults: 'Resultados de búsqueda',
    noResults: 'No se encontraron resultados',
    selectedItem: 'Elemento seleccionado',
    toggleVisibility: 'Alternar visibilidad'
  },

  // Forms
  forms: {
    required: 'Este campo es obligatorio',
    invalid: 'Por favor ingresa un valor válido',
    email: 'Por favor ingresa un email válido',
    phone: 'Por favor ingresa un teléfono válido',
    minLength: 'Mínimo {min} caracteres requeridos',
    maxLength: 'Máximo {max} caracteres permitidos',
    submit: 'Enviar',
    reset: 'Restablecer',
    clear: 'Limpiar'
  },

  // Status Messages
  status: {
    online: 'En línea',
    offline: 'Desconectado',
    connecting: 'Conectando...',
    syncing: 'Sincronizando...',
    saved: 'Guardado',
    unsaved: 'Cambios no guardados',
    error: 'Error ocurrido'
  },

  // Time & Dates
  time: {
    now: 'Ahora',
    today: 'Hoy',
    yesterday: 'Ayer',
    thisWeek: 'Esta semana',
    lastWeek: 'Semana pasada',
    thisMonth: 'Este mes',
    lastMonth: 'Mes pasado',
    daysAgo: 'Hace {days} días',
    hoursAgo: 'Hace {hours} horas',
    minutesAgo: 'Hace {minutes} minutos',
    secondsAgo: 'Hace un momento'
  }
}
