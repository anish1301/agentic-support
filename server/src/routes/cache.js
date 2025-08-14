/**
 * Cache Dashboard Route
 * Provides endpoints to view and manage cached responses
 */

const express = require('express');
const router = express.Router();
const chatCacheService = require('../services/chatCacheService');

// GET /api/cache/dashboard - Get cache overview
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await chatCacheService.getCacheStats();
    
    // Get recent cache entries
    if (chatCacheService.cacheCollection) {
      const recentEntries = await chatCacheService.cacheCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      const topUsed = await chatCacheService.cacheCollection
        .find({})
        .sort({ usageCount: -1 })
        .limit(5)
        .toArray();

      res.json({
        success: true,
        stats,
        recentEntries: recentEntries.map(entry => ({
          id: entry._id,
          question: entry.question,
          answer: entry.answer.substring(0, 100) + '...',
          usageCount: entry.usageCount,
          createdAt: entry.createdAt,
          lastUsed: entry.lastUsed
        })),
        topUsed: topUsed.map(entry => ({
          id: entry._id,
          question: entry.question,
          usageCount: entry.usageCount,
          lastUsed: entry.lastUsed
        }))
      });
    } else {
      res.json({
        success: true,
        stats,
        recentEntries: [],
        topUsed: []
      });
    }
  } catch (error) {
    console.error('Error getting cache dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache dashboard data'
    });
  }
});

// GET /api/cache/search - Search cached responses
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    if (chatCacheService.cacheCollection) {
      const results = await chatCacheService.cacheCollection
        .find({
          $or: [
            { question: { $regex: query, $options: 'i' } },
            { answer: { $regex: query, $options: 'i' } }
          ]
        })
        .sort({ usageCount: -1 })
        .limit(parseInt(limit))
        .toArray();

      res.json({
        success: true,
        query,
        results: results.map(entry => ({
          id: entry._id,
          question: entry.question,
          answer: entry.answer,
          usageCount: entry.usageCount,
          createdAt: entry.createdAt,
          lastUsed: entry.lastUsed
        })),
        count: results.length
      });
    } else {
      res.json({
        success: true,
        query,
        results: [],
        count: 0
      });
    }
  } catch (error) {
    console.error('Error searching cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search cache'
    });
  }
});

// DELETE /api/cache/entry/:id - Delete cache entry
router.delete('/entry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (chatCacheService.cacheCollection) {
      const { ObjectId } = require('mongodb');
      const result = await chatCacheService.cacheCollection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Cache entry not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Cache entry deleted successfully'
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Cache service not available'
      });
    }
  } catch (error) {
    console.error('Error deleting cache entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete cache entry'
    });
  }
});

module.exports = router;
