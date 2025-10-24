import { createClient } from 'redis';

async function debugRedisData() {
  console.log('🔍 Debugging Redis Data Structure...\n');
  
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
    
    // Check the sequence key specifically
    const sequenceKey = 'doc:communication_rules:001:sequence';
    const type = await client.type(sequenceKey);
    console.log(`${sequenceKey} type: ${type}`);
    
    if (type === 'set') {
      const members = await client.sMembers(sequenceKey);
      console.log(`Set members (${members.length}):`);
      members.forEach((member, i) => console.log(`  [${i}]: ${member}`));
    } else if (type === 'zset') {
      const members = await client.zRangeWithScores(sequenceKey, 0, -1);
      console.log(`Sorted set members (${members.length}):`);
      members.forEach((item, i) => console.log(`  [${i}]: ${item.value} (score: ${item.score})`));
    }
    
    // Check a few other keys to understand the pattern
    console.log('\n📊 Data Type Analysis:');
    const testKeys = [
      'doc:communication_rules:001:children',
      'ch:principles_in_communication:001:children', 
      'doc:communication_rules:001',
      'ch:principles_in_communication:001'
    ];
    
    for (const key of testKeys) {
      const keyType = await client.type(key);
      console.log(`${key}: ${keyType}`);
      
      if (keyType === 'set') {
        const count = await client.sCard(key);
        console.log(`  → Set with ${count} members`);
      } else if (keyType === 'ReJSON-RL') {
        console.log(`  → JSON document`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.disconnect();
  }
}

debugRedisData();