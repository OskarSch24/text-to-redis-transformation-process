#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from 'redis';

class RedisEnhancedServer {
  constructor() {
    this.server = new Server(
      {
        name: "redis-enhanced-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.client = null;
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      if (this.client) await this.client.disconnect();
      await this.server.close();
      process.exit(0);
    });
  }

  async connectRedis() {
    try {
      this.client = createClient({
        socket: {
          host: 'redis-11116.c311.eu-central-1-1.ec2.redns.redis-cloud.com',
          port: 11116,
        },
        username: 'default',
        password: 'RCGQtfFjKr2vnccrnlxClz8reULpGoNG',
      });
      
      this.client.on('error', (err) => console.error('Redis Client Error', err));
      await this.client.connect();
      console.log('Connected to Redis successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      return false;
    }
  }

  setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ORIGINAL COMMANDS (String, Hash, List operations)
        {
          name: "redis_get",
          description: "Get value from Redis by key (String operations)",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Redis key to retrieve" }
            },
            required: ["key"]
          }
        },
        {
          name: "redis_hgetall",
          description: "Get all fields and values from Redis hash",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Redis hash key" }
            },
            required: ["key"]
          }
        },
        {
          name: "redis_lrange",
          description: "Get list elements from Redis list",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Redis list key" },
              start: { type: "number", description: "Start index", default: 0 },
              stop: { type: "number", description: "Stop index", default: -1 }
            },
            required: ["key"]
          }
        },
        {
          name: "redis_keys",
          description: "Find Redis keys matching pattern",
          inputSchema: {
            type: "object",
            properties: {
              pattern: { type: "string", description: "Pattern to match (e.g., '*', 'doc:*')", default: "*" }
            }
          }
        },
        {
          name: "redis_info",
          description: "Get Redis server information",
          inputSchema: {
            type: "object",
            properties: {
              section: { type: "string", description: "Info section (optional)" }
            }
          }
        },

        // NEW ENHANCED COMMANDS (Set and Sorted Set operations)
        {
          name: "redis_smembers",
          description: "Get all members of a Redis set (CRITICAL for :children relationships)",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Redis set key (e.g., 'doc:example:001:children')" }
            },
            required: ["key"]
          }
        },
        {
          name: "redis_scard",
          description: "Get number of members in a Redis set",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Redis set key" }
            },
            required: ["key"]
          }
        },
        {
          name: "redis_zrange",
          description: "Get range of members from Redis sorted set (for true sorted sets) OR set members (for sequence sets)",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Redis key (sorted set or regular set)" },
              start: { type: "number", description: "Start index", default: 0 },
              stop: { type: "number", description: "Stop index", default: -1 }
            },
            required: ["key"]
          }
        },
        {
          name: "redis_zcard",
          description: "Get number of members in Redis sorted set OR set",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Redis key (sorted set or regular set)" }
            },
            required: ["key"]
          }
        },
        {
          name: "redis_type",
          description: "Get Redis key data type (CRITICAL for debugging data structure issues)",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Redis key to check type" }
            },
            required: ["key"]
          }
        },

        // BUSINESS-SPECIFIC ENHANCED COMMANDS
        {
          name: "redis_get_document_structure",
          description: "Get complete document with children and sequence (hierarchical navigation)",
          inputSchema: {
            type: "object",
            properties: {
              doc_key: { type: "string", description: "Document key (e.g., 'doc:communication_rules:001')" }
            },
            required: ["doc_key"]
          }
        },
        {
          name: "redis_get_content_hierarchy",
          description: "Get full content hierarchy from document down to chunks",
          inputSchema: {
            type: "object",
            properties: {
              doc_key: { type: "string", description: "Root document key" },
              max_depth: { type: "number", description: "Maximum hierarchy depth", default: 5 }
            },
            required: ["doc_key"]
          }
        },

        // JSON OPERATIONS (for document content)
        {
          name: "redis_json_get",
          description: "Get JSON document from Redis (for document content)",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Redis JSON key" },
              path: { type: "string", description: "JSON path", default: "$" }
            },
            required: ["key"]
          }
        }
      ]
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.client) {
        const connected = await this.connectRedis();
        if (!connected) {
          throw new McpError(ErrorCode.InternalError, "Failed to connect to Redis");
        }
      }

      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // ORIGINAL COMMANDS
          case "redis_get":
            return { content: [{ type: "text", text: await this.client.get(args.key) || "null" }] };

          case "redis_hgetall":
            const hashData = await this.client.hGetAll(args.key);
            return { content: [{ type: "text", text: JSON.stringify(hashData, null, 2) }] };

          case "redis_lrange":
            const listData = await this.client.lRange(args.key, args.start || 0, args.stop || -1);
            return { content: [{ type: "text", text: JSON.stringify(listData, null, 2) }] };

          case "redis_keys":
            const keys = await this.client.keys(args.pattern || "*");
            return { content: [{ type: "text", text: JSON.stringify(keys, null, 2) }] };

          case "redis_info":
            const info = args.section ? await this.client.info(args.section) : await this.client.info();
            return { content: [{ type: "text", text: info }] };

          // NEW SET COMMANDS
          case "redis_smembers":
            const setMembers = await this.client.sMembers(args.key);
            return { 
              content: [{ 
                type: "text", 
                text: JSON.stringify({
                  key: args.key,
                  type: "set",
                  members: setMembers,
                  count: setMembers.length
                }, null, 2) 
              }] 
            };

          case "redis_scard":
            const setSize = await this.client.sCard(args.key);
            return { content: [{ type: "text", text: setSize.toString() }] };

          // FLEXIBLE SET/SORTED SET COMMANDS
          case "redis_zrange":
            const keyType = await this.client.type(args.key);
            if (keyType === 'zset') {
              const sortedSetMembers = await this.client.zRange(args.key, args.start || 0, args.stop || -1);
              return { 
                content: [{ 
                  type: "text", 
                  text: JSON.stringify({
                    key: args.key,
                    type: "sorted_set",
                    members: sortedSetMembers,
                    count: sortedSetMembers.length
                  }, null, 2) 
                }] 
              };
            } else if (keyType === 'set') {
              const setMembers = await this.client.sMembers(args.key);
              return { 
                content: [{ 
                  type: "text", 
                  text: JSON.stringify({
                    key: args.key,
                    type: "set",
                    note: "This is a Set treated as sequence (unordered)",
                    members: setMembers,
                    count: setMembers.length
                  }, null, 2) 
                }] 
              };
            } else {
              throw new Error(`Key ${args.key} is not a set or sorted set (type: ${keyType})`);
            }

          case "redis_zcard":
            const cardKeyType = await this.client.type(args.key);
            if (cardKeyType === 'zset') {
              const sortedSetSize = await this.client.zCard(args.key);
              return { content: [{ type: "text", text: sortedSetSize.toString() }] };
            } else if (cardKeyType === 'set') {
              const setSize = await this.client.sCard(args.key);
              return { content: [{ type: "text", text: setSize.toString() }] };
            } else {
              throw new Error(`Key ${args.key} is not a set or sorted set (type: ${cardKeyType})`);
            }

          // TYPE DETECTION
          case "redis_type":
            const keyType = await this.client.type(args.key);
            return { content: [{ type: "text", text: keyType }] };

          // BUSINESS-SPECIFIC COMMANDS
          case "redis_get_document_structure":
            return await this.getDocumentStructure(args.doc_key);

          case "redis_get_content_hierarchy":
            return await this.getContentHierarchy(args.doc_key, args.max_depth || 5);

          // JSON COMMANDS
          case "redis_json_get":
            try {
              const jsonData = await this.client.json.get(args.key, { path: args.path || "$" });
              return { content: [{ type: "text", text: JSON.stringify(jsonData, null, 2) }] };
            } catch (error) {
              return { content: [{ type: "text", text: `JSON Error: ${error.message}` }] };
            }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Redis operation failed: ${error.message}`);
      }
    });
  }

  // Business-specific helper methods
  async getDocumentStructure(docKey) {
    try {
      // Get main document (JSON)
      const document = await this.client.json.get(docKey);
      
      // Get children (Set)
      const children = await this.client.sMembers(`${docKey}:children`);
      
      // Get sequence (Set - your sequence keys are Sets, not Sorted Sets)
      const sequence = await this.client.sMembers(`${docKey}:sequence`);
      
      const result = {
        document_key: docKey,
        document_data: document,
        children: children,
        sequence: sequence,
        children_count: children.length,
        sequence_count: sequence.length
      };
      
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      throw new Error(`Failed to get document structure: ${error.message}`);
    }
  }

  async getContentHierarchy(docKey, maxDepth) {
    try {
      const hierarchy = await this.buildHierarchy(docKey, 0, maxDepth);
      return { content: [{ type: "text", text: JSON.stringify(hierarchy, null, 2) }] };
    } catch (error) {
      throw new Error(`Failed to get content hierarchy: ${error.message}`);
    }
  }

  async buildHierarchy(key, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth) return null;

    try {
      // Get the item data
      const itemData = await this.client.json.get(key);
      
      // Get children if they exist
      const childrenKey = `${key}:children`;
      const children = await this.client.sMembers(childrenKey);
      
      const result = {
        key: key,
        data: itemData,
        depth: currentDepth,
        children_count: children.length,
        children: []
      };

      // Recursively get children (if within depth limit)
      if (children.length > 0 && currentDepth < maxDepth - 1) {
        for (const childKey of children) {
          const childHierarchy = await this.buildHierarchy(childKey, currentDepth + 1, maxDepth);
          if (childHierarchy) {
            result.children.push(childHierarchy);
          }
        }
      }

      return result;
    } catch (error) {
      return { error: `Failed to build hierarchy for ${key}: ${error.message}` };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Redis Enhanced MCP server running on stdio");
  }
}

const server = new RedisEnhancedServer();
server.run().catch(console.error);