# Redis MCP Server v1.0 - Original

## Version Information
- **Version**: 1.0.0
- **Date Created**: August 2024
- **Status**: Production (Original)
- **Author**: Oskar Schiermeister

## Overview
The original Redis MCP (Model Context Protocol) server providing basic Redis operations for hierarchical content management.

## Features

### Core Redis Operations
- `redis_get` - Get string values
- `redis_set` - Set string values with optional TTL
- `redis_delete` - Delete keys
- `redis_keys` - Pattern-based key discovery
- `redis_info` - Server information

### Hash Operations
- `redis_hget` - Get hash field
- `redis_hset` - Set hash field
- `redis_hgetall` - Get all hash fields

### List Operations
- `redis_lpush` - Push to list
- `redis_lrange` - Get list range

### Set Operations ✅ Already Implemented
- `redis_smembers` - Get set members
- `redis_sadd` - Add set members
- `redis_srem` - Remove set members

### Sorted Set Operations ✅ Already Implemented
- `redis_zrange` - Get sorted set range
- `redis_zadd` - Add sorted set members
- `redis_zrem` - Remove sorted set members

### Utility Operations
- `redis_type` - Get key data type

## Data Structure Support
- ✅ **Strings** - Basic key-value operations
- ✅ **Hashes** - Field-value mappings
- ✅ **Lists** - Ordered collections
- ✅ **Sets** - Unordered unique collections
- ✅ **Sorted Sets** - Ordered unique collections with scores
- ✅ **JSON** - RedisJSON document storage

## Connection Configuration
- **Host**: redis-11116.c311.eu-central-1-1.ec2.redns.redis-cloud.com
- **Port**: 11116
- **Username**: default
- **Password**: [Encrypted in environment]
- **Connection Type**: Redis Cloud

## Architecture
```
RedisServer Class
├── connectRedis() - Redis cloud connection
├── setupToolHandlers() - MCP tool registration
├── setupErrorHandling() - Error management
└── cleanup() - Resource cleanup
```

## Usage in n8n
Compatible with n8n workflows through MCP integration:
```javascript
// Example usage
const children = await $mcp.redis_smembers('doc:communication_rules:001:children');
const content = await $mcp.redis_hgetall('doc:communication_rules:001');
```

## Known Limitations
- No business-specific helper functions
- Limited hierarchical navigation support
- Basic error handling
- No data type auto-detection for hybrid commands

## Files
- `server.js` - Main server implementation (695 lines)
- `package.json` - Dependencies and configuration
- `.env` - Environment variables (not archived for security)

## Performance
- **Command Count**: 15 Redis operations
- **Memory Usage**: ~50MB typical
- **Connection**: Persistent Redis Cloud connection
- **Error Handling**: Basic try-catch with MCP error responses

## Compatibility
- ✅ MCP SDK v1.17.4
- ✅ Redis v4.7.0
- ✅ Node.js ES Modules
- ✅ n8n Integration
- ✅ Redis Cloud