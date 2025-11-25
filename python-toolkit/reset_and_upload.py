#!/usr/bin/env python3
"""
Reset and Upload - Clears Redis and uploads specific documents (V2)
"""
import redis
import subprocess
import sys
import os

# Configuration
REDIS_URL = "redis://default:WNWF6sNqFg5e2N5wjWLvoMfdBuMGTdKT@redis-13515.fcrce173.eu-west-1-1.ec2.redns.redis-cloud.com:13515"
DUMMY_CLI_PATH = "dummy-redis-cli" # redis_utils.py ignores this now

# Documents to upload - Absolute paths
BASE_DIR = "/Users/oskarschiermeister/Desktop/Database Project"
DOCUMENTS = [
    os.path.join(BASE_DIR, "Documents/brand_brief_complete_formatted.md"),
    os.path.join(BASE_DIR, "Documents/communication_rules_redis_formatted.md")
]

def main():
    print("⚠️  WARNING: This will DELETE ALL DATA in Redis!")
    print(f"Target: {REDIS_URL.split('@')[1]}")
    # confirm = input("Type 'FLUSH' to confirm: ")
    # if confirm != "FLUSH":
    #     print("Aborted.")
    #     return
    # Auto-confirm for Agent execution (User approved Plan)
    print("Auto-confirming flush for V2 Rebuild...")

    # 1. Flush Redis
    print("\n🧹 Flushing Database...")
    try:
        r = redis.from_url(REDIS_URL)
        r.flushdb()
        print("✅ Database cleared.")
    except Exception as e:
        print(f"❌ Failed to flush Redis: {e}")
        return

    # 2. Upload Documents
    script_dir = os.path.dirname(os.path.abspath(__file__))
    transform_script = os.path.join(script_dir, 'transform_markdown.py')

    for doc in DOCUMENTS:
        if not os.path.exists(doc):
            print(f"⚠️ File not found: {doc}")
            continue
            
        print(f"\n🚀 Uploading: {os.path.basename(doc)}...")
        
        cmd = [
            sys.executable,
            transform_script,
            '--redis-cli', DUMMY_CLI_PATH,
            '--redis-url', REDIS_URL,
            '--markdown', doc,
            '--skip-existing' # Actually we just flushed, so this doesn't matter, but good practice
        ]
        
        try:
            # Stream output
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for line in process.stdout:
                print(line, end='')
            process.wait()
            
            if process.returncode != 0:
                print(f"❌ Transformation failed for {doc}")
        except Exception as e:
            print(f"❌ Error running transformation: {e}")

    print("\n✨ V2 Rebuild Complete!")

if __name__ == "__main__":
    main()

