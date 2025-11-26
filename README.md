# Text-to-Redis Transformation System

> **Production-ready system for transforming structured Markdown documents into hierarchical Redis databases**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Redis](https://img.shields.io/badge/Redis-6.0+-red.svg)](https://redis.io/)
[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://www.python.org/)

## 🚀 Quick Start

Choose your approach based on your needs:

### ⚡ **Fast Track: Automated Python Pipeline**
```bash
python3 python-toolkit/transform_markdown.py \
  --redis-url "redis://default:password@host:port" \
  --markdown your_document.md
```

### 🤖 **AI-Assisted: Claude/Cursor Prompts**
1. Open your document in Claude Code or Cursor
2. Use prompts from `ai-prompts/prompts/main_transformation_prompt_fixed.md`
3. Copy generated Redis commands and execute

---

## 📋 Table of Contents

- [Overview](#overview)
- [Two Approaches](#two-approaches)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
- [Document Structure](#document-structure)
- [Redis Schema](#redis-schema)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🎯 Overview

This system solves a critical problem for RAG (Retrieval-Augmented Generation) systems and AI workflows:

**Problem:** Large structured documents (50-200+ pages) are difficult for AI systems to search and understand because hierarchical context is lost.

**Solution:** Intelligent document decomposition into small, context-rich chunks stored in Redis with full hierarchy preservation for lightning-fast semantic search.

### Key Features

- ✅ **100% Text Preservation** - Never summarizes or truncates
- ✅ **Hierarchy Maintenance** - Complete parent-child relationships
- ✅ **5-Level Structure** - Document → Chapter → Paragraph → Subparagraph → Chunk
- ✅ **Redis Optimized** - Flat, performant JSON structures
- ✅ **RAG-Ready** - Vector embedding optimized chunk sizes
- ✅ **Production Tested** - Handles documents up to 200+ pages
- ✅ **Dual Approach** - AI-assisted OR fully automated

---

## 🛠️ Two Approaches

### Approach 1: Python Automation (Production)

**Best for:** Batch processing, CI/CD, production workflows

```
User → Python Script → Redis Upload (30 seconds - 2 minutes)
```

**Features:**
- One-command execution
- Direct Redis upload
- Built-in error handling
- Progress tracking
- ~25-50 entries/second

**When to use:**
- Processing 10+ documents
- Automated workflows
- Speed is critical
- Consistent transformations needed

### Approach 2: AI Prompts (Experimentation)

**Best for:** One-off transformations, experimentation, no Python setup

```
User → AI Prompt → Generated Commands → Manual Redis Upload
```

**Features:**
- No code execution required
- Works with any AI (Claude, ChatGPT, etc.)
- Highly flexible
- Extensive validation prompts
- German language optimized

**When to use:**
- 1-5 documents
- Experimenting with structure
- No Python environment
- Maximum flexibility needed

---

## 📦 Installation

### Prerequisites

- **Redis 6.0+** with RedisJSON module
- **Python 3.7+** (for automation approach)
- **Claude Code/Cursor** (for AI approach)

### Setup

```bash
# Clone repository
git clone https://github.com/OskarSch24/text-to-redis-transformation-system.git
cd text-to-redis-transformation-system

# Install dependencies
pip install redis

# Verify Python (if using automation)
python3 --version
```

---

## 💡 Usage Examples

### Example 1: Automated Transformation

```bash
# Basic usage
python3 python-toolkit/transform_markdown.py \
  --redis-url "redis://default:pass@host:15654" \
  --markdown Documents/investment_guide.md

# With custom naming
python3 python-toolkit/transform_markdown.py \
  --redis-url "redis://default:pass@host:15654" \
  --markdown brand_brief.md \
  --doc-name "Brand Strategy 2024" \
  --doc-key "doc:brand_strategy_2024:001"

# Skip if exists
python3 python-toolkit/transform_markdown.py \
  --redis-url "redis://default:pass@host:15654" \
  --markdown report.md \
  --skip-existing
```

### Example 2: AI-Assisted Transformation

**Step 1:** Load document into Claude/Cursor

**Step 2:** Apply transformation prompt
```
[Paste contents of ai-prompts/prompts/main_transformation_prompt_fixed.md]
[Paste your markdown document]
```

**Step 3:** Receive Redis commands
```redis
JSON.SET doc:example:001 $ '{"title":"Example","author":"You",...}'
SADD doc:example:001:children ch:chapter1:001
```

**Step 4:** Validate (optional)
```
[Use ai-prompts/prompts/structure_validation_prompt.md]
```

**Step 5:** Execute in Redis
```bash
redis-cli -u redis://your-url < generated_commands.txt
```

---

## 📄 Document Structure

### Required Format

Your markdown files must include YAML front matter:

```markdown
---
title: "Your Document Title"
author: "Author Name"
created: "2024-12-27"
category: "category" # optional
tags: ["tag1", "tag2"] # optional
language: "en" # optional
---

# Chapter 1: Introduction

This is the chapter content.

## Section 1.1: Overview

This is a paragraph with important information.

### Subsection 1.1.1: Details

Specific details go here.

More content continues...

## Section 1.2: Another Topic

Additional content...
```

### Hierarchy Mapping

| Markdown | Level | Redis Prefix | Example Key |
|----------|-------|--------------|-------------|
| YAML Front Matter | Document | `doc:` | `doc:investment_guide:001` |
| `# Header` | Chapter | `ch:` | `ch:introduction:001` |
| `## Header` | Paragraph | `para:` | `para:overview:001` |
| `### Header` | Subparagraph | `subpara:` | `subpara:details:001` |
| Normal text | Chunk | `chunk:` | `chunk:specific_details:001` |

---

## 🗄️ Redis Schema

### JSON Structure

Each element stored in Redis follows this schema:

```json
{
  "type": "document|chapter|paragraph|subparagraph|chunk",
  "key": "unique_redis_key",
  "text": "complete_original_text",
  "parent": "parent_key",
  "children": ["child_key_1", "child_key_2"],  // V2: Recursive fetch support
  "sequence_in_parent": 1,
  "level": "document|chapter|paragraph|subparagraph|chunk",
  "title": "Element Title",
  "position": 1,
  "created": "2024-12-27",
  "updated": "2024-12-27"
}
```

### Parent-Child Relationships

V2 Architecture uses direct JSON lists for fast recursive retrieval:

```json
// Parent Object
{
  "key": "ch:chapter1:001",
  "children": ["para:intro:001", "para:details:002"]
}
```

Legacy sets (`:children` and `:sequence`) are still created for backward compatibility.

### Indices (V2)

The system automatically maintains two specialized indices:

1. **Path Index (`index:path`)**: Full hierarchy tree (Document → ... → Chunk) for navigation.
2. **Content Index (`index:content`)**: Aggregated summaries up to Paragraph level for efficient AI context selection.

### Navigation Example

```redis
# Get document
JSON.GET doc:example:001

# Get all chapters
SMEMBERS doc:example:001:children

# Get specific chapter
JSON.GET ch:chapter1:001

# Get chapter's paragraphs
SMEMBERS ch:chapter1:001:children

# Navigate parent → child → grandchild
JSON.GET doc:example:001 $.children
JSON.GET ch:chapter1:001 $.children
JSON.GET para:intro:001 $.text
```

---

## 🎓 Best Practices

### Document Preparation

✅ **DO:**
- Include complete YAML front matter
- Use consistent heading levels (`#`, `##`, `###`)
- Keep content meaningful at each level
- Use clear, descriptive titles
- Maintain proper hierarchy

❌ **DON'T:**
- Skip heading levels (e.g., `#` to `###`)
- Use headers without content
- Mix different document formats
- Exceed 200 pages without chunking strategy

### Redis Usage

✅ **DO:**
- Always execute JSON.SET commands before SADD
- Validate uploads with `JSON.GET`
- Use sets for navigation (`:children`, `:sequence`)
- Back up before bulk operations

❌ **DON'T:**
- Manually edit keys (use consistent naming)
- Delete documents without cleaning up sets
- Mix different schema versions
- Skip validation steps

### Performance Optimization

```python
# For documents > 100 pages
chunk_size = 1000  # Smaller chunks
batch_size = 50    # Batch operations

# For documents < 50 pages  
chunk_size = 2000  # Larger chunks for better context
batch_size = 100   # Larger batches
```

---

## 🔧 Troubleshooting

### Common Issues

#### "Document already exists"

```bash
# Solution 1: Skip existing
--skip-existing

# Solution 2: Delete old document
redis-cli -u redis://url DEL doc:example:001
redis-cli -u redis://url DEL doc:example:001:children
redis-cli -u redis://url DEL doc:example:001:sequence
```

#### "JSON parse error"

```python
# The toolkit handles escaping automatically
# If issues persist, check for:
- Unusual Unicode characters
- Unmatched quotes
- Control characters
```

#### "Connection timeout"

```bash
# Increase timeout in redis connection
# Check your Redis server status
redis-cli -u redis://url PING
```

#### "Missing hierarchy levels"

Both systems handle missing levels gracefully:
- Document with only `#` headers → Creates chapters and chunks
- Document with `#` and `###` → Skips paragraph level
- Document with `##` and `###` → Creates appropriate hierarchy

---

## 📊 Repository Structure

```
text-to-redis-transformation-system/
├── README.md                          # This file
├── COMPARISON_ANALYSIS.md             # Detailed approach comparison
├── LICENSE
│
├── ai-prompts/                        # AI-assisted transformation
│   ├── README_AI.md                   # AI approach guide (German)
│   ├── prompts/                       # Transformation prompts
│   │   ├── main_transformation_prompt_fixed.md
│   │   ├── structure_validation_prompt.md
│   │   └── large_document_handling.md
│   ├── schemas/                       # Reference schemas
│   │   ├── redis_tag_format.md
│   │   ├── key_naming_conventions.md
│   │   ├── structure_preservation_rules.md
│   │   └── redis_document_schema.json
│   ├── examples/                      # Working examples
│   │   ├── portfolio_input_example.md
│   │   └── portfolio_redis_tags_output_fixed.md
│   ├── validation/                    # Quality checks
│   │   ├── mandatory_checks_fixed.md
│   │   └── redis_command_templates.md
│   └── output_templates/              # Output formats
│       └── redis_output_template.md
│
├── python-toolkit/                    # Automated transformation
│   ├── README_PYTHON.md               # Python toolkit guide
│   ├── transform_markdown.py          # Master orchestrator
│   ├── upload_document.py             # Document level handler
│   ├── upload_chapters.py             # Chapter level handler
│   ├── upload_paragraphs.py           # Paragraph level handler
│   ├── upload_subparagraphs.py        # Subparagraph level handler
│   ├── upload_chunks.py               # Chunk level handler
│   └── redis_utils.py                 # Shared utilities
│
├── docs/                              # Additional documentation
│   ├── ARCHITECTURE.md                # System architecture
│   ├── API_REFERENCE.md               # API documentation
│   └── PERFORMANCE.md                 # Performance benchmarks
│
└── examples/                          # Test documents
    ├── simple_example.md              # Basic test
    ├── complex_example.md             # Advanced test
    └── large_document_example.md      # Stress test
```

---

## 🚀 Performance

### Transformation Speed

| Document Size | Python Toolkit | AI-Assisted |
|---------------|----------------|-------------|
| 10-50 pages | < 30 seconds | ~2-5 minutes |
| 50-100 pages | < 2 minutes | ~5-10 minutes |
| 100-200 pages | < 5 minutes | ~10-15 minutes |
| 200+ pages | < 15 minutes | ~15-30 minutes |

### Redis Performance

- **Upload:** ~1000 chunks/second (Redis-dependent)
- **Search:** < 10ms for simple queries
- **Memory:** ~1-2KB per chunk average
- **Tested:** Up to 10,000 chunks per document

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow existing code style
4. Add tests for new features
5. Update documentation
6. Submit pull request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/OskarSch24/text-to-redis-transformation-system/issues)
- **Discussions:** [GitHub Discussions](https://github.com/OskarSch24/text-to-redis-transformation-system/discussions)
- **Documentation:** See `/docs` folder
- **Examples:** See `/examples` folder

---

## 🎯 Use Cases

### 1. RAG Content Creation
```
200-page handbook → Redis chunks → GPT retrieval → Automated article generation
```

### 2. Enterprise Knowledge Base
```
Policy documents → Redis structure → Employee chatbot with citations
```

### 3. N8N Content Automation
```
Markdown collection → Redis upload → N8N workflow → Newsletter/Social posts
```

### 4. Research & Analysis
```
Academic papers → Structured chunks → Semantic search → Research insights
```

---

**Built with ❤️ for AI-powered content workflows**

**Made by:** [@OskarSch24](https://github.com/OskarSch24)
**Version:** 2.0.0
**Last Updated:** 2025-10-24

