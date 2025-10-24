#!/usr/bin/env python3
"""
Upload Paragraphs - Processes and uploads paragraph-level content
"""
import argparse
from redis_utils import RedisUploader, parse_yaml_frontmatter, clean_text_for_key

def process_paragraphs(markdown_file, redis_cli_path, redis_url, doc_key):
    """Process and upload all paragraphs from markdown file"""
    uploader = RedisUploader(redis_cli_path, redis_url)

    with open(markdown_file, 'r') as f:
        lines = f.readlines()

    # Skip YAML frontmatter if present
    lines, _ = parse_yaml_frontmatter(lines)

    paragraphs = []
    para_counter = 0
    current_chapter = doc_key  # Default parent
    current_chapter_num = 0

    for line_num, line in enumerate(lines):
        original_line = line
        line = line.strip()

        # Track current chapter for parent relationship
        if line.startswith('# ') and not line.startswith('## '):
            current_chapter_num += 1
            chapter_text = line[2:].strip()
            chapter_key_part = clean_text_for_key(chapter_text)
            current_chapter = f"ch:{chapter_key_part}:{current_chapter_num:03d}"

        # Check for paragraph (double ##)
        elif line.startswith('## ') and not line.startswith('### '):
            para_counter += 1
            para_text = line[3:].strip()

            # Generate paragraph key
            para_key_part = clean_text_for_key(para_text)
            para_key = f"para:{para_key_part}:{para_counter:03d}"

            paragraphs.append({
                'key': para_key,
                'text': para_text,
                'parent': current_chapter,
                'sequence': para_counter,
                'line_num': line_num
            })

    print(f"Found {len(paragraphs)} paragraphs to upload")

    # Upload paragraphs
    for i, para in enumerate(paragraphs, 1):
        print(f"\n[{i}/{len(paragraphs)}] Processing paragraph: {para['text'][:50]}...")

        para_data = {
            "type": "paragraph",
            "key": para['key'],
            "text": para['text'],
            "title": para['text'],
            "parent": para['parent'],
            "sequence_in_parent": para['sequence']
        }

        success = uploader.upload_to_redis(para['key'], para_data)

        if success:
            # Add to parent's children set
            uploader.add_to_set(para['parent'], para['key'])

        # Progress update
        if i % 10 == 0:
            print(f"\nProgress: {i}/{len(paragraphs)} paragraphs processed")
            print(f"Success: {uploader.success_count}, Failed: {uploader.failed_count}")

    uploader.print_summary("Paragraphs")
    return paragraphs

def main():
    parser = argparse.ArgumentParser(description="Upload paragraphs from markdown to Redis")
    parser.add_argument('--redis-cli', required=True, help="Path to redis-cli")
    parser.add_argument('--redis-url', required=True, help="Redis connection URL")
    parser.add_argument('--markdown', required=True, help="Path to markdown file")
    parser.add_argument('--doc-key', required=True, help="Root document key")

    args = parser.parse_args()

    # Process and upload paragraphs
    paragraphs = process_paragraphs(
        args.markdown,
        args.redis_cli,
        args.redis_url,
        args.doc_key
    )

    print(f"\n✅ Processed {len(paragraphs)} paragraphs")

if __name__ == "__main__":
    main()