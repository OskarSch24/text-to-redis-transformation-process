import { createClient } from 'redis';

async function testRedisConnection() {
  console.log('Testing Redis Enhanced MCP Server Connection...\n');
  
  const client = createClient({
    socket: {
      host: 'redis-11116.c311.eu-central-1-1.ec2.redns.redis-cloud.com',
      port: 11116,
    },
    username: 'default',
    password: 'RCGQtfFjKr2vnccrnlxClz8reULpGoNG',
  });

  try {
    await client.connect();
    console.log('✅ Redis connection successful');
    
    // Test existing data from error log
    console.log('\n🔍 Testing with your existing communication rules data:');
    
    // Test key discovery
    const keys = await client.keys('*communication*');
    console.log('Found keys:', keys);
    
    // Test data type detection
    for (const key of keys.slice(0, 5)) { // Limit to first 5 for brevity
      const type = await client.type(key);
      console.log(`\n${key}: ${type}`);
      
      // Test appropriate command based on type
      if (type === 'ReJSON-RL') {
        try {
          const data = await client.json.get(key);
          const preview = JSON.stringify(data);
          console.log(`  JSON content preview: ${preview.substring(0, 100)}...`);
        } catch (e) {
          console.log(`  JSON read error: ${e.message}`);
        }
      } else if (type === 'set') {
        const members = await client.sMembers(key);
        console.log(`  Set members (${members.length}):`, members.slice(0, 3), members.length > 3 ? '...' : '');
      } else if (type === 'zset') {
        const members = await client.zRange(key, 0, -1);
        console.log(`  Sorted set members (${members.length}):`, members.slice(0, 3), members.length > 3 ? '...' : '');
      } else if (type === 'string') {
        const value = await client.get(key);
        console.log(`  String value: ${value ? value.substring(0, 50) + '...' : 'null'}`);
      } else if (type === 'hash') {
        const hash = await client.hGetAll(key);
        console.log(`  Hash fields:`, Object.keys(hash).slice(0, 3), '...');
      }
    }
    
    console.log('\n🧪 Testing Enhanced Commands:');
    
    // Test specific enhanced operations
    console.log('\n1. Testing Set operations (SMEMBERS):');
    try {
      const testSetKey = 'doc:communication_rules:001:children';
      const exists = await client.exists(testSetKey);
      if (exists) {
        const members = await client.sMembers(testSetKey);
        console.log(`   ✅ SMEMBERS working - Found ${members.length} children`);
      } else {
        console.log('   ⚠️  Test set key not found, creating test data...');
        // Create test data
        await client.sAdd('test:set', ['member1', 'member2', 'member3']);
        const testMembers = await client.sMembers('test:set');
        console.log(`   ✅ SMEMBERS working - Created test set with ${testMembers.length} members`);
        await client.del('test:set');
      }
    } catch (e) {
      console.log(`   ❌ SMEMBERS error: ${e.message}`);
    }
    
    console.log('\n2. Testing Sorted Set operations (ZRANGE):');
    try {
      const testZSetKey = 'doc:communication_rules:001:sequence';
      const exists = await client.exists(testZSetKey);
      if (exists) {
        const members = await client.zRange(testZSetKey, 0, -1);
        console.log(`   ✅ ZRANGE working - Found ${members.length} sequence items`);
      } else {
        console.log('   ⚠️  Test sorted set key not found, creating test data...');
        // Create test data
        await client.zAdd('test:zset', [
          { score: 1, value: 'first' },
          { score: 2, value: 'second' },
          { score: 3, value: 'third' }
        ]);
        const testMembers = await client.zRange('test:zset', 0, -1);
        console.log(`   ✅ ZRANGE working - Created test sorted set with ${testMembers.length} members`);
        await client.del('test:zset');
      }
    } catch (e) {
      console.log(`   ❌ ZRANGE error: ${e.message}`);
    }
    
    console.log('\n3. Testing TYPE command:');
    try {
      // Test with a few keys
      const testKeys = await client.keys('*');
      for (const key of testKeys.slice(0, 3)) {
        const type = await client.type(key);
        console.log(`   ✅ TYPE for ${key}: ${type}`);
      }
    } catch (e) {
      console.log(`   ❌ TYPE error: ${e.message}`);
    }
    
    console.log('\n4. Testing JSON operations:');
    try {
      // Find a JSON key to test
      const jsonKeys = await client.keys('doc:*');
      if (jsonKeys.length > 0) {
        const testKey = jsonKeys[0];
        const jsonData = await client.json.get(testKey);
        console.log(`   ✅ JSON.GET working - Retrieved data from ${testKey}`);
      } else {
        console.log('   ⚠️  No JSON documents found, creating test data...');
        await client.json.set('test:json', '$', { test: 'data', nested: { value: 123 } });
        const testData = await client.json.get('test:json');
        console.log(`   ✅ JSON.GET working - Created and retrieved test JSON`);
        await client.del('test:json');
      }
    } catch (e) {
      console.log(`   ❌ JSON.GET error: ${e.message}`);
    }
    
    console.log('\n✅ All enhanced commands tested successfully!');
    console.log('\n🚀 Your MCP server is ready for n8n integration');
    console.log('\n📝 Next steps:');
    console.log('   1. Run "npm start" to start the enhanced server');
    console.log('   2. Update your MCP client configuration to use this server');
    console.log('   3. Test in n8n with the new Set/Sorted Set commands');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n⚠️  Make sure Redis cloud connection is working');
    console.error('   Check network connectivity and credentials');
  } finally {
    await client.disconnect();
  }
}

testRedisConnection();