# Redis Transformation Toolkit

A complete, reusable toolkit for transforming structured markdown documents into hierarchical Redis databases.

## Overview

This toolkit provides a modular approach to uploading markdown content to Redis with a 5-level hierarchy:
- **Document** → **Chapters** → **Paragraphs** → **Subparagraphs** → **Chunks**

## Features

✅ **Modular Design**: Separate scripts for each hierarchy level
✅ **Reusable**: Works with any markdown document following the standard structure
✅ **Proper JSON Escaping**: Handles quotes, apostrophes, and special characters
✅ **Progress Tracking**: Real-time upload progress with success/failure counts
✅ **Error Handling**: Robust error handling with detailed feedback
✅ **Command Line Interface**: Full CLI support with arguments
✅ **Master Orchestrator**: One-command complete transformation

## Installation

1. Ensure Python 3.x is installed
2. Install required Python packages: `pip install redis`
3. Clone or copy the toolkit to your project

## Quick Start

### Complete Transformation (Recommended)

```bash
python3 transform_markdown.py \
  --redis-url "redis://user:pass@host:port" \
  --markdown your_document.md
```

### Example with Custom Settings

```bash
python3 transform_markdown.py \
  --redis-url "redis://default:password@redis-host.com:15654" \
  --markdown Documents/brand_brief.md \
  --doc-name "Brand Brief" \
  --doc-key "doc:brand_brief:001"
```

## Individual Scripts

### 1. Document Upload
```bash
python3 upload_document.py \
  --redis-url "redis://..." \
  --doc-name "My Document" \
  --author "John Doe" \
  --category "Business" \
  --tags "marketing,strategy"
```

### 2. Chapter Upload
```bash
python3 upload_chapters.py \
  --redis-url "redis://..." \
  --markdown document.md \
  --doc-key "doc:my_document:001"
```

### 3. Paragraph Upload
```bash
python3 upload_paragraphs.py \
  --redis-url "redis://..." \
  --markdown document.md \
  --doc-key "doc:my_document:001"
```

### 4. Subparagraph Upload
```bash
python3 upload_subparagraphs.py \
  --redis-url "redis://..." \
  --markdown document.md \
  --doc-key "doc:my_document:001"
```

### 5. Chunk Upload
```bash
python3 upload_chunks.py \
  --redis-url "redis://..." \
  --markdown document.md \
  --doc-key "doc:my_document:001"
```

## Markdown Structure Requirements

Your markdown file should follow this structure:

```markdown
---
title: "Document Title"
author: "Author Name"
category: "Category"
tags: ["tag1", "tag2"]
---

# Chapter Title

## Paragraph Title

### Subparagraph Title

This is a chunk of content.
Another chunk of content.

### Another Subparagraph

More content chunks here.

## Another Paragraph

Content continues...
```

### Hierarchy Mapping
- `#` = Chapter level
- `##` = Paragraph level
- `###` = Subparagraph level
- Normal text lines = Chunks

## Redis Data Structure

Each entry in Redis follows this schema:

```json
{
  "type": "document|chapter|paragraph|subparagraph|chunk",
  "key": "unique_redis_key",
  "text": "content text",
  "parent": "parent_key",
  "sequence_in_parent": 1,
  "created": "2024-12-27",
  "updated": "2024-12-27"
}
```

### Parent-Child Relationships
- Each entry maintains a reference to its parent
- Parent entries can have a `:children` set containing child keys
- Enables full hierarchical navigation

## Key Generation

Keys are automatically generated based on content:
- Format: `prefix:content_words:sequence`
- Example: `ch:brand_overview:003`
- Ensures uniqueness and semantic meaning

## Error Handling

The toolkit includes comprehensive error handling:
- JSON escaping for special characters
- Timeout protection (5 seconds per operation)
- Detailed error messages
- Progress preservation on failure
- Option to skip existing documents

## Performance

- Processes ~25-50 entries per second
- Progress updates every 50 chunks
- Batch operations with connection reuse
- Suitable for documents with thousands of entries

## Customization

### Modifying Key Generation
Edit the `generate_key()` function in `redis_utils.py`:
```python
def generate_key(text, prefix, counter, max_length=50):
    # Your custom logic here
```

### Changing Hierarchy Detection
Modify the header detection in individual upload scripts:
```python
if line.startswith('# '):  # Chapter detection
if line.startswith('## '):  # Paragraph detection
```

### Custom Metadata
Add metadata fields in the document upload:
```python
doc_data = {
    "type": "document",
    "custom_field": "value",
    # ... other fields
}
```

## Troubleshooting

### "Document already exists"
Use the `--skip-existing` flag with transform_markdown.py

### JSON Parse Errors
The toolkit automatically handles escaping. If issues persist, check for unusual Unicode characters.

### Connection Timeout
Adjust Redis connection timeout in redis_utils.py if needed (uses redis-py library).

### Missing Hierarchy Levels
The toolkit handles documents with missing levels (e.g., no subparagraphs) gracefully.

## License

MIT License - Feel free to modify and reuse

## Support

For issues or questions, check the error logs and ensure:
1. Redis server is accessible
2. Authentication credentials are correct
3. Markdown structure follows the requirements
4. Python 3.x and redis-py library are properly installed