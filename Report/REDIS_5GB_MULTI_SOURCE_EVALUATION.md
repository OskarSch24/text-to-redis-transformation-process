# Redis 5GB Multi-Source Database Evaluation

**Date:** October 31, 2025  
**Prepared for:** Oskar Sch.  
**Purpose:** Evaluate whether a single 5GB Redis database can reliably store and query multiple data sources for AI applications

---

## Executive Summary

**Short Answer:** YES, a single 5GB Redis database can reliably handle multiple data sources for AI querying, **BUT** you must implement proper key namespacing and use Redis JSON with the Query Engine for accurate retrieval.

**Key Findings:**
- **Capacity:** 5GB can hold approximately **40,000-50,000 "pages"** (based on your transformation structure)
- **Data Isolation:** Using proper key prefixes prevents cross-contamination
- **Query Accuracy:** JSON.GET with path queries ensures precise data retrieval
- **Recommended Strategy:** Use document-type prefixes with unique namespaces

---

## 1. Data Volume Assessment

### How Much Can 5GB Actually Hold?

Based on your transformation structure from `communication_rules_redis_transformation.md`:

#### Average Size Per "Page" (Your Structure)
A typical transformed page in your system contains:

1. **Document Level** (`doc:*`)
   - Metadata: ~500 bytes
   - Title, author, context: ~200 bytes
   - Total: ~700 bytes

2. **Chapter Level** (`ch:*`) 
   - Metadata + content: ~800-1,200 bytes
   - Average: ~1,000 bytes

3. **Paragraph Level** (`para:*`)
   - Guidelines/content: ~500-800 bytes
   - Average: ~650 bytes

**Your Communication Rules Document:**
- 1 document entry
- 11 chapter entries  
- 46 paragraph entries
- **Total: 58 entries**
- **Estimated total size: ~65KB** (including JSON overhead and SET operations)

### Calculation for 5GB

```
Total Available: 5GB = 5,000,000,000 bytes

Average "document package" (1 doc + chapters + paragraphs): ~65KB

Theoretical Maximum: 5,000,000 KB ÷ 65 KB ≈ 76,923 documents

Practical Capacity (accounting for Redis overhead, indexes, metadata):
• Conservative estimate: 40,000-50,000 complete documents
• Or: 2-2.5 million individual entries (if mixed with smaller data)
```

### Real-World Translation

**If each "page" equals one chapter with guidelines:**
- **50,000 pages** = approximately **9,000-12,000 complete documents** like your Communication Rules

**If you're storing smaller knowledge base articles:**
- Simple FAQ (1-2KB each): **2-2.5 million articles**
- Product descriptions (3-5KB): **1-1.5 million products**
- Blog posts (10-15KB): **300,000-500,000 posts**

---

## 2. Data Isolation & Preventing Cross-Contamination

### The Problem: How to Keep Data Sources Separate

When you store multiple data types in one database, you need to prevent the AI from:
- Pulling a product description when asked about communication rules
- Mixing FAQ answers with training documentation
- Confusing data from different clients or projects

### The Solution: Hierarchical Key Namespacing

Based on your existing structure, here's the recommended strategy:

#### **Tier 1: Data Source Prefix**
```redis
# Format: {source_type}:{source_name}:{record_type}:{id}

# Examples:
docs:communication_rules:doc:001
docs:communication_rules:ch:001
docs:communication_rules:para:001

kb:product_catalog:doc:001
kb:product_catalog:item:001

faq:customer_support:doc:001
faq:customer_support:question:001

training:employee_handbook:doc:001
training:employee_handbook:section:001
```

#### **Tier 2: Client/Company Isolation**
```redis
# Format: {company_id}:{source_type}:{source_name}:{record_type}:{id}

# Examples:
comp_AMQ:docs:communication_rules:doc:001
comp_AMQ:docs:brand_brief:doc:001

comp_ClientB:docs:communication_rules:doc:001  # Different client, same doc type
comp_ClientB:kb:products:item:001
```

#### **Tier 3: User Isolation** (if needed)
```redis
# Format: {user_id}:{company_id}:{source_type}:{source_name}:{record_type}:{id}

user_001:comp_AMQ:docs:communication_rules:doc:001
```

### Your Enhanced Structure

Here's your existing structure with improved namespacing:

```redis
# BEFORE (current)
JSON.SET doc:communication_rules:001 $ '{...}'
JSON.SET ch:communication_rules:001 $ '{...}'
JSON.SET para:communication_rules:001 $ '{...}'

# AFTER (recommended)
JSON.SET comp_AMQ:docs:communication_rules:doc:001 $ '{
  "namespace": "comp_AMQ",
  "source_type": "docs",
  "source_name": "communication_rules",
  "document_id": "doc_communication_rules_001",
  "user_id": "user_[Oskar Sch.]_001",
  "company_id": "comp_[AMQ]_001",
  "level": "document",
  ...existing fields...
}'

JSON.SET comp_AMQ:kb:products:item:001 $ '{
  "namespace": "comp_AMQ",
  "source_type": "kb",
  "source_name": "products",
  "product_id": "prod_001",
  "level": "item",
  ...product fields...
}'
```

---

## 3. Ensuring Accurate Data Retrieval

### The Challenge: Querying the Right Source

When your AI asks a question, you need to:
1. Identify which data source to query
2. Retrieve ONLY from that source
3. Prevent contamination from other sources

### Strategy 1: Source-Specific Queries

```redis
# Query ONLY from communication_rules
JSON.GET comp_AMQ:docs:communication_rules:doc:001

# Query ONLY from product catalog
KEYS comp_AMQ:kb:products:*

# Get all paragraphs from communication_rules
KEYS comp_AMQ:docs:communication_rules:para:*
```

### Strategy 2: Metadata Filtering

Add source tracking to every record:

```json
{
  "namespace": "comp_AMQ",
  "source_type": "docs",
  "source_name": "communication_rules",
  "document_id": "doc_communication_rules_001",
  "metadata": {
    "data_source": "communication_rules",
    "data_type": "guideline_document",
    "created_date": "2025-08-17",
    "version": "1.0"
  }
}
```

Then query with filters:

```redis
# Pseudo-query (using JSON path filtering)
JSON.GET * WHERE $.metadata.data_source == "communication_rules"
```

### Strategy 3: Redis Search Index (Recommended for AI Queries)

If you're using **Redis with the Query Engine** (which supports JSON indexing), create separate indexes per source:

```redis
# Create index for communication rules
FT.CREATE idx:comp_AMQ:docs:communication_rules 
  ON JSON 
  PREFIX 1 comp_AMQ:docs:communication_rules: 
  SCHEMA 
    $.title AS title TEXT
    $.text AS text TEXT
    $.category AS category TAG
    $.type AS type TAG
    $.context_document AS context_document TAG

# Create index for products
FT.CREATE idx:comp_AMQ:kb:products
  ON JSON
  PREFIX 1 comp_AMQ:kb:products:
  SCHEMA
    $.product_name AS product_name TEXT
    $.description AS description TEXT
    $.category AS category TAG
```

Then search within specific indexes:

```redis
# Search ONLY in communication rules
FT.SEARCH idx:comp_AMQ:docs:communication_rules "authority leadership"

# Search ONLY in products
FT.SEARCH idx:comp_AMQ:kb:products "wireless headphones"
```

---

## 4. Best Data Structure: JSON.SET for AI Queries

### Why JSON is Ideal for Your Use Case

1. **Hierarchical Data:** Your documents have natural hierarchy (doc → ch → para)
2. **Flexible Schema:** Different data sources have different fields
3. **Rich Queries:** JSON path expressions allow precise retrieval
4. **No Schema Migration:** Add new fields without restructuring

### Your Current Structure (Excellent!)

```redis
JSON.SET comp_AMQ:docs:communication_rules:ch:001 $ '{
  "user_id": "user_[Oskar Sch.]_001",
  "company_id": "comp_[AMQ]_001",
  "document_id": "doc_[communication_rules]_001",
  "level": "chapter",
  "parent": "doc:communication_rules:001",
  "position": 1,
  "context_document": "communication_rules",
  "context_chapter": "principles_in_communication",
  "title": "Rule 01: Principles in Communication",
  "text": "...",
  "type": "rule",
  "rule_number": 1,
  "category": "authority",
  "guidelines_count": 7
}'
```

### Recommended Enhancements

Add source isolation fields:

```json
{
  "namespace": "comp_AMQ",
  "source_type": "docs",
  "source_name": "communication_rules",
  "isolation": {
    "company_id": "comp_[AMQ]_001",
    "user_id": "user_[Oskar Sch.]_001",
    "access_level": "private"
  },
  "hierarchy": {
    "level": "chapter",
    "parent_key": "comp_AMQ:docs:communication_rules:doc:001",
    "position": 1
  },
  "context": {
    "document": "communication_rules",
    "chapter": "principles_in_communication",
    "document_id": "doc_[communication_rules]_001"
  },
  "content": {
    "title": "Rule 01: Principles in Communication",
    "text": "...",
    "type": "rule",
    "rule_number": 1,
    "category": "authority"
  },
  "metadata": {
    "created": "2025-08-17",
    "modified": "2025-08-17",
    "version": "1.0",
    "indexed": true
  }
}
```

---

## 5. Preventing Retrieval Errors (Technical Measures)

### Error Type 1: Querying the Wrong Source

**Problem:** AI asks about "communication rules" but gets product data

**Solution:**
```redis
# Use explicit key patterns
KEYS comp_AMQ:docs:communication_rules:*

# Never use broad wildcards
KEYS *  # ❌ DANGEROUS - returns everything
```

### Error Type 2: Partial Key Matches

**Problem:** Searching for `rules` matches `communication_rules` AND `shipping_rules`

**Solution:** Use exact namespace matching in queries
```redis
# Good: Specific namespace
KEYS comp_AMQ:docs:communication_rules:*

# Bad: Ambiguous pattern
KEYS *:rules:*  # Could match multiple sources
```

### Error Type 3: Missing Context

**Problem:** Retrieved paragraph without knowing which document it belongs to

**Solution:** Always include parent references
```json
{
  "hierarchy": {
    "parent_key": "comp_AMQ:docs:communication_rules:doc:001",
    "parent_title": "Communication Rules",
    "breadcrumb": ["Document", "Chapter 1", "Paragraph 3"]
  }
}
```

### Error Type 4: Stale Data

**Problem:** AI retrieves outdated version of content

**Solution:** Use version tracking
```json
{
  "metadata": {
    "version": "1.2",
    "created": "2025-08-17",
    "modified": "2025-10-31",
    "supersedes": "comp_AMQ:docs:communication_rules:ch:001:v1.1"
  }
}
```

---

## 6. Complete Indexing Strategy

### Option A: Relationship Sets (Your Current Approach)

```redis
# Document children
SADD comp_AMQ:docs:communication_rules:doc:001:children 
  comp_AMQ:docs:communication_rules:ch:001 
  comp_AMQ:docs:communication_rules:ch:002
  comp_AMQ:docs:communication_rules:ch:003

# Chapter children
SADD comp_AMQ:docs:communication_rules:ch:001:children
  comp_AMQ:docs:communication_rules:para:001
  comp_AMQ:docs:communication_rules:para:002

# Query: Get all children of a document
SMEMBERS comp_AMQ:docs:communication_rules:doc:001:children
```

**Pros:**
- Fast hierarchical queries
- Simple to implement
- Low memory overhead

**Cons:**
- Manual maintenance of relationships
- No full-text search

### Option B: Redis Search Indexes (Recommended for AI)

```redis
# Create comprehensive search index
FT.CREATE idx:comp_AMQ:docs:communication_rules
  ON JSON
  PREFIX 1 comp_AMQ:docs:communication_rules:
  SCHEMA
    $.hierarchy.level AS level TAG
    $.content.title AS title TEXT WEIGHT 2.0
    $.content.text AS text TEXT
    $.content.category AS category TAG
    $.content.type AS type TAG
    $.context.document AS document TAG
    $.context.chapter AS chapter TAG
    $.metadata.created AS created NUMERIC SORTABLE

# AI-powered search query
FT.SEARCH idx:comp_AMQ:docs:communication_rules 
  "@text:(authority leadership) @category:{principles}"
  RETURN 3 $.content.title $.content.text $.hierarchy.level
  LIMIT 0 10
```

**Pros:**
- Full-text search capabilities
- Semantic querying
- Relevance scoring
- Faceted filtering

**Cons:**
- Higher memory usage (~10-15% overhead)
- Index rebuild needed for schema changes

---

## 7. Practical Implementation Guide

### Phase 1: Namespace Strategy

1. **Define your source types:**
```
docs     = Documentation/Knowledge documents
kb       = Knowledge base articles
faq      = Frequently asked questions
products = Product catalog
training = Training materials
```

2. **Create namespace mapping:**
```json
{
  "namespaces": {
    "comp_AMQ": {
      "sources": {
        "docs": ["communication_rules", "brand_brief", "customer_journey"],
        "kb": ["product_catalog", "support_articles"],
        "faq": ["customer_support", "technical_qa"]
      }
    }
  }
}
```

### Phase 2: Key Naming Convention

**Template:**
```
{company_id}:{source_type}:{source_name}:{record_type}:{id}
```

**Examples:**
```
comp_AMQ:docs:communication_rules:doc:001
comp_AMQ:docs:communication_rules:ch:001
comp_AMQ:docs:communication_rules:para:001

comp_AMQ:kb:products:doc:001
comp_AMQ:kb:products:item:001
comp_AMQ:kb:products:item:002

comp_AMQ:faq:support:doc:001
comp_AMQ:faq:support:question:001
comp_AMQ:faq:support:answer:001
```

### Phase 3: Transformation Process Updates

Update your transformation process to include namespacing:

**Before:**
```redis
JSON.SET doc:communication_rules:001 $ '{...}'
```

**After:**
```redis
JSON.SET comp_AMQ:docs:communication_rules:doc:001 $ '{
  "namespace": "comp_AMQ",
  "source_type": "docs",
  "source_name": "communication_rules",
  ...existing fields...
}'
```

### Phase 4: Query Wrapper Function

Create a query helper that enforces namespace isolation:

```python
def query_source(company_id, source_type, source_name, query_text):
    """
    Query a specific data source with automatic namespace isolation
    """
    # Build namespace prefix
    prefix = f"{company_id}:{source_type}:{source_name}:"
    
    # Build index name
    index_name = f"idx:{company_id}:{source_type}:{source_name}"
    
    # Execute search within isolated namespace
    results = redis.execute_command(
        'FT.SEARCH', 
        index_name, 
        query_text,
        'LIMIT', 0, 10
    )
    
    return results

# Usage:
results = query_source(
    company_id="comp_AMQ",
    source_type="docs",
    source_name="communication_rules",
    query_text="authority principles"
)
```

---

## 8. Validation & Testing Strategy

### Test 1: Namespace Isolation

```redis
# Store data in two different sources
JSON.SET comp_AMQ:docs:communication_rules:para:001 $ '{"text": "Authority test"}'
JSON.SET comp_AMQ:kb:products:item:001 $ '{"text": "Authority test"}'

# Verify isolation - should return ONLY communication_rules
KEYS comp_AMQ:docs:communication_rules:*
# Expected: 1 result

# Verify no cross-contamination
KEYS comp_AMQ:kb:products:*
# Expected: 1 result (different from above)
```

### Test 2: Query Accuracy

```redis
# Create test index
FT.CREATE idx:test ON JSON PREFIX 1 comp_AMQ:docs:communication_rules: SCHEMA $.content.text AS text TEXT

# Search - should only return from communication_rules
FT.SEARCH idx:test "authority"
# Expected: Only communication_rules results, NOT product results
```

### Test 3: Capacity Testing

```redis
# Check memory usage
INFO memory

# Check key count per namespace
KEYS comp_AMQ:docs:communication_rules:* | wc -l
KEYS comp_AMQ:kb:products:* | wc -l
```

---

## 9. Recommended Database Organization

### Single Database with Multiple Namespaces (Recommended)

**Use ONE 5GB Redis database with namespace prefixes:**

```
Database: redis_main (5GB)
├── comp_AMQ:docs:communication_rules:* (~65KB)
├── comp_AMQ:docs:brand_brief:* (~80KB)
├── comp_AMQ:kb:products:* (~2MB)
├── comp_AMQ:faq:support:* (~500KB)
├── comp_ClientB:docs:* (~100KB)
└── ...

Total: ~3-4GB used, 1-2GB buffer
```

**Advantages:**
- Simple connection management
- Easy backup/restore
- Lower infrastructure costs
- Atomic operations across all data

**When to Use:**
- Total data < 4GB
- All data belongs to same business unit
- Shared Redis instance acceptable
- Performance requirements moderate

### Multiple Databases (Alternative)

**Use Redis database numbers (0-15) for hard isolation:**

```
Database 0: comp_AMQ (all AMQ data)
Database 1: comp_ClientB (all ClientB data)
Database 2: shared_kb (shared knowledge base)
```

```redis
# Connect to specific database
SELECT 0  # AMQ data
SELECT 1  # ClientB data
```

**Advantages:**
- Complete isolation per database
- Separate memory limits per DB
- Independent flush/clear operations

**Disadvantages:**
- Cannot query across databases
- More complex connection handling
- 15 database limit in Redis

**When to Use:**
- Strong isolation requirements
- Different security levels
- Independent scaling needs
- Multi-tenant application

---

## 10. Memory Optimization Tips

### Tip 1: Use Compression for Large Text

```json
{
  "content": {
    "text_compressed": true,
    "text": "<base64-compressed-string>",
    "text_original_size": 5000,
    "text_compressed_size": 1200
  }
}
```

### Tip 2: Deduplicate Metadata

Instead of repeating metadata in every entry:

**Bad (Wasteful):**
```json
{
  "user_id": "user_[Oskar Sch.]_001",
  "company_id": "comp_[AMQ]_001",
  "company_name": "AMQ Marketing",
  "user_email": "oskar@amq.com"
}
```

**Good (Efficient):**
```json
{
  "user_ref": "user_001",
  "company_ref": "comp_AMQ"
}

// Store full details once:
JSON.SET meta:user:001 $ '{"id": "user_001", "email": "oskar@amq.com"}'
JSON.SET meta:company:AMQ $ '{"id": "comp_AMQ", "name": "AMQ Marketing"}'
```

### Tip 3: Use Integer IDs Instead of String IDs

**Bad:** `para:communication_rules:001` (25 bytes)  
**Good:** `para:cr:1` (9 bytes)  
**Savings:** 64% reduction × 1 million keys = **huge savings**

### Tip 4: Monitor Memory Usage

```redis
# Check current memory usage
INFO memory

# Check key count
DBSIZE

# Check largest keys
MEMORY USAGE key_name

# Sample memory distribution
MEMORY STATS
```

---

## 11. Reliability Guarantees

### Data Persistence

Enable both RDB and AOF for maximum reliability:

```redis
# redis.conf
save 900 1       # Save after 15 minutes if 1 key changed
save 300 10      # Save after 5 minutes if 10 keys changed
save 60 10000    # Save after 1 minute if 10,000 keys changed

appendonly yes
appendfsync everysec
```

### Backup Strategy

```bash
# Daily full backup
redis-cli --rdb /backup/redis_dump_$(date +%Y%m%d).rdb

# Continuous AOF backup
cp /var/lib/redis/appendonly.aof /backup/
```

### Data Validation

Add checksums to ensure data integrity:

```json
{
  "content": {
    "text": "...",
    "checksum": "sha256:abc123..."
  },
  "metadata": {
    "validated": true,
    "validation_date": "2025-10-31"
  }
}
```

---

## 12. Final Recommendations

### ✅ DO THIS:

1. **Use hierarchical key namespacing** with company/source/type prefixes
2. **Add JSON metadata fields** for `namespace`, `source_type`, `source_name`
3. **Create separate Redis Search indexes** per data source
4. **Implement query wrappers** that enforce namespace isolation
5. **Use JSON.SET for all structured data**
6. **Maintain relationship SETs** for hierarchical navigation
7. **Enable persistence** (RDB + AOF)
8. **Monitor memory usage** regularly
9. **Test namespace isolation** before production

### ❌ DON'T DO THIS:

1. ❌ Use generic keys without namespace prefixes
2. ❌ Store different data types with overlapping key names
3. ❌ Use wildcard queries (`KEYS *`) in production
4. ❌ Mix different data sources in same key pattern
5. ❌ Skip version tracking in metadata
6. ❌ Forget to index frequently-queried fields
7. ❌ Disable persistence to "save memory"
8. ❌ Use String keys for structured data
9. ❌ Assume Redis will auto-isolate data

---

## 13. Capacity Planning Table

| Data Type | Avg Size/Entry | Entries per GB | 5GB Capacity |
|-----------|---------------|----------------|--------------|
| Simple FAQ | 1-2 KB | 500,000-1,000,000 | 2.5-5M |
| Knowledge Base Articles | 3-5 KB | 200,000-333,000 | 1-1.6M |
| Product Descriptions | 5-10 KB | 100,000-200,000 | 500K-1M |
| Complex Documents (like yours) | 50-100 KB | 10,000-20,000 | 50K-100K |
| Full Guides (multi-chapter) | 200-500 KB | 2,000-5,000 | 10K-25K |

**Your Communication Rules type documents:** ~65KB each  
**Expected capacity:** **40,000-50,000 complete documents** or **2-2.5 million individual entries**

---

## 14. Next Steps

1. **Update your transformation process** to include namespace prefixes
2. **Create a source registry** documenting all data source namespaces
3. **Build query wrapper functions** that enforce isolation
4. **Set up Redis Search indexes** for each major data source
5. **Implement memory monitoring** dashboard
6. **Create test suite** validating namespace isolation
7. **Document query patterns** for your AI system

---

## Conclusion

**YES**, a single 5GB Redis database can reliably handle multiple data sources for AI querying, provided you:

1. Use proper **hierarchical key namespacing**
2. Implement **Redis Search indexes** per source
3. Add **metadata fields** for source identification
4. Create **query wrappers** that enforce isolation
5. Monitor **memory usage** and stay under 4GB

With your current transformation structure, you can store **40,000-50,000 complete documents** like Communication Rules, or mix smaller entries for **millions of individual knowledge base items**.

The key to preventing retrieval errors is **namespace discipline**—always query with specific prefixes and never use broad wildcards in production.

Your current structure is excellent. Just add the namespace prefixes and create per-source indexes, and you'll have a robust, scalable system.

---

**Questions? Let me know what you'd like me to clarify or expand on!**

