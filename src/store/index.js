import { createStore } from 'vuex'
import chat from './modules/chat'
import orders from './modules/orders'
import ui from './modules/ui'
import agent from './modules/agent'

export default createStore({
  modules: {
    chat,
    orders,
    ui,
    agent
  },
  strict: process.env.NODE_ENV !== 'production'
})
