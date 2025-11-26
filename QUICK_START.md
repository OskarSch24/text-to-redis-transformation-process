# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: Automated Python Pipeline (Recommended for Production)

**Prerequisites:** Python 3.7+, redis-py library (`pip install redis`)

```bash
# 1. Clone the repo
git clone https://github.com/OskarSch24/text-to-redis-transformation-system.git
cd text-to-redis-transformation-system

# 2. Install dependencies
pip install redis

# 3. Prepare your markdown file with YAML front matter
cat > my_document.md << 'EOF'
---
title: "My First Document"
author: "Your Name"
created: "2025-10-24"
---

# Introduction
This is my first chapter.

## Getting Started
This is a paragraph with content.
EOF

# 4. Run transformation
python3 python-toolkit/transform_markdown.py \
  --redis-url "redis://default:password@host:port" \
  --markdown my_document.md

# 5. Verify in Redis (using redis-py or redis-cli if available)
python3 -c "import redis; r = redis.from_url('redis://default:password@host:port'); print(r.json().get('doc:my_first_document:001'))"
```

**Done!** Your document is now in Redis with full hierarchy.

---

### Option 2: AI-Assisted Transformation (No Python Required)

**Prerequisites:** Claude Code or Cursor IDE

```bash
# 1. Clone the repo
git clone https://github.com/OskarSch24/text-to-redis-transformation-system.git

# 2. Open Claude Code / Cursor

# 3. Load your markdown document

# 4. Copy the transformation prompt
# From: ai-prompts/prompts/main_transformation_prompt_fixed.md

# 5. Paste prompt + your document into Claude/Cursor

# 6. Copy generated Redis commands

# 7. Execute in Redis CLI
redis-cli -u redis://your-url < generated_commands.txt
```

**Done!** Your document is transformed via AI assistance.

---

## ✅ Verify Your Transformation

```redis
# Get document metadata
JSON.GET doc:my_first_document:001

# List all chapters
SMEMBERS doc:my_first_document:001:children

# Get first chapter
JSON.GET ch:introduction:001

# Navigate hierarchy
JSON.GET ch:introduction:001 $.parent
SMEMBERS ch:introduction:001:children
```

---

## 📖 Next Steps

1. **Read full README:** [README.md](README.md)
2. **Review examples:** See `examples/` folder
3. **Customize schemas:** See `ai-prompts/schemas/`
4. **Learn best practices:** See [README.md#best-practices](README.md#best-practices)

---

## 🆘 Common Issues

### "Connection refused"
```bash
# Check Redis is running
redis-cli -u redis://your-url PING
```

### "Document already exists"
```bash
# Add --skip-existing flag
python3 python-toolkit/transform_markdown.py \
  --skip-existing \
  # ... other args
```

### "No YAML front matter found"
```markdown
# Add to top of your markdown file:
---
title: "Document Title"
author: "Your Name"
created: "2025-10-24"
---
```

---

**Need help?** Open an issue on GitHub!

