/**
 * MongoDB Orders Routes
 * Replace mock data with MongoDB persistence
 */

const express = require('express')
const { MongoClient, ObjectId } = require('mongodb')
const router = express.Router()

// MongoDB connection settings
const MONGODB_URL = 'mongodb://localhost:27017'
const DATABASE_NAME = 'richpanel_ai_agent'
const ORDERS_COLLECTION = 'orders'
const CUSTOMERS_COLLECTION = 'customers'

let db = null
let ordersCollection = null
let customersCollection = null

// Initialize MongoDB connection
async function initMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URL)
    await client.connect()
    db = client.db(DATABASE_NAME)
    ordersCollection = db.collection(ORDERS_COLLECTION)
    customersCollection = db.collection(CUSTOMERS_COLLECTION)
    
    // Create indexes for better performance
    await ordersCollection.createIndex({ customerId: 1 })
    await ordersCollection.createIndex({ status: 1 })
    await ordersCollection.createIndex({ orderDate: -1 })
    await customersCollection.createIndex({ email: 1 }, { unique: true })
    
    console.log('✅ MongoDB Orders connected successfully')
    
    // Initialize with sample data if empty
    await initializeSampleData()
    
    return true
  } catch (error) {
    console.error('❌ MongoDB Orders connection failed:', error.message)
    return false
  }
}

// Initialize with sample data
async function initializeSampleData() {
  try {
    const orderCount = await ordersCollection.countDocuments()
    const customerCount = await customersCollection.countDocuments()
    
    if (customerCount === 0) {
      console.log('📝 Initializing sample customers...')
      await customersCollection.insertMany([
        {
          id: 'CUST-001',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+1-555-0123',
          tier: 'premium',
          createdAt: new Date('2025-01-01')
        },
        {
          id: 'CUST-002',
          name: 'Mike Chen',
          email: 'mike.chen@email.com',
          phone: '+1-555-0124',
          tier: 'standard',
          createdAt: new Date('2025-02-01')
        }
      ])
    }

    if (orderCount === 0) {
      console.log('📝 Initializing sample orders...')
      await ordersCollection.insertMany([
        {
          id: 'ORD-12345',
          customerId: 'CUST-001',
          customerName: 'Sarah Johnson',
          status: 'confirmed',
          items: [
            { 
              id: 'PROD-001',
              name: 'iPhone 15 Pro',
              variant: '256GB',
              sku: 'IPH15PRO-256-BLU',
              qty: 1,
              price: 1099,
              image: 'https://via.placeholder.com/100/007bff/ffffff?text=iPhone'
            }
          ],
          total: 1099,
          orderDate: new Date('2025-07-28T10:30:00Z'),
          estimatedDelivery: '2025-08-02',
          canCancel: true,
          canReturn: false,
          trackingNumber: '1Z999AA1234567890',
          shippingAddress: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94105'
          },
          createdAt: new Date('2025-07-28T10:30:00Z'),
          updatedAt: new Date('2025-07-28T10:30:00Z')
        },
        {
          id: 'ORD-12346',
          customerId: 'CUST-001',
          customerName: 'Sarah Johnson',
          status: 'shipped',
          items: [
            {
              id: 'PROD-002',
              name: 'MacBook Pro 14',
              variant: 'M3 Pro, 512GB',
              sku: 'MBP14-M3-512-SLV',
              qty: 1,
              price: 1999,
              image: 'https://via.placeholder.com/100/28a745/ffffff?text=MacBook'
            }
          ],
          total: 1999,
          orderDate: new Date('2025-07-25T14:15:00Z'),
          estimatedDelivery: '2025-08-01',
          canCancel: false,
          canReturn: true,
          trackingNumber: '1Z999BB9876543210',
          shippingAddress: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94105'
          },
          createdAt: new Date('2025-07-25T14:15:00Z'),
          updatedAt: new Date('2025-07-25T14:15:00Z')
        },
        {
          id: 'ORD-12347',
          customerId: 'CUST-002',
          customerName: 'Mike Chen',
          status: 'delivered',
          items: [
            {
              id: 'PROD-003',
              name: 'AirPods Pro 2nd Gen',
              variant: 'White',
              sku: 'APP-2ND-WHT',
              qty: 2,
              price: 249,
              image: 'https://via.placeholder.com/100/dc3545/ffffff?text=AirPods'
            }
          ],
          total: 498,
          orderDate: new Date('2025-07-20T09:45:00Z'),
          deliveredDate: new Date('2025-07-26T16:30:00Z'),
          canCancel: false,
          canReturn: true,
          trackingNumber: '1Z999CC1122334455',
          shippingAddress: {
            street: '456 Oak Ave',
            city: 'Seattle',
            state: 'WA',
            zip: '98101'
          },
          createdAt: new Date('2025-07-20T09:45:00Z'),
          updatedAt: new Date('2025-07-26T16:30:00Z')
        }
      ])
    }
  } catch (error) {
    console.warn('⚠️ Failed to initialize sample data:', error.message)
  }
}

// Health check endpoint
router.get('/health', (req, res) => {
  const isHealthy = db && ordersCollection && customersCollection
  res.json({
    success: isHealthy,
    status: isHealthy ? 'connected' : 'disconnected',
    database: DATABASE_NAME,
    collections: {
      orders: ORDERS_COLLECTION,
      customers: CUSTOMERS_COLLECTION
    },
    timestamp: new Date().toISOString()
  })
})

// GET /api/mongo-orders - Get all orders
router.get('/', async (req, res) => {
  try {
    if (!ordersCollection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const orders = await ordersCollection.find({}).sort({ orderDate: -1 }).toArray()
    
    res.json({
      success: true,
      data: orders,
      count: orders.length
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message
    })
  }
})

// Get all orders for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    if (!ordersCollection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { customerId } = req.params
    const orders = await ordersCollection.find({ customerId }).sort({ orderDate: -1 }).toArray()
    
    res.json({
      success: true,
      data: orders,
      count: orders.length
    })
  } catch (error) {
    console.error('Error fetching customer orders:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message
    })
  }
})

// Get specific order
router.get('/:orderId', async (req, res) => {
  try {
    if (!ordersCollection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { orderId } = req.params
    const order = await ordersCollection.findOne({ id: orderId })
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      })
    }
    
    res.json({
      success: true,
      data: order
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order',
      message: error.message
    })
  }
})

// POST /api/mongo-orders/:id/cancel - Cancel order
router.post('/:orderId/cancel', async (req, res) => {
  try {
    if (!ordersCollection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { orderId } = req.params
    const order = await ordersCollection.findOne({ id: orderId })
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      })
    }
    
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ 
        success: false,
        error: `Cannot cancel ${order.status} order` 
      })
    }
    
    // Update order in database
    const updateResult = await ordersCollection.updateOne(
      { id: orderId },
      { 
        $set: { 
          status: 'cancelled',
          canCancel: false,
          canReturn: false,
          cancellationReason: req.body.reason || 'Customer request',
          cancelledAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update order'
      })
    }

    // Get updated order
    const updatedOrder = await ordersCollection.findOne({ id: orderId })
    
    res.json({ 
      success: true,
      message: 'Order cancelled successfully', 
      data: updatedOrder 
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
      message: error.message
    })
  }
})

// POST /api/mongo-orders/:id/return - Return order
router.post('/:orderId/return', async (req, res) => {
  try {
    if (!ordersCollection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { orderId } = req.params
    const order = await ordersCollection.findOne({ id: orderId })
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      })
    }
    
    if (order.status !== 'delivered') {
      return res.status(400).json({ 
        success: false,
        error: 'Can only return delivered orders' 
      })
    }
    
    // Update order in database
    const updateResult = await ordersCollection.updateOne(
      { id: orderId },
      { 
        $set: { 
          status: 'return_requested',
          canCancel: false,
          canReturn: false,
          returnReason: req.body.reason || 'Customer return request',
          returnDate: new Date(),
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update order'
      })
    }

    // Get updated order
    const updatedOrder = await ordersCollection.findOne({ id: orderId })
    
    res.json({ 
      success: true,
      message: 'Return request submitted successfully', 
      data: updatedOrder 
    })
  } catch (error) {
    console.error('Error processing return request:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process return request',
      message: error.message
    })
  }
})

// POST /api/mongo-orders/:id/undo-cancel - Undo order cancellation
router.post('/:orderId/undo-cancel', async (req, res) => {
  try {
    if (!ordersCollection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { orderId } = req.params
    const order = await ordersCollection.findOne({ id: orderId })
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      })
    }
    
    if (order.status !== 'cancelled') {
      return res.status(400).json({ 
        success: false,
        error: 'Can only undo cancellation for cancelled orders' 
      })
    }
    
    // Update order in database
    const updateResult = await ordersCollection.updateOne(
      { id: orderId },
      { 
        $set: { 
          status: 'confirmed',
          canCancel: true,
          canReturn: false,
          updatedAt: new Date()
        },
        $unset: {
          cancellationReason: "",
          cancelledAt: ""
        }
      }
    )

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update order'
      })
    }

    // Get updated order
    const updatedOrder = await ordersCollection.findOne({ id: orderId })
    
    res.json({ 
      success: true,
      message: 'Order cancellation undone successfully', 
      data: updatedOrder 
    })
  } catch (error) {
    console.error('Error undoing order cancellation:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to undo order cancellation',
      message: error.message
    })
  }
})

// POST /api/mongo-orders/:id/undo-return - Undo return request
router.post('/:orderId/undo-return', async (req, res) => {
  try {
    if (!ordersCollection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const { orderId } = req.params
    const order = await ordersCollection.findOne({ id: orderId })
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      })
    }
    
    if (order.status !== 'return_requested') {
      return res.status(400).json({ 
        success: false,
        error: 'Can only undo return request for orders with return requested' 
      })
    }
    
    // Update order in database
    const updateResult = await ordersCollection.updateOne(
      { id: orderId },
      { 
        $set: { 
          status: 'delivered',
          canCancel: false,
          canReturn: true,
          updatedAt: new Date()
        },
        $unset: {
          returnReason: "",
          returnDate: ""
        }
      }
    )

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update order'
      })
    }

    // Get updated order
    const updatedOrder = await ordersCollection.findOne({ id: orderId })
    
    res.json({ 
      success: true,
      message: 'Return request undone successfully', 
      data: updatedOrder 
    })
  } catch (error) {
    console.error('Error undoing return request:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to undo return request',
      message: error.message
    })
  }
})

// Get order analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    if (!ordersCollection) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const analytics = await ordersCollection.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          ordersByStatus: { 
            $push: '$status'
          }
        }
      },
      {
        $addFields: {
          statusCounts: {
            $reduce: {
              input: '$ordersByStatus',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  { $arrayToObject: [[ { k: '$$this', v: { $add: [ { $ifNull: [ '$$value.$$this', 0 ] }, 1 ] } } ]] }
                ]
              }
            }
          }
        }
      }
    ]).toArray()

    const result = analytics[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      statusCounts: {}
    }

    res.json({
      success: true,
      analytics: {
        totalOrders: result.totalOrders,
        totalRevenue: result.totalRevenue,
        averageOrderValue: Math.round(result.averageOrderValue || 0),
        statusCounts: result.statusCounts,
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error getting order analytics:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Initialize MongoDB when module loads
initMongoDB()

module.exports = router
