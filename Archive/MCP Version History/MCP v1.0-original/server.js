#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from 'redis';
import dotenv from 'dotenv';

// Suppress dotenv console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = () => {};
console.error = () => {};

// Load environment variables
dotenv.config();

// Restore only console.error for critical errors
console.error = (message, ...args) => {
  // Only log actual errors, not informational messages
  if (message && typeof message === 'string' && 
      (message.includes('Error') || message.includes('error')) &&
      !message.includes('dotenv') && 
      !message.includes('injecting')) {
    originalConsoleError(message, ...args);
  }
};

class RedisServer {
  constructor() {
    this.server = new Server(
      {
        name: 'redis-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.redisClient = null;
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  async connectRedis() {
    try {
      this.redisClient = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'redis-11116.c311.eu-central-1-1.ec2.redns.redis-cloud.com',
          port: parseInt(process.env.REDIS_PORT || '11116'),
        },
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD || 'RCGQtfFjKr2vnccrnlxClz8reULpGoNG',
      });

      this.redisClient.on('error', (err) => {
        // Redis Client Error
      });

      await this.redisClient.connect();
      // Connected to Redis successfully
    } catch (error) {
      throw error;
    }
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {};
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'redis_get',
          description: 'Get a value from Redis by key',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis key to retrieve',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'redis_set',
          description: 'Set a key-value pair in Redis',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis key',
              },
              value: {
                type: 'string',
                description: 'The value to store',
              },
              ttl: {
                type: 'number',
                description: 'Optional TTL in seconds',
              },
            },
            required: ['key', 'value'],
          },
        },
        {
          name: 'redis_delete',
          description: 'Delete a key from Redis',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis key to delete',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'redis_keys',
          description: 'List keys matching a pattern',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Pattern to match keys (default: *)',
                default: '*',
              },
            },
          },
        },
        {
          name: 'redis_hget',
          description: 'Get a field from a Redis hash',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis hash key',
              },
              field: {
                type: 'string',
                description: 'The field to retrieve',
              },
            },
            required: ['key', 'field'],
          },
        },
        {
          name: 'redis_hset',
          description: 'Set a field in a Redis hash',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis hash key',
              },
              field: {
                type: 'string',
                description: 'The field to set',
              },
              value: {
                type: 'string',
                description: 'The value to set',
              },
            },
            required: ['key', 'field', 'value'],
          },
        },
        {
          name: 'redis_hgetall',
          description: 'Get all fields and values from a Redis hash',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis hash key',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'redis_lpush',
          description: 'Push values to the left of a Redis list',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis list key',
              },
              values: {
                type: 'array',
                items: { type: 'string' },
                description: 'Values to push',
              },
            },
            required: ['key', 'values'],
          },
        },
        {
          name: 'redis_lrange',
          description: 'Get a range of elements from a Redis list',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis list key',
              },
              start: {
                type: 'number',
                description: 'Start index (0-based)',
                default: 0,
              },
              stop: {
                type: 'number',
                description: 'Stop index (-1 for end)',
                default: -1,
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'redis_info',
          description: 'Get Redis server information',
          inputSchema: {
            type: 'object',
            properties: {
              section: {
                type: 'string',
                description: 'Optional section (e.g., server, clients, memory)',
              },
            },
          },
        },
        {
          name: 'redis_type',
          description: 'Get the type of a Redis key',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis key to check',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'redis_smembers',
          description: 'Get all members of a Redis set',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis set key',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'redis_sadd',
          description: 'Add members to a Redis set',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis set key',
              },
              members: {
                type: 'array',
                items: { type: 'string' },
                description: 'Members to add to the set',
              },
            },
            required: ['key', 'members'],
          },
        },
        {
          name: 'redis_srem',
          description: 'Remove members from a Redis set',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis set key',
              },
              members: {
                type: 'array',
                items: { type: 'string' },
                description: 'Members to remove from the set',
              },
            },
            required: ['key', 'members'],
          },
        },
        {
          name: 'redis_zrange',
          description: 'Get a range of members from a sorted set',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis sorted set key',
              },
              start: {
                type: 'number',
                description: 'Start index (0-based)',
                default: 0,
              },
              stop: {
                type: 'number',
                description: 'Stop index (-1 for end)',
                default: -1,
              },
              withScores: {
                type: 'boolean',
                description: 'Include scores in the result',
                default: false,
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'redis_zadd',
          description: 'Add members with scores to a sorted set',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis sorted set key',
              },
              members: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    score: { type: 'number' },
                    value: { type: 'string' },
                  },
                  required: ['score', 'value'],
                },
                description: 'Members with scores to add',
              },
            },
            required: ['key', 'members'],
          },
        },
        {
          name: 'redis_zrem',
          description: 'Remove members from a sorted set',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The Redis sorted set key',
              },
              members: {
                type: 'array',
                items: { type: 'string' },
                description: 'Members to remove',
              },
            },
            required: ['key', 'members'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.redisClient || !this.redisClient.isOpen) {
        throw new Error('Redis client not connected');
      }

      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'redis_get': {
            const value = await this.redisClient.get(args.key);
            return {
              content: [
                {
                  type: 'text',
                  text: value !== null 
                    ? `Value for key "${args.key}": ${value}`
                    : `Key "${args.key}" not found`,
                },
              ],
            };
          }

          case 'redis_set': {
            if (args.ttl) {
              await this.redisClient.setEx(args.key, args.ttl, args.value);
            } else {
              await this.redisClient.set(args.key, args.value);
            }
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully set key "${args.key}"`,
                },
              ],
            };
          }

          case 'redis_delete': {
            const result = await this.redisClient.del(args.key);
            return {
              content: [
                {
                  type: 'text',
                  text: result > 0 
                    ? `Successfully deleted key "${args.key}"`
                    : `Key "${args.key}" not found`,
                },
              ],
            };
          }

          case 'redis_keys': {
            const keys = await this.redisClient.keys(args.pattern || '*');
            return {
              content: [
                {
                  type: 'text',
                  text: keys.length > 0 
                    ? `Found ${keys.length} keys:\n${keys.join('\n')}`
                    : 'No keys found',
                },
              ],
            };
          }

          case 'redis_hget': {
            const value = await this.redisClient.hGet(args.key, args.field);
            return {
              content: [
                {
                  type: 'text',
                  text: value !== null 
                    ? `Value for field "${args.field}" in hash "${args.key}": ${value}`
                    : `Field "${args.field}" not found in hash "${args.key}"`,
                },
              ],
            };
          }

          case 'redis_hset': {
            await this.redisClient.hSet(args.key, args.field, args.value);
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully set field "${args.field}" in hash "${args.key}"`,
                },
              ],
            };
          }

          case 'redis_hgetall': {
            const hash = await this.redisClient.hGetAll(args.key);
            const entries = Object.entries(hash);
            return {
              content: [
                {
                  type: 'text',
                  text: entries.length > 0 
                    ? `Hash "${args.key}":\n${entries.map(([k, v]) => `  ${k}: ${v}`).join('\n')}`
                    : `Hash "${args.key}" is empty or doesn't exist`,
                },
              ],
            };
          }

          case 'redis_lpush': {
            const result = await this.redisClient.lPush(args.key, args.values);
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully pushed ${args.values.length} value(s) to list "${args.key}". List now has ${result} elements.`,
                },
              ],
            };
          }

          case 'redis_lrange': {
            const values = await this.redisClient.lRange(
              args.key, 
              args.start || 0, 
              args.stop !== undefined ? args.stop : -1
            );
            return {
              content: [
                {
                  type: 'text',
                  text: values.length > 0 
                    ? `List "${args.key}" (${values.length} items):\n${values.map((v, i) => `  [${i}]: ${v}`).join('\n')}`
                    : `List "${args.key}" is empty or doesn't exist`,
                },
              ],
            };
          }

          case 'redis_info': {
            const info = await this.redisClient.info(args.section);
            return {
              content: [
                {
                  type: 'text',
                  text: `Redis Info${args.section ? ` (${args.section})` : ''}:\n${info}`,
                },
              ],
            };
          }

          case 'redis_type': {
            const type = await this.redisClient.type(args.key);
            return {
              content: [
                {
                  type: 'text',
                  text: `Key "${args.key}" is of type: ${type}`,
                },
              ],
            };
          }

          case 'redis_smembers': {
            const members = await this.redisClient.sMembers(args.key);
            return {
              content: [
                {
                  type: 'text',
                  text: members.length > 0 
                    ? `Set "${args.key}" has ${members.length} members:\n${members.join('\n')}`
                    : `Set "${args.key}" is empty or doesn't exist`,
                },
              ],
            };
          }

          case 'redis_sadd': {
            const result = await this.redisClient.sAdd(args.key, args.members);
            return {
              content: [
                {
                  type: 'text',
                  text: `Added ${result} new member(s) to set "${args.key}"`,
                },
              ],
            };
          }

          case 'redis_srem': {
            const result = await this.redisClient.sRem(args.key, args.members);
            return {
              content: [
                {
                  type: 'text',
                  text: `Removed ${result} member(s) from set "${args.key}"`,
                },
              ],
            };
          }

          case 'redis_zrange': {
            let result;
            if (args.withScores) {
              result = await this.redisClient.zRangeWithScores(
                args.key, 
                args.start || 0, 
                args.stop !== undefined ? args.stop : -1
              );
              const formatted = result.map(item => `  ${item.value}: ${item.score}`).join('\n');
              return {
                content: [
                  {
                    type: 'text',
                    text: result.length > 0 
                      ? `Sorted set "${args.key}" (${result.length} items with scores):\n${formatted}`
                      : `Sorted set "${args.key}" is empty or doesn't exist`,
                  },
                ],
              };
            } else {
              result = await this.redisClient.zRange(
                args.key, 
                args.start || 0, 
                args.stop !== undefined ? args.stop : -1
              );
              return {
                content: [
                  {
                    type: 'text',
                    text: result.length > 0 
                      ? `Sorted set "${args.key}" (${result.length} items):\n${result.map((v, i) => `  [${i}]: ${v}`).join('\n')}`
                      : `Sorted set "${args.key}" is empty or doesn't exist`,
                  },
                ],
              };
            }
          }

          case 'redis_zadd': {
            const items = args.members.map(m => ({ score: m.score, value: m.value }));
            const result = await this.redisClient.zAdd(args.key, items);
            return {
              content: [
                {
                  type: 'text',
                  text: `Added ${result} member(s) to sorted set "${args.key}"`,
                },
              ],
            };
          }

          case 'redis_zrem': {
            const result = await this.redisClient.zRem(args.key, args.members);
            return {
              content: [
                {
                  type: 'text',
                  text: `Removed ${result} member(s) from sorted set "${args.key}"`,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    await this.connectRedis();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Redis MCP server running on stdio
  }
}

const server = new RedisServer();
server.run().catch(() => {});