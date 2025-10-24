#!/usr/bin/env python3
"""
Upload Chunks - Processes and uploads chunk-level content (normal text lines)
"""
import argparse
from redis_utils import RedisUploader, parse_yaml_frontmatter, clean_text_for_key

def process_chunks(markdown_file, redis_cli_path, redis_url, doc_key):
    """Process and upload all chunks (normal text) from markdown file"""
    uploader = RedisUploader(redis_cli_path, redis_url)

    with open(markdown_file, 'r') as f:
        lines = f.readlines()

    # Skip YAML frontmatter if present
    lines, _ = parse_yaml_frontmatter(lines)

    chunks = []
    chunk_counter = 0

    # Track current hierarchy
    current_chapter = doc_key
    current_paragraph = None
    current_subparagraph = None
    chapter_num = 0
    para_num = 0
    subpara_num = 0

    for line_num, line in enumerate(lines):
        original_line = line
        line_stripped = line.strip()

        # Skip empty lines
        if not line_stripped:
            continue

        # Update hierarchy tracking
        if line_stripped.startswith('# ') and not line_stripped.startswith('## '):
            chapter_num += 1
            chapter_text = line_stripped[2:].strip()
            chapter_key_part = clean_text_for_key(chapter_text)
            current_chapter = f"ch:{chapter_key_part}:{chapter_num:03d}"
            current_paragraph = None
            current_subparagraph = None

        elif line_stripped.startswith('## ') and not line_stripped.startswith('### '):
            para_num += 1
            para_text = line_stripped[3:].strip()
            para_key_part = clean_text_for_key(para_text)
            current_paragraph = f"para:{para_key_part}:{para_num:03d}"
            current_subparagraph = None

        elif line_stripped.startswith('### ') and not line_stripped.startswith('#### '):
            subpara_num += 1
            subpara_text = line_stripped[4:].strip()
            subpara_key_part = clean_text_for_key(subpara_text)
            current_subparagraph = f"subpara:{subpara_key_part}:{subpara_num:03d}"

        # Process chunk (any non-header line)
        elif not line_stripped.startswith('#'):
            chunk_counter += 1

            # Determine parent based on hierarchy
            if current_subparagraph:
                parent = current_subparagraph
            elif current_paragraph:
                parent = current_paragraph
            elif current_chapter != doc_key:
                parent = current_chapter
            else:
                parent = doc_key

            # Generate chunk key
            chunk_key_part = clean_text_for_key(line_stripped, max_words=3)
            chunk_key = f"chunk:{chunk_key_part}:{chunk_counter:03d}"

            chunks.append({
                'key': chunk_key,
                'text': line_stripped,
                'parent': parent,
                'sequence': chunk_counter,
                'line_num': line_num
            })

    print(f"Found {len(chunks)} chunks to upload")

    # Upload chunks
    for i, chunk in enumerate(chunks, 1):
        if i <= 5 or i % 50 == 0:  # Show first 5 and every 50th
            print(f"\n[{i}/{len(chunks)}] Processing chunk: {chunk['text'][:50]}...")

        chunk_data = {
            "type": "chunk",
            "key": chunk['key'],
            "text": chunk['text'],
            "parent": chunk['parent'],
            "sequence_in_parent": chunk['sequence']
        }

        success = uploader.upload_to_redis(chunk['key'], chunk_data)

        if success:
            # Add to parent's children set
            uploader.add_to_set(chunk['parent'], chunk['key'])

        # Progress update
        if i % 50 == 0:
            print(f"\nProgress: {i}/{len(chunks)} chunks processed")
            print(f"Success: {uploader.success_count}, Failed: {uploader.failed_count}")

    uploader.print_summary("Chunks")
    return chunks

def main():
    parser = argparse.ArgumentParser(description="Upload chunks from markdown to Redis")
    parser.add_argument('--redis-cli', required=True, help="Path to redis-cli")
    parser.add_argument('--redis-url', required=True, help="Redis connection URL")
    parser.add_argument('--markdown', required=True, help="Path to markdown file")
    parser.add_argument('--doc-key', required=True, help="Root document key")
    parser.add_argument('--batch-size', type=int, default=50, help="Progress update interval")

    args = parser.parse_args()

    # Process and upload chunks
    chunks = process_chunks(
        args.markdown,
        args.redis_cli,
        args.redis_url,
        args.doc_key
    )

    print(f"\n✅ Processed {len(chunks)} chunks")

if __name__ == "__main__":
    main()