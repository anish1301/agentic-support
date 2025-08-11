// UI module for managing UI state
const state = {
  isLoading: false,
  modals: {
    orderDetails: {
      isOpen: false,
      orderId: null
    },
    confirmAction: {
      isOpen: false,
      action: null,
      data: null
    }
  },
  notifications: [],
  theme: 'light'
}

const mutations = {
  SET_LOADING(state, isLoading) {
    state.isLoading = isLoading
  },

  OPEN_MODAL(state, { modalName, data = {} }) {
    if (state.modals[modalName]) {
      state.modals[modalName].isOpen = true
      Object.assign(state.modals[modalName], data)
    }
  },

  CLOSE_MODAL(state, modalName) {
    if (state.modals[modalName]) {
      state.modals[modalName].isOpen = false
      // Reset modal data
      Object.keys(state.modals[modalName]).forEach(key => {
        if (key !== 'isOpen') {
          state.modals[modalName][key] = null
        }
      })
    }
  },

  ADD_NOTIFICATION(state, notification) {
    state.notifications.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...notification
    })
  },

  REMOVE_NOTIFICATION(state, notificationId) {
    state.notifications = state.notifications.filter(n => n.id !== notificationId)
  },

  SET_THEME(state, theme) {
    state.theme = theme
  }
}

const actions = {
  showNotification({ commit }, { message, type = 'info', duration = 5000 }) {
    const notification = { message, type }
    commit('ADD_NOTIFICATION', notification)

    // Auto remove notification after duration
    setTimeout(() => {
      commit('REMOVE_NOTIFICATION', notification.id)
    }, duration)
  },

  openModal({ commit }, { modalName, data }) {
    commit('OPEN_MODAL', { modalName, data })
  },

  closeModal({ commit }, modalName) {
    commit('CLOSE_MODAL', modalName)
  },

  setLoading({ commit }, isLoading) {
    commit('SET_LOADING', isLoading)
  }
}

const getters = {
  isLoading: state => state.isLoading,
  getModal: (state) => (modalName) => state.modals[modalName] || { isOpen: false },
  notifications: state => state.notifications,
  theme: state => state.theme
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
