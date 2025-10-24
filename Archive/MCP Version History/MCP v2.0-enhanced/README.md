# Redis Enhanced MCP Server

Enhanced Redis MCP Server with full support for hierarchical data structures using Sets and Sorted Sets.

## Features

### Original Redis Commands
- `redis_get` - String operations
- `redis_hgetall` - Hash operations  
- `redis_lrange` - List operations
- `redis_keys` - Key discovery
- `redis_info` - Server information

### NEW: Set & Sorted Set Commands
- `redis_smembers` - Get set members (for :children relationships)
- `redis_scard` - Get set size
- `redis_zrange` - Get sorted set range (for :sequence ordering)
- `redis_zcard` - Get sorted set size
- `redis_type` - Get key data type

### NEW: Business Logic Commands
- `redis_get_document_structure` - Complete document with children/sequence
- `redis_get_content_hierarchy` - Full hierarchical content navigation

### NEW: JSON Support
- `redis_json_get` - JSON document retrieval

## Installation

```bash
cd mcp-redis-server-enhanced
npm install
```

## Testing

```bash
npm test
```

## Usage in n8n

The enhanced server provides all commands needed for your hierarchical Redis data:

```javascript
// Get document children
const children = await $mcp.redis_smembers('doc:communication_rules:001:children');

// Get document sequence
const sequence = await $mcp.redis_zrange('doc:communication_rules:001:sequence', 0, -1);

// Get complete document structure
const structure = await $mcp.redis_get_document_structure('doc:communication_rules:001');

// Get full hierarchy
const hierarchy = await $mcp.redis_get_content_hierarchy('doc:communication_rules:001', 3);

// Check data type
const dataType = await $mcp.redis_type('doc:communication_rules:001:children');
```

## MCP Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "redis-enhanced": {
      "command": "node",
      "args": ["/path/to/mcp-redis-server-enhanced/server.js"],
      "env": {}
    }
  }
}
```

## Command Reference

### Set Operations
```javascript
// Get all members from a set
redis_smembers(key)
// Returns: { key, type: "set", members: [...], count: N }

// Get set cardinality
redis_scard(key)
// Returns: number
```

### Sorted Set Operations
```javascript
// Get range from sorted set
redis_zrange(key, start, stop)
// Returns: { key, type: "sorted_set", members: [...], count: N }

// Get sorted set cardinality
redis_zcard(key)
// Returns: number
```

### Type Detection
```javascript
// Get Redis data type
redis_type(key)
// Returns: "string" | "hash" | "list" | "set" | "zset" | "ReJSON-RL"
```

### Business Logic
```javascript
// Get complete document structure
redis_get_document_structure(doc_key)
// Returns: { document_data, children, sequence, counts }

// Get hierarchical content tree
redis_get_content_hierarchy(doc_key, max_depth)
// Returns: nested hierarchy with all children
```

## Compatibility

- ✅ Fully compatible with existing transformation system
- ✅ Supports all Redis data types used in your project
- ✅ Ready for n8n content workflow integration
- ✅ Preserves original mcp-redis-server (no breaking changes)

## Architecture

```
Document Structure in Redis:
├── doc:communication_rules:001 (JSON document)
├── doc:communication_rules:001:children (Set of child keys)
├── doc:communication_rules:001:sequence (Sorted set for ordering)
└── ch:principles_in_communication:001 (Child document)
    ├── ch:principles_in_communication:001:children
    └── ch:principles_in_communication:001:sequence
```

## Troubleshooting

### Redis Connection Issues
- Ensure Redis is running: `redis-server`
- Check connection: `redis-cli ping`
- Default connection: `localhost:6379`

### Data Type Errors
- Use `redis_type` to verify key types
- Sets use `redis_smembers`, not `redis_get`
- Sorted sets use `redis_zrange`, not `redis_lrange`

### JSON Errors
- Ensure RedisJSON module is loaded
- Check with: `redis-cli MODULE LIST`
- Install if needed: `redis-server --loadmodule /path/to/rejson.so`

## Development

### Running the Server
```bash
npm start
```

### Testing Connection
```bash
npm test
```

### Debug Mode
```bash
DEBUG=* npm start
```

## License

MIT