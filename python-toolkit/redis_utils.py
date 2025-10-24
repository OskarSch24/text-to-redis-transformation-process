#!/usr/bin/env python3
"""
Redis Utilities - Common functions for all upload scripts
"""
import json
import subprocess
import re
from datetime import datetime

class RedisUploader:
    """Base class for Redis upload operations"""

    def __init__(self, redis_cli_path, redis_url):
        self.redis_cli_path = redis_cli_path
        self.redis_url = redis_url
        self.success_count = 0
        self.failed_count = 0

    def escape_json_string(self, text):
        """Properly escape text for JSON"""
        if not text:
            return text
        text = str(text)
        text = text.replace('\\', '\\\\')
        text = text.replace('"', '\\"')
        text = text.replace('\n', '\\n')
        text = text.replace('\r', '\\r')
        text = text.replace('\t', '\\t')
        return text

    def generate_key(self, text, prefix, counter, max_length=50):
        """Generate a Redis key based on text content"""
        # Clean text for key generation
        words = re.sub(r'[^a-z0-9\s]', '', text.lower()).split()
        # Use first few words for key
        key_part = '_'.join(words[:4]) if words else f'{prefix}_{counter:03d}'
        # Ensure key is not too long
        if len(key_part) > max_length:
            key_part = key_part[:max_length]
        # Ensure uniqueness with counter
        return f"{prefix}:{key_part}:{counter:03d}"

    def upload_to_redis(self, key, data_dict):
        """Upload a single item to Redis"""
        # Add timestamp if not present
        if 'created' not in data_dict:
            data_dict['created'] = datetime.now().strftime('%Y-%m-%d')
        if 'updated' not in data_dict:
            data_dict['updated'] = datetime.now().strftime('%Y-%m-%d')

        # Convert to JSON string
        json_str = json.dumps(data_dict)

        # Create Redis command
        cmd = [
            self.redis_cli_path,
            '-u', self.redis_url,
            'JSON.SET', key, '$', json_str
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print(f"✓ Uploaded: {key[:60]}...")
                self.success_count += 1
                return True
            else:
                print(f"✗ Failed: {key[:60]}... - {result.stderr.strip()}")
                self.failed_count += 1
                return False
        except subprocess.TimeoutExpired:
            print(f"✗ Timeout uploading {key}")
            self.failed_count += 1
            return False
        except Exception as e:
            print(f"✗ Error uploading {key}: {e}")
            self.failed_count += 1
            return False

    def add_to_set(self, parent_key, child_key):
        """Add child to parent's children set"""
        cmd = [
            self.redis_cli_path,
            '-u', self.redis_url,
            'SADD', f"{parent_key}:children", child_key
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except:
            return False

    def check_exists(self, key):
        """Check if a key exists in Redis"""
        cmd = [
            self.redis_cli_path,
            '-u', self.redis_url,
            'EXISTS', key
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            return result.stdout.strip() == "1"
        except:
            return False

    def print_summary(self, item_type):
        """Print upload summary"""
        print("\n" + "="*50)
        print(f"{item_type} Upload Complete!")
        print(f"Successfully uploaded: {self.success_count}")
        print(f"Failed uploads: {self.failed_count}")
        print(f"Success rate: {self.success_count/(self.success_count + self.failed_count)*100:.1f}%")
        print("="*50)

def parse_yaml_frontmatter(lines):
    """Parse and skip YAML frontmatter if present"""
    if lines and lines[0].strip() == '---':
        for i, line in enumerate(lines[1:], 1):
            if line.strip() == '---':
                return lines[i+1:], lines[1:i]
    return lines, []

def clean_text_for_key(text, max_words=4):
    """Clean text for use in Redis key"""
    words = re.sub(r'[^a-z0-9\s]', '', text.lower()).split()
    return '_'.join(words[:max_words]) if words else 'unnamed'