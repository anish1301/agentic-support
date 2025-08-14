/**
 * Chat Cache Service
 * Handles intelligent caching and retrieval of chat responses
 * with similarity matching and MongoDB persistence
 */

const { MongoClient } = require('mongodb');

class ChatCacheService {
  constructor() {
    this.MONGODB_URL = 'mongodb://localhost:27017';
    this.DATABASE_NAME = 'richpanel_ai_agent';
    this.CACHE_COLLECTION = 'chat_cache';
    this.SESSIONS_COLLECTION = 'chat_sessions';
    
    this.db = null;
    this.cacheCollection = null;
    this.sessionsCollection = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      const client = new MongoClient(this.MONGODB_URL);
      await client.connect();
      this.db = client.db(this.DATABASE_NAME);
      this.cacheCollection = this.db.collection(this.CACHE_COLLECTION);
      this.sessionsCollection = this.db.collection(this.SESSIONS_COLLECTION);
      
      // Create indexes for better performance
      await this.cacheCollection.createIndex({ question: 'text' });
      await this.cacheCollection.createIndex({ questionHash: 1 });
      await this.cacheCollection.createIndex({ createdAt: -1 });
      await this.cacheCollection.createIndex({ usageCount: -1 });
      
      this.isConnected = true;
      console.log('✅ Chat Cache Service connected to MongoDB');
      return true;
    } catch (error) {
      console.error('❌ Chat Cache Service connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Generate a hash for question normalization
   */
  generateQuestionHash(question) {
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize spaces
      .trim()
      .split(' ')
      .sort() // Sort words for better matching
      .join(' ');
  }

  /**
   * Calculate similarity between two strings using multiple methods
   */
  calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.toLowerCase().split(' ').filter(word => word.length > 2));
    const words2 = new Set(str2.toLowerCase().split(' ').filter(word => word.length > 2));
    
    if (words1.size === 0 || words2.size === 0) return 0;
    
    // Jaccard similarity
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    const jaccardSim = intersection.size / union.size;
    
    // Levenshtein distance based similarity
    const levenSim = 1 - (this.levenshteinDistance(str1, str2) / Math.max(str1.length, str2.length));
    
    // Combined score (weighted average)
    return (jaccardSim * 0.7) + (levenSim * 0.3);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len2][len1];
  }

  /**
   * Find similar question in cache
   */
  async findSimilarQuestion(userQuestion, similarityThreshold = 0.75) {
    if (!this.isConnected || !this.cacheCollection) return null;

    try {
      const questionHash = this.generateQuestionHash(userQuestion);
      
      // First try exact hash match
      const exactMatch = await this.cacheCollection.findOne({ questionHash });
      if (exactMatch) {
        console.log('🎯 Found exact hash match in cache');
        await this.incrementUsageCount(exactMatch._id);
        return {
          ...exactMatch,
          similarity: 1.0,
          matchType: 'exact'
        };
      }

      // Text search for similar questions
      const searchResults = await this.cacheCollection.find({
        $text: { $search: userQuestion }
      }).limit(10).toArray();

      let bestMatch = null;
      let bestSimilarity = 0;

      for (const cached of searchResults) {
        const similarity = this.calculateSimilarity(userQuestion, cached.question);
        if (similarity > bestSimilarity && similarity >= similarityThreshold) {
          bestSimilarity = similarity;
          bestMatch = {
            ...cached,
            similarity,
            matchType: 'similar'
          };
        }
      }

      if (bestMatch) {
        console.log(`🎯 Found similar question in cache (${Math.round(bestMatch.similarity * 100)}% match)`);
        await this.incrementUsageCount(bestMatch._id);
        return bestMatch;
      }

      return null;
    } catch (error) {
      console.error('Error searching cache:', error);
      return null;
    }
  }

  /**
   * Cache a question-answer pair
   */
  async cacheResponse(question, answer, metadata = {}) {
    if (!this.isConnected || !this.cacheCollection) return false;

    try {
      const questionHash = this.generateQuestionHash(question);
      
      // Check if already cached
      const existing = await this.cacheCollection.findOne({ questionHash });
      if (existing) {
        console.log('📝 Question already cached, incrementing usage count');
        await this.incrementUsageCount(existing._id);
        return true;
      }

      // Cache new response
      const cacheEntry = {
        question: question.trim(),
        questionHash,
        answer: answer.trim(),
        createdAt: new Date(),
        usageCount: 1,
        lastUsed: new Date(),
        metadata: {
          source: 'gemini_api',
          ...metadata
        }
      };

      await this.cacheCollection.insertOne(cacheEntry);
      console.log('💾 Cached new question-answer pair');
      return true;
    } catch (error) {
      console.error('Error caching response:', error);
      return false;
    }
  }

  /**
   * Increment usage count for cached response
   */
  async incrementUsageCount(cacheId) {
    try {
      await this.cacheCollection.updateOne(
        { _id: cacheId },
        { 
          $inc: { usageCount: 1 },
          $set: { lastUsed: new Date() }
        }
      );
    } catch (error) {
      console.error('Error incrementing usage count:', error);
    }
  }

  /**
   * Log chat message to sessions collection
   */
  async logMessage(sessionId, customerId, message, type) {
    if (!this.isConnected || !this.sessionsCollection) return false;
    
    try {
      const messageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: message,
        type: type,
        sender: type === 'user' ? 'customer' : 'agent',
        timestamp: new Date(),
        customerId: customerId
      };

      // Try to add to existing session
      const updateResult = await this.sessionsCollection.updateOne(
        { sessionId },
        { 
          $push: { messages: messageData },
          $set: { lastMessageAt: new Date() }
        }
      );

      // If session doesn't exist, create new one
      if (updateResult.matchedCount === 0) {
        await this.sessionsCollection.insertOne({
          sessionId,
          customerId,
          createdAt: new Date(),
          messages: [messageData],
          lastMessageAt: new Date()
        });
      }

      return true;
    } catch (error) {
      console.error('Error logging message:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!this.isConnected || !this.cacheCollection) return null;

    try {
      const stats = await this.cacheCollection.aggregate([
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalUsage: { $sum: '$usageCount' },
            avgUsage: { $avg: '$usageCount' }
          }
        }
      ]).toArray();

      const recentEntries = await this.cacheCollection.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      return {
        totalEntries: stats[0]?.totalEntries || 0,
        totalUsage: stats[0]?.totalUsage || 0,
        avgUsage: Math.round(stats[0]?.avgUsage || 0),
        recentEntries,
        hitRate: stats[0] ? (stats[0].totalUsage / stats[0].totalEntries) : 0
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Clear old cache entries (older than specified days)
   */
  async clearOldCache(daysOld = 30) {
    if (!this.isConnected || !this.cacheCollection) return 0;

    try {
      const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
      const result = await this.cacheCollection.deleteMany({
        createdAt: { $lt: cutoffDate },
        usageCount: { $lte: 1 } // Only delete rarely used entries
      });

      console.log(`🗑️ Cleared ${result.deletedCount} old cache entries`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error clearing old cache:', error);
      return 0;
    }
  }
}

// Export singleton instance
module.exports = new ChatCacheService();
