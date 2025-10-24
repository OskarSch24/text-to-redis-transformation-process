import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('Testing Redis connection...\n');
  
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    },
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Redis successfully!');
    
    // Test basic operations
    console.log('\nTesting basic operations:');
    
    // Set a test key
    await client.set('test:mcp', 'MCP Server works!');
    console.log('✅ Set test key');
    
    // Get the test key
    const value = await client.get('test:mcp');
    console.log(`✅ Retrieved value: ${value}`);
    
    // List some keys
    const keys = await client.keys('*');
    console.log(`✅ Found ${keys.length} keys in database`);
    
    // Cleanup
    await client.del('test:mcp');
    console.log('✅ Cleaned up test key');
    
    await client.quit();
    console.log('\n🎉 All tests passed! Redis connection is working.');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();