#!/usr/bin/env python3
"""
Upload Chapters - Processes and uploads chapter-level content
"""
import argparse
import re
from redis_utils import RedisUploader, parse_yaml_frontmatter, clean_text_for_key

def process_chapters(markdown_file, redis_cli_path, redis_url, doc_key):
    """Process and upload all chapters from markdown file"""
    uploader = RedisUploader(redis_cli_path, redis_url)

    with open(markdown_file, 'r') as f:
        lines = f.readlines()

    # Skip YAML frontmatter if present
    lines, _ = parse_yaml_frontmatter(lines)

    chapters = []
    chapter_counter = 0

    for line_num, line in enumerate(lines):
        original_line = line
        line = line.strip()

        # Check for chapter (single #)
        if line.startswith('# ') and not line.startswith('## '):
            chapter_counter += 1
            chapter_text = line[2:].strip()

            # Generate chapter key
            chapter_key_part = clean_text_for_key(chapter_text)
            chapter_key = f"ch:{chapter_key_part}:{chapter_counter:03d}"

            chapters.append({
                'key': chapter_key,
                'text': chapter_text,
                'parent': doc_key,
                'sequence': chapter_counter,
                'line_num': line_num
            })

    print(f"Found {len(chapters)} chapters to upload")

    # Upload chapters
    for i, chapter in enumerate(chapters, 1):
        print(f"\n[{i}/{len(chapters)}] Processing chapter: {chapter['text'][:50]}...")

        chapter_data = {
            "type": "chapter",
            "key": chapter['key'],
            "text": f"# {chapter['text']}",
            "title": chapter['text'],
            "parent": chapter['parent'],
            "sequence_in_parent": chapter['sequence']
        }

        success = uploader.upload_to_redis(chapter['key'], chapter_data)

        if success:
            # Add to parent's children set
            uploader.add_to_set(chapter['parent'], chapter['key'])

    uploader.print_summary("Chapters")
    return chapters

def main():
    parser = argparse.ArgumentParser(description="Upload chapters from markdown to Redis")
    parser.add_argument('--redis-cli', required=True, help="Path to redis-cli")
    parser.add_argument('--redis-url', required=True, help="Redis connection URL")
    parser.add_argument('--markdown', required=True, help="Path to markdown file")
    parser.add_argument('--doc-key', required=True, help="Parent document key")

    args = parser.parse_args()

    # Process and upload chapters
    chapters = process_chapters(
        args.markdown,
        args.redis_cli,
        args.redis_url,
        args.doc_key
    )

    print(f"\n✅ Processed {len(chapters)} chapters")

if __name__ == "__main__":
    main()