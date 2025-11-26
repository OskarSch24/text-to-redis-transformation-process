#!/usr/bin/env python3
"""
Upload Subparagraphs - Processes and uploads subparagraph-level content
"""
import argparse
from redis_utils import RedisUploader, parse_yaml_frontmatter, clean_text_for_key

def process_subparagraphs(markdown_file, redis_cli_path, redis_url, doc_key):
    """Process and upload all subparagraphs from markdown file"""
    uploader = RedisUploader(redis_cli_path, redis_url)

    with open(markdown_file, 'r') as f:
        lines = f.readlines()

    # Skip YAML frontmatter if present
    lines, _ = parse_yaml_frontmatter(lines)

    subparagraphs = []
    subpara_counter = 0
    parent_counters = {}  # Track sequence per parent
    para_counter = 0
    current_paragraph = None

    for line_num, line in enumerate(lines):
        original_line = line
        line = line.strip()

        # Track current paragraph for parent relationship
        if line.startswith('## ') and not line.startswith('### '):
            para_counter += 1
            para_text = line[3:].strip()
            para_key_part = clean_text_for_key(para_text)
            current_paragraph = f"para:{para_key_part}:{para_counter:03d}"

        # Check for subparagraph (triple ###)
        elif line.startswith('### ') and not line.startswith('#### '):
            subpara_counter += 1
            subpara_text = line[4:].strip()

            # Generate subparagraph key
            subpara_key_part = clean_text_for_key(subpara_text)
            subpara_key = f"subpara:{subpara_key_part}:{subpara_counter:03d}"

            # Use paragraph as parent if available, otherwise doc key
            parent_key = current_paragraph if current_paragraph else doc_key

            # Update sequence for this parent
            if parent_key not in parent_counters:
                parent_counters[parent_key] = 0
            parent_counters[parent_key] += 1
            local_sequence = parent_counters[parent_key]

            subparagraphs.append({
                'key': subpara_key,
                'text': subpara_text,
                'parent': parent_key,
                'sequence': local_sequence,
                'line_num': line_num
            })

    print(f"Found {len(subparagraphs)} subparagraphs to upload")

    # Upload subparagraphs
    for i, subpara in enumerate(subparagraphs, 1):
        print(f"\n[{i}/{len(subparagraphs)}] Processing subparagraph: {subpara['text'][:50]}...")

        subpara_data = {
            "type": "subparagraph",
            "key": subpara['key'],
            "text": subpara['text'],
            "title": subpara['text'],
            "parent": subpara['parent'],
            "sequence_in_parent": subpara['sequence'],
            "children": []  # Initialize for V2 recursive fetch
        }

        success = uploader.upload_to_redis(subpara['key'], subpara_data)

        if success:
            # Add to parent's children set (Legacy)
            uploader.add_to_set(subpara['parent'], subpara['key'])
            # Add to parent's children list (V2)
            uploader.add_child_to_parent_list(subpara['parent'], subpara['key'])

        # Progress update
        if i % 10 == 0:
            print(f"\nProgress: {i}/{len(subparagraphs)} subparagraphs processed")
            print(f"Success: {uploader.success_count}, Failed: {uploader.failed_count}")

    uploader.print_summary("Subparagraphs")
    return subparagraphs

def main():
    parser = argparse.ArgumentParser(description="Upload subparagraphs from markdown to Redis")
    parser.add_argument('--redis-cli', required=True, help="Path to redis-cli")
    parser.add_argument('--redis-url', required=True, help="Redis connection URL")
    parser.add_argument('--markdown', required=True, help="Path to markdown file")
    parser.add_argument('--doc-key', required=True, help="Root document key")

    args = parser.parse_args()

    # Process and upload subparagraphs
    subparagraphs = process_subparagraphs(
        args.markdown,
        args.redis_cli,
        args.redis_url,
        args.doc_key
    )

    print(f"\n✅ Processed {len(subparagraphs)} subparagraphs")

if __name__ == "__main__":
    main()