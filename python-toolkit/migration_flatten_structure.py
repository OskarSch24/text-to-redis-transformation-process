#!/usr/bin/env python3
"""
Migration Script V1: Flatten SSP Structure (Reference)
------------------------------------------
This script was used/designed to migrate from V1 to V2 architecture by removing 'Sub-Sub-Paragraphs' (ssp:*)
and moving their chunks to the parent Sub-Paragraph.

NOTE: For the V2 transition, we opted for a full Database Reset (Tabula Rasa) instead of running this migration.
This script is kept for archival purposes.
"""
import redis
import json
import os

# Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "redis-13515.fcrce173.eu-west-1-1.ec2.redns.redis-cloud.com")
REDIS_PORT = int(os.getenv("REDIS_PORT", 13515))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "WNWF6sNqFg5e2N5wjWLvoMfdBuMGTdKT")

def run_migration():
    print("🚀 Starting Migration V1: Flatten SSP Structure")
    
    # Connect
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
        r.ping()
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return

    # 1. Find SSPs
    ssp_keys = r.keys("ssp:*")
    print(f"Found {len(ssp_keys)} Sub-Sub-Paragraphs to migrate.")
    
    if not ssp_keys:
        print("Nothing to migrate.")
        return

    # 2. Find all Chunks
    chunk_keys = r.keys("chunk:*")
    print(f"Scanning {len(chunk_keys)} chunks...")
    
    ssp_to_chunks = {}
    for ck in chunk_keys:
        try:
            data = r.json().get(ck)
            parent = data.get("parent")
            if parent and parent.startswith("ssp:"):
                if parent not in ssp_to_chunks:
                    ssp_to_chunks[parent] = []
                ssp_to_chunks[parent].append(ck)
        except Exception as e:
            print(f"Error reading chunk {ck}: {e}")

    print(f"Identified {sum(len(v) for v in ssp_to_chunks.values())} chunks linked to SSPs.")

    # 3. Execute Migration
    migrated_chunks = 0
    deleted_ssps = 0
    
    for ssp_key in ssp_keys:
        try:
            ssp_data = r.json().get(ssp_key)
            sp_parent = ssp_data.get("parent")
            
            if not sp_parent or not sp_parent.startswith("sp:"):
                print(f"⚠️ Skipping {ssp_key}: Invalid parent {sp_parent}")
                continue
                
            # Re-link children
            children = ssp_to_chunks.get(ssp_key, [])
            for chunk_key in children:
                # Update Chunk Parent
                r.json().set(chunk_key, "$.parent", sp_parent)
                # Update Context
                if "context_subparagraph" in ssp_data:
                     r.json().set(chunk_key, "$.context_subparagraph", ssp_data["context_subparagraph"])
                
                migrated_chunks += 1
            
            # Delete SSP
            r.delete(ssp_key)
            deleted_ssps += 1
            print(f"✅ Migrated {ssp_key} -> Moved {len(children)} chunks to {sp_parent}")
            
        except Exception as e:
            print(f"❌ Failed processing {ssp_key}: {e}")

    print("\n-----------------------------------")
    print(f"Migration Complete.")
    print(f"Moved Chunks: {migrated_chunks}")
    print(f"Deleted SSPs: {deleted_ssps}")

if __name__ == "__main__":
    run_migration()

