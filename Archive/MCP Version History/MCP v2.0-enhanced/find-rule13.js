import { createClient } from 'redis';

async function findRule13() {
  console.log('🔍 Searching for Rule 13 in Communication Rules...\n');
  
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
    
    // Search for rule-related keys
    const ruleKeys = await client.keys('*rule*13*');
    console.log('Keys containing "rule" and "13":', ruleKeys);
    
    // Also search more broadly for rule patterns
    const allRuleKeys = await client.keys('*rule_*');
    const rule13Keys = allRuleKeys.filter(key => key.includes('13'));
    console.log('\nRule keys containing "13":', rule13Keys);
    
    // If no exact match, let's look at all available rules
    if (rule13Keys.length === 0) {
      console.log('\nNo Rule 13 found. Let me check available rules...');
      const ruleNumbers = new Set();
      
      for (const key of allRuleKeys) {
        const match = key.match(/rule_(\d+)/);
        if (match) {
          ruleNumbers.add(parseInt(match[1]));
        }
      }
      
      const sortedRules = Array.from(ruleNumbers).sort((a, b) => a - b);
      console.log('Available rules:', sortedRules.join(', '));
      console.log(`Highest rule number: ${Math.max(...sortedRules)}`);
      
      if (Math.max(...sortedRules) >= 13) {
        // Try to find rule 13 with different patterns
        const possibleKeys = [
          'para:rule_13:001',
          'rule_13',
          'doc:communication_rules:001:rule_13',
          'ch:rule_13:001'
        ];
        
        for (const key of possibleKeys) {
          const exists = await client.exists(key);
          if (exists) {
            console.log(`\nFound possible Rule 13 key: ${key}`);
            const type = await client.type(key);
            if (type === 'ReJSON-RL') {
              const data = await client.json.get(key);
              console.log('Rule 13 content:', JSON.stringify(data, null, 2));
            }
          }
        }
      }
    } else {
      // Found rule 13 keys
      for (const key of rule13Keys) {
        console.log(`\nChecking ${key}:`);
        const type = await client.type(key);
        
        if (type === 'ReJSON-RL') {
          const data = await client.json.get(key);
          console.log('Content:', JSON.stringify(data, null, 2));
        } else if (type === 'set') {
          const members = await client.sMembers(key);
          console.log('Set members:', members);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.disconnect();
  }
}

findRule13();