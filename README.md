# 🤖 Richpanel AI Agent POC

An autonomous AI customer support agent that can handle order cancellations, tracking, and returns in real-time. Built with Vue.js, Vuex, and Node.js to showcase intelligent customer service automation.

## ✨ Features

- **🗣️ Natural Language Processing**: Understands customer intents from plain English
- **📦 Order Management**: Cancel, track, and return orders autonomously
- **⚡ Real-time Updates**: Live order status changes with smooth UI transitions
- **🎯 Smart Actions**: AI agent performs actual operations, not just suggestions
- **📱 Responsive Design**: Works seamlessly on desktop and mobile
- **🔄 State Management**: Robust Vuex store for complex state handling

## 🛠️ Tech Stack

- **Frontend**: Vue.js 3 + Vuex 4 + Tailwind CSS
- **Backend**: Node.js + Express
- **AI**: Simulated AI service (ready for Gemini API integration)
- **Build Tool**: Vite

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd richpanel-ai-agent-poc
npm install
npm run install:server
```

2. **Start development servers:**
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 🎮 Demo Usage

1. **Open the application** at http://localhost:5173
2. **Try these sample interactions:**
   - "Cancel order ORD-12345"
   - "Track my order ORD-12346" 
   - "I want to return order ORD-12347"
3. **Watch the AI agent** process requests and update order statuses in real-time

## 📁 Project Structure

```
richpanel-ai-agent-poc/
├── src/                    # Vue.js frontend
│   ├── components/         # Vue components
│   │   ├── chat/          # Chat interface
│   │   ├── orders/        # Order management
│   │   └── ui/            # Reusable UI components
│   ├── store/             # Vuex store modules
│   │   └── modules/       # Chat, orders, UI, agent modules
│   └── assets/            # Static assets
├── server/                # Node.js backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utilities & mock data
│   └── server.js          # Entry point
└── shared/               # Shared constants & types
```

## 🎯 Key Components

### AI Service
- **Intent Classification**: Automatically detects cancel/track/return intents
- **Entity Extraction**: Pulls order IDs from natural language
- **Context Awareness**: Understands customer history and order status
- **Action Execution**: Performs real operations on order data

### Order Management
- **Real-time Status Updates**: Orders change status immediately
- **Business Rules**: Enforces cancellation windows and return eligibility
- **Audit Trail**: Tracks all AI agent actions with timestamps

### Chat Interface  
- **Natural Conversations**: Human-like AI responses
- **Loading States**: Shows AI "thinking" with realistic delays
- **Action Confirmations**: Clear feedback on completed operations

## 🔮 Future Enhancements

- **Gemini API Integration**: Replace mock AI with real Google Gemini
- **Database Integration**: Move from mock data to MongoDB/PostgreSQL  
- **Real Ecommerce APIs**: Connect to Shopify, WooCommerce, etc.
- **Advanced NLP**: Handle more complex customer scenarios
- **Analytics Dashboard**: Track AI agent performance metrics

## 🎨 Design Philosophy

This POC demonstrates **autonomous AI agents** that don't just chat - they **take action**. The focus is on:

- **Immediate Value**: Solves real customer service pain points
- **Scalable Architecture**: Ready for production deployment
- **Human-like Experience**: Natural conversations with smart responses
- **Business Impact**: Reduces support ticket volume and resolution time

Perfect for showcasing how AI can transform customer support from reactive to proactive! 🚀

## 📝 Available Scripts

```bash
# Start both frontend and backend in development mode
npm run dev

# Start only frontend
npm run dev:client

# Start only backend  
npm run dev:server

# Build frontend for production
npm run build

# Preview production build
npm run preview

# Install server dependencies
npm run install:server

# Start backend in production mode
npm run start:server
```

## 🌟 Sample Data

The POC includes realistic mock data:
- **3 Sample Orders** with different statuses (confirmed, shipped, delivered)
- **2 Customer Profiles** with order history
- **Product Information** with images and pricing
- **Tracking Numbers** and delivery estimates

## 🔧 Environment Variables

Create a `.env` file in the server directory:
```bash
PORT=3001
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-pro
FRONTEND_URL=http://localhost:5173
```

---

Built with ❤️ for Richpanel's vision of autonomous customer support
