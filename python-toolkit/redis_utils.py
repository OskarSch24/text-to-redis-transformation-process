#!/usr/bin/env python3
"""
Redis Utilities - Common functions for all upload scripts
Refactored to use redis-py instead of redis-cli subprocess calls.
"""
import json
import re
import redis
from datetime import datetime

class RedisUploader:
    """Base class for Redis upload operations"""

    def __init__(self, redis_cli_path, redis_url):
        # redis_cli_path is kept for backward compatibility with existing script arguments
        self.redis_url = redis_url
        self.success_count = 0
        self.failed_count = 0
        
        try:
            self.r = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.r.ping()
        except Exception as e:
            print(f"❌ Failed to connect to Redis: {e}")
            raise

    def escape_json_string(self, text):
        """Properly escape text for JSON (Not needed when using redis-py/json.dumps)"""
        # Kept if legacy scripts call it, but generally redis-py handles object serialization
        if not text:
            return text
        return str(text)

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
        """Upload a single item to Redis using JSON.SET"""
        # Add timestamp if not present
        if 'created' not in data_dict:
            data_dict['created'] = datetime.now().strftime('%Y-%m-%d')
        if 'updated' not in data_dict:
            data_dict['updated'] = datetime.now().strftime('%Y-%m-%d')

        try:
            # Use redis-py JSON module
            self.r.json().set(key, '$', data_dict)
                print(f"✓ Uploaded: {key[:60]}...")
                self.success_count += 1
                return True
        except Exception as e:
            print(f"✗ Error uploading {key}: {e}")
            self.failed_count += 1
            return False

    def add_to_set(self, parent_key, child_key):
        """Add child to parent's children set (Legacy)"""
        try:
            self.r.sadd(f"{parent_key}:children", child_key)
            return True
        except Exception:
            return False

    def add_child_to_parent_list(self, parent_key, child_key):
        """Add child key to parent's 'children' JSON array (V2 Architecture)"""
        try:
            # Append to the 'children' array at root
            self.r.json().arrappend(parent_key, '$.children', child_key)
            return True
        except Exception:
            # Fail silently if key doesn't exist or children is not an array
            return False

    def check_exists(self, key):
        """Check if a key exists in Redis"""
        try:
            return self.r.exists(key) > 0
        except:
            return False

    def print_summary(self, item_type):
        """Print upload summary"""
        print("\n" + "="*50)
        print(f"{item_type} Upload Complete!")
        print(f"Successfully uploaded: {self.success_count}")
        print(f"Failed uploads: {self.failed_count}")
        total = self.success_count + self.failed_count
        if total > 0:
            print(f"Success rate: {self.success_count/total*100:.1f}%")
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
