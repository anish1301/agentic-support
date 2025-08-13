export default {
  // App
  app: {
    title: 'Agent IA Richpanel',
    subtitle: 'Support Client Autonome',
    loading: 'Chargement...',
    error: 'Une erreur est survenue',
    retry: 'Réessayer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Sauvegarder',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent'
  },

  // Navigation
  nav: {
    chatSupport: 'Chat Support',
    orders: 'Commandes',
    dashboard: 'Tableau de bord'
  },

  // Theme
  theme: {
    toggle: 'Changer de thème',
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système'
  },

  // Chat
  chat: {
    title: 'Chat Support IA',
    placeholder: 'Tapez votre message ici...',
    send: 'Envoyer le message',
    typing: 'L\'IA tape...',
    connecting: 'Connexion à l\'agent IA...',
    connected: 'Agent IA Actif',
    disconnected: 'Agent IA Hors ligne',
    retry: 'Réessayer la connexion',
    welcome: "👋 Bonjour ! Je suis votre agent de support IA. Je peux vous aider avec les annulations de commandes, le suivi, les retours et toute question que vous pourriez avoir. Comment puis-je vous aider aujourd'hui ?",
    errorConnection: "⚠️ J'ai des difficultés à me connecter à mes services. Certaines fonctionnalités peuvent ne pas fonctionner correctement.",
    messageError: 'Échec de l\'envoi du message. Veuillez réessayer.',
    clearHistory: 'Effacer l\'historique',
    exportChat: 'Exporter le chat',
    voiceInput: 'Saisie vocale',
    attachFile: 'Joindre un fichier'
  },

  // Orders
  orders: {
    title: 'Commandes',
    noOrders: 'Aucune commande trouvée',
    loading: 'Chargement des commandes...',
    searchPlaceholder: 'Rechercher des commandes...',
    filterBy: 'Filtrer par',
    sortBy: 'Trier par',
    status: {
      pending: 'En attente',
      processing: 'En cours',
      shipped: 'Expédié',
      delivered: 'Livré',
      cancelled: 'Annulé',
      returned: 'Retourné',
      refunded: 'Remboursé'
    },
    actions: {
      cancel: 'Annuler la Commande',
      track: 'Suivre le Colis',
      return: 'Retourner la Commande',
      refund: 'Demander un Remboursement',
      reorder: 'Recommander',
      viewDetails: 'Voir les Détails'
    },
    details: {
      orderNumber: 'Numéro de Commande',
      orderDate: 'Date de Commande',
      customer: 'Client',
      email: 'Email',
      total: 'Total',
      items: 'Articles',
      shipping: 'Expédition',
      tracking: 'Numéro de Suivi',
      estimatedDelivery: 'Livraison Estimée'
    }
  },

  // Actions & Confirmations
  actions: {
    confirm: 'Confirmer l\'Action',
    confirmCancel: 'Êtes-vous sûr de vouloir annuler cette commande ?',
    confirmReturn: 'Êtes-vous sûr de vouloir retourner cette commande ?',
    confirmRefund: 'Êtes-vous sûr de vouloir demander un remboursement ?',
    processing: 'Traitement de votre demande...',
    success: 'Action terminée avec succès',
    error: 'Échec de l\'action',
    undo: 'Annuler',
    redo: 'Refaire',
    undoSuccess: 'Action annulée',
    redoSuccess: 'Action refaite'
  },

  // Accessibility
  a11y: {
    skipToMain: 'Aller au contenu principal',
    openMenu: 'Ouvrir le menu de navigation',
    closeMenu: 'Fermer le menu de navigation',
    expandSection: 'Développer la section',
    collapseSection: 'Réduire la section',
    sortAscending: 'Tri croissant',
    sortDescending: 'Tri décroissant',
    currentPage: 'Page actuelle',
    goToPage: 'Aller à la page',
    loading: 'Chargement du contenu',
    searchResults: 'Résultats de recherche',
    noResults: 'Aucun résultat trouvé',
    selectedItem: 'Élément sélectionné',
    toggleVisibility: 'Basculer la visibilité'
  },

  // Forms
  forms: {
    required: 'Ce champ est obligatoire',
    invalid: 'Veuillez saisir une valeur valide',
    email: 'Veuillez saisir un email valide',
    phone: 'Veuillez saisir un téléphone valide',
    minLength: 'Minimum {min} caractères requis',
    maxLength: 'Maximum {max} caractères autorisés',
    submit: 'Soumettre',
    reset: 'Réinitialiser',
    clear: 'Effacer'
  },

  // Status Messages
  status: {
    online: 'En ligne',
    offline: 'Hors ligne',
    connecting: 'Connexion...',
    syncing: 'Synchronisation...',
    saved: 'Sauvegardé',
    unsaved: 'Modifications non sauvegardées',
    error: 'Erreur survenue'
  },

  // Time & Dates
  time: {
    now: 'Maintenant',
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    thisWeek: 'Cette semaine',
    lastWeek: 'Semaine dernière',
    thisMonth: 'Ce mois',
    lastMonth: 'Mois dernier',
    daysAgo: 'Il y a {days} jours',
    hoursAgo: 'Il y a {hours} heures',
    minutesAgo: 'Il y a {minutes} minutes',
    secondsAgo: 'À l\'instant'
  }
}
