#!/usr/bin/env python3
"""
Transform Markdown - Master orchestrator script for complete markdown to Redis transformation
"""
import argparse
import sys
import subprocess
import os
from datetime import datetime

def run_command(command):
    """Run a command and return success status"""
    print(f"Running: {' '.join(command)}")
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def transform_markdown(markdown_file, redis_cli_path, redis_url, doc_name=None, doc_key=None, skip_existing=False):
    """
    Complete transformation pipeline for markdown to Redis
    """
    print("="*60)
    print("MARKDOWN TO REDIS TRANSFORMATION PIPELINE")
    print("="*60)
    print(f"Markdown file: {markdown_file}")
    print(f"Redis URL: {redis_url}")
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    # Determine document name and key
    if not doc_name:
        doc_name = os.path.splitext(os.path.basename(markdown_file))[0].replace('_', ' ').title()

    if not doc_key:
        doc_name_clean = doc_name.lower().replace(' ', '_')
        doc_name_clean = ''.join(c for c in doc_name_clean if c.isalnum() or c == '_')
        doc_key = f"doc:{doc_name_clean}:001"

    # Get script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Step 1: Create document
    print("\n📄 Step 1: Creating document entry...")
    cmd = [
        sys.executable,
        os.path.join(script_dir, 'upload_document.py'),
        '--redis-cli', redis_cli_path,
        '--redis-url', redis_url,
        '--doc-name', doc_name,
        '--doc-key', doc_key,
        '--markdown', markdown_file
    ]

    if not run_command(cmd):
        if not skip_existing:
            print("Failed to create document. Exiting.")
            return False
        else:
            print("Document may already exist, continuing...")

    # Step 2: Upload chapters
    print("\n📚 Step 2: Uploading chapters...")
    cmd = [
        sys.executable,
        os.path.join(script_dir, 'upload_chapters.py'),
        '--redis-cli', redis_cli_path,
        '--redis-url', redis_url,
        '--markdown', markdown_file,
        '--doc-key', doc_key
    ]

    if not run_command(cmd):
        print("Failed to upload chapters. Exiting.")
        return False

    # Step 3: Upload paragraphs
    print("\n📝 Step 3: Uploading paragraphs...")
    cmd = [
        sys.executable,
        os.path.join(script_dir, 'upload_paragraphs.py'),
        '--redis-cli', redis_cli_path,
        '--redis-url', redis_url,
        '--markdown', markdown_file,
        '--doc-key', doc_key
    ]

    if not run_command(cmd):
        print("Failed to upload paragraphs. Exiting.")
        return False

    # Step 4: Upload subparagraphs
    print("\n📋 Step 4: Uploading subparagraphs...")
    cmd = [
        sys.executable,
        os.path.join(script_dir, 'upload_subparagraphs.py'),
        '--redis-cli', redis_cli_path,
        '--redis-url', redis_url,
        '--markdown', markdown_file,
        '--doc-key', doc_key
    ]

    if not run_command(cmd):
        print("Warning: Failed to upload subparagraphs. Continuing...")

    # Step 5: Upload chunks
    print("\n💬 Step 5: Uploading chunks...")
    cmd = [
        sys.executable,
        os.path.join(script_dir, 'upload_chunks.py'),
        '--redis-cli', redis_cli_path,
        '--redis-url', redis_url,
        '--markdown', markdown_file,
        '--doc-key', doc_key
    ]

    if not run_command(cmd):
        print("Failed to upload chunks. Exiting.")
        return False

    # Success summary
    print("\n" + "="*60)
    print("✅ TRANSFORMATION COMPLETE!")
    print(f"Document key: {doc_key}")
    print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    return True

def main():
    parser = argparse.ArgumentParser(
        description="Complete markdown to Redis transformation pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example usage:
  %(prog)s --redis-cli /path/to/redis-cli \\
           --redis-url redis://user:pass@host:port \\
           --markdown document.md

  %(prog)s --redis-cli ./redis-cli \\
           --redis-url redis://localhost:6379 \\
           --markdown report.md \\
           --doc-name "Annual Report" \\
           --doc-key doc:annual_report:2024
        """
    )

    parser.add_argument('--redis-cli', required=True, help="Path to redis-cli executable")
    parser.add_argument('--redis-url', required=True, help="Redis connection URL")
    parser.add_argument('--markdown', required=True, help="Path to markdown file to transform")
    parser.add_argument('--doc-name', help="Document name (default: derived from filename)")
    parser.add_argument('--doc-key', help="Document key (default: auto-generated)")
    parser.add_argument('--skip-existing', action='store_true',
                        help="Skip document creation if it already exists")

    args = parser.parse_args()

    # Validate markdown file exists
    if not os.path.exists(args.markdown):
        print(f"Error: Markdown file '{args.markdown}' not found")
        sys.exit(1)

    # Run transformation
    success = transform_markdown(
        args.markdown,
        args.redis_cli,
        args.redis_url,
        args.doc_name,
        args.doc_key,
        args.skip_existing
    )

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()