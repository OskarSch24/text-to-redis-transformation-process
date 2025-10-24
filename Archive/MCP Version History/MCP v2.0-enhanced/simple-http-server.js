#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Redis client
let redisClient = null;

async function connectRedis() {
  try {
    redisClient = createClient({
      socket: {
        host: 'redis-11116.c311.eu-central-1-1.ec2.redns.redis-cloud.com',
        port: 11116,
      },
      username: 'default',
      password: 'RCGQtfFjKr2vnccrnlxClz8reULpGoNG',
    });
    
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
    console.log('✅ Connected to Redis successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    return false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'redis-mcp-proxy-server',
    redis_connected: redisClient ? true : false,
    timestamp: new Date().toISOString()
  });
});

// Redis GET endpoint
app.get('/redis/get/:key', async (req, res) => {
  try {
    if (!redisClient) {
      const connected = await connectRedis();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
      }
    }
    
    const value = await redisClient.get(req.params.key);
    res.json({ key: req.params.key, value: value || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redis KEYS endpoint
app.get('/redis/keys/:pattern?', async (req, res) => {
  try {
    if (!redisClient) {
      const connected = await connectRedis();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
      }
    }
    
    const pattern = req.params.pattern || '*';
    const keys = await redisClient.keys(pattern);
    res.json({ pattern, keys, count: keys.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redis HGETALL endpoint
app.get('/redis/hash/:key', async (req, res) => {
  try {
    if (!redisClient) {
      const connected = await connectRedis();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
      }
    }
    
    const hashData = await redisClient.hGetAll(req.params.key);
    res.json({ key: req.params.key, data: hashData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redis SET MEMBERS endpoint
app.get('/redis/set/:key', async (req, res) => {
  try {
    if (!redisClient) {
      const connected = await connectRedis();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
      }
    }
    
    const members = await redisClient.sMembers(req.params.key);
    res.json({ 
      key: req.params.key, 
      type: 'set',
      members: members,
      count: members.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redis LIST RANGE endpoint
app.get('/redis/list/:key', async (req, res) => {
  try {
    if (!redisClient) {
      const connected = await connectRedis();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
      }
    }
    
    const start = parseInt(req.query.start || '0');
    const stop = parseInt(req.query.stop || '-1');
    const listData = await redisClient.lRange(req.params.key, start, stop);
    res.json({ 
      key: req.params.key, 
      type: 'list',
      data: listData,
      count: listData.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redis TYPE endpoint
app.get('/redis/type/:key', async (req, res) => {
  try {
    if (!redisClient) {
      const connected = await connectRedis();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
      }
    }
    
    const type = await redisClient.type(req.params.key);
    res.json({ key: req.params.key, type: type });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redis JSON GET endpoint
app.get('/redis/json/:key', async (req, res) => {
  try {
    if (!redisClient) {
      const connected = await connectRedis();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
      }
    }
    
    const path = req.query.path || '$';
    const jsonData = await redisClient.json.get(req.params.key, { path });
    res.json({ key: req.params.key, path, data: jsonData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Document Structure endpoint (business logic)
app.get('/redis/document/:key', async (req, res) => {
  try {
    if (!redisClient) {
      const connected = await connectRedis();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
      }
    }
    
    const docKey = req.params.key;
    
    // Get main document (JSON)
    const document = await redisClient.json.get(docKey);
    
    // Get children (Set)
    const children = await redisClient.sMembers(`${docKey}:children`);
    
    // Get sequence (Set)
    const sequence = await redisClient.sMembers(`${docKey}:sequence`);
    
    const result = {
      document_key: docKey,
      document_data: document,
      children: children,
      sequence: sequence,
      children_count: children.length,
      sequence_count: sequence.length
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generic Redis command endpoint
app.post('/redis/command', async (req, res) => {
  try {
    if (!redisClient) {
      const connected = await connectRedis();
      if (!connected) {
        return res.status(500).json({ error: 'Failed to connect to Redis' });
      }
    }
    
    const { command, args = [] } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    // Execute Redis command
    const result = await redisClient.sendCommand([command, ...args]);
    res.json({ command, args, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Redis HTTP Proxy Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API Documentation:`);
  console.log(`   GET /health                    - Server health check`);
  console.log(`   GET /redis/keys/:pattern       - Get Redis keys`);
  console.log(`   GET /redis/get/:key            - Get string value`);
  console.log(`   GET /redis/hash/:key           - Get hash data`);
  console.log(`   GET /redis/set/:key            - Get set members`);
  console.log(`   GET /redis/list/:key           - Get list data`);
  console.log(`   GET /redis/type/:key           - Get key type`);
  console.log(`   GET /redis/json/:key           - Get JSON data`);
  console.log(`   GET /redis/document/:key       - Get document structure`);
  console.log(`   POST /redis/command            - Execute Redis command`);
  
  // Try to connect to Redis on startup
  await connectRedis();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  if (redisClient) {
    await redisClient.disconnect();
    console.log('✅ Redis connection closed');
  }
  process.exit(0);
});