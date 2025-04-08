import Redis from 'ioredis';
import debugLib from 'debug';

const debug = debugLib('api:cache');

// Create Redis client
let redisClient: Redis | null = null;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600 * 24, // 24 hours
};

/**
 * Initialize Redis client for caching
 */
export function initCache(): Redis | null {
  try {
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL);
      debug('Redis cache initialized');
      
      redisClient.on('error', (err) => {
        console.error('Redis error:', err);
        redisClient = null;
      });
      
      return redisClient;
    } else {
      debug('No REDIS_URL found, caching disabled');
      return null;
    }
  } catch (error) {
    console.error('Failed to initialize Redis cache:', error);
    return null;
  }
}

/**
 * Get cached data
 * @param key Cache key
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redisClient) return null;
  
  try {
    const data = await redisClient.get(key);
    if (data) {
      debug(`Cache hit for: ${key}`);
      return JSON.parse(data) as T;
    }
    debug(`Cache miss for: ${key}`);
    return null;
  } catch (error) {
    console.error(`Error getting from cache: ${key}`, error);
    return null;
  }
}

/**
 * Set data in cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in seconds
 */
export async function setCached(key: string, data: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
  if (!redisClient) return;
  
  try {
    await redisClient.set(key, JSON.stringify(data), 'EX', ttl);
    debug(`Cached: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`Error setting cache: ${key}`, error);
  }
}

/**
 * Remove data from cache
 * @param key Cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!redisClient) return;
  
  try {
    await redisClient.del(key);
    debug(`Invalidated cache: ${key}`);
  } catch (error) {
    console.error(`Error invalidating cache: ${key}`, error);
  }
}

/**
 * Remove data from cache by pattern
 * @param pattern Key pattern to match (e.g. "users:*")
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!redisClient) return;
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      debug(`Invalidated ${keys.length} keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error(`Error invalidating cache pattern: ${pattern}`, error);
  }
}

/**
 * Get cache stats
 */
export async function getCacheStats(): Promise<Record<string, any>> {
  if (!redisClient) return { enabled: false };
  
  try {
    const info = await redisClient.info();
    const dbSize = await redisClient.dbsize();
    
    return {
      enabled: true,
      size: dbSize,
      info: info,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { enabled: true, error: 'Failed to get cache stats' };
  }
}

// Middleware to cache API responses
export function cacheMiddleware(ttl: number = CACHE_TTL.MEDIUM) {
  return async (req: any, res: any, next: any) => {
    if (!redisClient || req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = `api:${req.originalUrl}`;
    
    try {
      const cachedData = await getCached(cacheKey);
      
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
      }
      
      // Store the original json method
      const originalJson = res.json;
      
      // Override the json method
      res.json = function(data: any) {
        // Set the data back to original json method
        res.setHeader('X-Cache', 'MISS');
        originalJson.call(this, data);
        
        // Cache the data
        setCached(cacheKey, data, ttl).catch(err => 
          console.error(`Error caching response for ${cacheKey}:`, err)
        );
      };
      
      next();
    } catch (error) {
      console.error(`Cache middleware error for: ${cacheKey}`, error);
      next();
    }
  };
}

// Initialize cache on startup
export const redis = initCache();