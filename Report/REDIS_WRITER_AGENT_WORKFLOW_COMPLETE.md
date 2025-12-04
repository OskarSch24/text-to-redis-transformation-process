# Redis Writer Agent Workflow - Implementation Complete

**Date**: 2025-11-01  
**Status**: ✅ COMPLETE

---

## Overview

Successfully implemented a complete n8n workflow for intelligent, Redis-powered content generation. The system uses two AI agents (Query Reasoning + Content Generation) to dynamically fetch relevant brand context and create on-brand content.

---

## What Was Created

### 1. Database Schema Generator
**File**: `generate_redis_schema.py`

**Function**: Scans Redis database and creates a comprehensive schema/index

**Output**: 
- Local file: `redis_database_schema.json`
- Redis key: `index:database_schema`

**Schema Contents**:
```json
{
  "total_keys": 798,
  "documents": [
    {
      "title": "Brand Brief",
      "key": "doc:brand_brief:001",
      "total_chapters": 8
    },
    {
      "title": "Communication Rules",
      "key": "doc_[communication_rules]_001",
      "total_chapters": 1
    }
  ],
  "key_patterns": {
    "doc": "Document level",
    "ch": "Chapter level",
    "p": "Paragraph level",
    ...
  }
}
```

---

### 2. n8n Workflow JSON
**File**: `redis_writer_agent_workflow.json`

**Function**: Complete n8n workflow ready for import

**Architecture**: 11 nodes total

---

## Workflow Architecture

```
┌─────────────────┐
│  Chat Trigger   │  User inputs content request
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Get DB Schema   │  Fetch database index from Redis
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Query Reasoning │  AI analyzes request + schema
│   Agent (GPT-4.1)│  → Decides which Redis keys to fetch
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse Queries   │  Extract query list from AI output
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Split In Batches│  Loop through each query
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute Redis   │  Fetch data (runs in loop)
│     Query       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Aggregate       │  Combine all fetched data
│    Results      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Content Gen Agent│  AI creates final content
│    (GPT-5)      │  using aggregated context
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Respond to Chat │  Return generated content
└─────────────────┘
```

---

## Key Features

### ✅ Intelligent Query Planning
- AI analyzes user request + database schema
- Dynamically selects most relevant Redis keys
- No static queries - fully adaptive

### ✅ Two-Stage AI Processing
1. **Query Reasoning Agent (GPT-4.1)**
   - Analyzes user input
   - Plans database queries
   - Temperature: 0.3 (precise)
   - Max tokens: 1000

2. **Content Generation Agent (GPT-5)**
   - Creates final content
   - Uses aggregated brand context
   - Temperature: 0.7 (creative)
   - Max tokens: 2000

### ✅ Dynamic Data Retrieval
- Loops through AI-selected queries
- Fetches only relevant data
- Aggregates results before generation

### ✅ Full Brand Context Awareness
- Access to entire Redis database
- Communication Rules
- Brand Brief
- Visual Guidelines
- Business Philosophy

---

## Node Details

| # | Node Name | Type | Purpose |
|---|-----------|------|---------|
| 1 | Chat Trigger | langchain.chatTrigger | User input interface |
| 2 | Get Database Schema | redis | Fetch schema from Redis |
| 3 | Query Reasoning Agent | langchain.agent | AI query planner |
| 4 | OpenAI Chat Model GPT-4.1 | lmChatOpenAi | Language model for reasoning |
| 5 | Parse Queries | code | Extract queries from AI output |
| 6 | Split In Batches | splitInBatches | Loop through queries |
| 7 | Execute Redis Query | redis | Fetch data (in loop) |
| 8 | Aggregate Results | aggregate | Combine fetched data |
| 9 | Content Generation Agent | langchain.agent | AI content creator |
| 10 | OpenAI Chat Model GPT-5 | lmChatOpenAi | Language model for generation |
| 11 | Respond to Chat | respondToWebhook | Return result to user |

---

## Required Credentials in n8n

Before importing the workflow, configure these credentials in n8n:

### 1. Redis Cloud - Main Database
**Type**: Redis  
**ID**: `redis-cloud-main`

**Settings**:
- Host: `redis-13515.fcrce173.eu-west-1-1.ec2.redns.redis-cloud.com`
- Port: `13515`
- Password: `WNWF6sNqFg5e2N5wjWLvoMfdBuMGTdKT`
- Database: `0`

### 2. OpenAI Account
**Type**: OpenAI API  
**ID**: `openai-main`

**Settings**:
- API Key: [Your OpenAI API Key]
- Organization ID: [Optional]

---

## How to Import & Use

### Step 1: Import Workflow
1. Open n8n instance: `https://primary-production-6445.up.railway.app/`
2. Go to **Workflows** → **Import from File**
3. Select: `redis_writer_agent_workflow.json`
4. Click **Import**

### Step 2: Configure Credentials
1. Click on "Get Database Schema" node
2. Set Redis credential → `redis-cloud-main`
3. Click on "Execute Redis Query" node
4. Set Redis credential → `redis-cloud-main`
5. Click on "OpenAI Chat Model - GPT-4.1" node
6. Set OpenAI credential → `openai-main`
7. Click on "OpenAI Chat Model - GPT-5" node
8. Set OpenAI credential → `openai-main`

### Step 3: Activate Workflow
1. Click **Save** in top right
2. Click **Active** toggle to enable

### Step 4: Test
1. Click **Test Workflow**
2. Enter in chat: "Schreibe mir einen LinkedIn Post über Sales Mastery"
3. Watch the workflow execute
4. Review generated content

---

## Example Test Inputs

```
"Schreibe mir einen LinkedIn Post über Sales Mastery"
→ Should fetch: Brand identity, communication rules, sales content
→ Output: Professional LinkedIn post

"Erstelle eine Email für unser Skool Community Angebot"
→ Should fetch: Offer & service, brand voice, communication rules
→ Output: Persuasive email copy

"Generiere einen YouTube Video Titel über Personal Branding"
→ Should fetch: Brand philosophy, communication rules
→ Output: Catchy, SEO-optimized title

"Schreibe einen Instagram Caption für ein Sales Coaching Reel"
→ Should fetch: Brand personality, visual guidelines, communication rules
→ Output: Engaging caption with emojis/hashtags
```

---

## System Prompts

### Query Reasoning Agent Prompt (Excerpt)
```
You are an intelligent query planner for a Redis database 
containing brand content and communication guidelines.

## Your Task
Analyze the user's content request and the database schema 
to determine which Redis keys should be fetched to provide 
the most relevant context.

## Output Format
Respond with ONLY a valid JSON object:
{
  "queries": [
    {"key": "doc:brand_brief:001", "reason": "Need overall brand context"}
  ],
  "content_type": "LinkedIn Post",
  "key_themes": ["sales", "authority"]
}
```

### Content Generation Agent Prompt (Excerpt)
```
You are a professional content creator for AMQ (Acquainted) brand.

## Your Task
Create high-quality, on-brand content that:
1. Matches the requested format and platform
2. Follows communication rules from the database
3. Reflects brand identity and personality
4. Is engaging, clear, and actionable
```

---

## Performance Expectations

### Query Reasoning Stage
- **Duration**: ~3-5 seconds
- **Cost**: ~$0.01 per request (GPT-4.1)
- **Output**: 3-5 Redis keys to fetch

### Data Retrieval Stage
- **Duration**: ~1-2 seconds
- **Cost**: Negligible (Redis operations)
- **Data**: Typically 5-20KB of context

### Content Generation Stage
- **Duration**: ~5-10 seconds
- **Cost**: ~$0.02-0.05 per request (GPT-5)
- **Output**: 100-500 words of content

### Total
- **End-to-End**: ~10-20 seconds
- **Total Cost**: ~$0.03-0.06 per content piece

---

## Files Created

1. ✅ `/Users/oskarschiermeister/Desktop/Database Project/generate_redis_schema.py`
   - Python script for schema generation
   
2. ✅ `/Users/oskarschiermeister/Desktop/Database Project/redis_database_schema.json`
   - Generated schema (798 keys indexed)
   
3. ✅ `/Users/oskarschiermeister/Desktop/Database Project/redis_writer_agent_workflow.json`
   - Complete n8n workflow (ready to import)

4. ✅ Redis key: `index:database_schema`
   - Schema stored in Redis for agent access

---

## Next Steps

### Immediate
1. Import workflow into n8n
2. Configure credentials
3. Test with various content requests
4. Monitor performance and costs

### Short-term Improvements
1. Add error handling for failed Redis queries
2. Implement retry logic for AI agents
3. Add logging/tracking for query patterns
4. Create feedback mechanism for successful queries

### Long-term Enhancements
1. Implement learning system (track successful queries)
2. Add A/B testing for different prompts
3. Create analytics dashboard
4. Build content performance tracking
5. Expand to handle images/videos

---

## Troubleshooting

### Issue: "Could not resolve credential"
**Solution**: Ensure Redis and OpenAI credentials are configured with exact IDs: `redis-cloud-main` and `openai-main`

### Issue: "Query Reasoning Agent returns invalid JSON"
**Solution**: The Parse Queries node has fallback logic. Check node execution data to see what AI returned.

### Issue: "Redis connection timeout"
**Solution**: Verify Redis Cloud instance is running and credentials are correct. Test with Redis node in isolation.

### Issue: "Split In Batches not looping"
**Solution**: Ensure Parse Queries node returns array of items. Each item needs `json.key` field.

---

## Success Metrics

### ✅ Implementation Complete
- Schema generator: Working
- Schema uploaded to Redis: ✅ `index:database_schema`
- Workflow JSON: Created and valid
- All 11 nodes configured
- Credentials defined
- Connections mapped

### 📊 Database Stats
- Total Keys: 798
- Documents: 2 (Brand Brief, Communication Rules)
- Chapters: 9
- Paragraphs: 47
- Subparagraphs: 124
- Sub-subparagraphs: 63
- Chunks: 553

---

## Architecture Decisions

### Why Two AI Agents?
- **Separation of concerns**: Query planning ≠ Content creation
- **Different temperatures**: Reasoning needs precision (0.3), creation needs creativity (0.7)
- **Better costs**: Use expensive model (GPT-4.1) only for planning
- **Easier debugging**: Can inspect what queries were planned before generation

### Why Split In Batches?
- **Sequential processing**: Redis queries execute one by one
- **Error isolation**: One failed query doesn't break entire workflow
- **Scalability**: Can handle 1-10 queries without modification

### Why Aggregate?
- **Single context**: Content agent receives all data at once
- **Better coherence**: AI can see relationships between fetched data
- **Simpler prompt**: No need to handle multiple data chunks separately

---

## Comparison to Writer Agent System

### Similarities ✅
- Uses AI agents for intelligent processing
- Fetches dynamic data based on context
- Separates reasoning from generation
- Brand context awareness

### Differences 🔄
- **Simpler**: 11 nodes vs complex Writer Agent System
- **Single-purpose**: Only content creation (no campaign orchestration)
- **No Redis writing**: Read-only operations
- **Minimal**: No scheduling, no multi-channel, no analytics
- **Test-friendly**: Easy to test and iterate

### This is a Minimal Viable Product (MVP)
Perfect for testing Redis integration and AI reasoning before building the full Writer Agent System.

---

## Conclusion

The Redis Writer Agent workflow is **ready for testing in n8n**. It demonstrates the core reasoning architecture needed for intelligent content creation and validates the Redis database structure.

**Status**: ✅ Complete and ready for import  
**Next Action**: Import into n8n and test with real content requests

---

*Generated: 2025-11-01*  
*Project: Database Project - Redis Writer Agent Implementation*

