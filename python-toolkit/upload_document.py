#!/usr/bin/env python3
"""
Upload Document - Creates the root document entry in Redis
"""
import argparse
import sys
from redis_utils import RedisUploader, parse_yaml_frontmatter

def upload_document(redis_cli_path, redis_url, doc_name, doc_key, metadata=None, markdown_file=None):
    """Upload a document entry to Redis"""
    uploader = RedisUploader(redis_cli_path, redis_url)

    # Parse metadata from markdown if provided
    doc_metadata = {}
    if markdown_file:
        try:
            with open(markdown_file, 'r') as f:
                lines = f.readlines()
                _, yaml_lines = parse_yaml_frontmatter(lines)

                # Parse YAML metadata
                for line in yaml_lines:
                    if ':' in line:
                        key, value = line.split(':', 1)
                        doc_metadata[key.strip()] = value.strip().strip('"')
        except:
            pass

    # Override with provided metadata
    if metadata:
        doc_metadata.update(metadata)

    # Create document data
    doc_data = {
        "type": "document",
        "key": doc_key,
        "name": doc_name,
        "metadata": doc_metadata,
        "parent": None,
        "sequence_in_parent": 1,
        "children": []  # Initialize for V2 recursive fetch
    }

    # Upload document
    print(f"Uploading document: {doc_name}")
    success = uploader.upload_to_redis(doc_key, doc_data)

    if success:
        print(f"✅ Document '{doc_name}' created with key: {doc_key}")
    else:
        print(f"❌ Failed to create document '{doc_name}'")
        sys.exit(1)

    return doc_key

def main():
    parser = argparse.ArgumentParser(description="Upload document root to Redis")
    parser.add_argument('--redis-cli', required=True, help="Path to redis-cli")
    parser.add_argument('--redis-url', required=True, help="Redis connection URL")
    parser.add_argument('--doc-name', required=True, help="Document name")
    parser.add_argument('--doc-key', default=None, help="Document key (default: auto-generate)")
    parser.add_argument('--markdown', help="Optional markdown file to extract metadata")
    parser.add_argument('--author', help="Document author")
    parser.add_argument('--category', help="Document category")
    parser.add_argument('--tags', help="Comma-separated tags")
    parser.add_argument('--version', default="1.0", help="Document version")

    args = parser.parse_args()

    # Generate document key if not provided
    if not args.doc_key:
        doc_name_clean = args.doc_name.lower().replace(' ', '_')
        doc_name_clean = ''.join(c for c in doc_name_clean if c.isalnum() or c == '_')
        args.doc_key = f"doc:{doc_name_clean}:001"

    # Build metadata
    metadata = {}
    if args.author:
        metadata['author'] = args.author
    if args.category:
        metadata['category'] = args.category
    if args.tags:
        metadata['tags'] = args.tags.split(',')
    if args.version:
        metadata['version'] = args.version

    # Upload document
    upload_document(
        args.redis_cli,
        args.redis_url,
        args.doc_name,
        args.doc_key,
        metadata,
        args.markdown
    )

if __name__ == "__main__":
    main()