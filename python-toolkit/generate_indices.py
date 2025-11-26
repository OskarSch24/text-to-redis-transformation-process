#!/usr/bin/env python3
"""
Generate Indices - Creates Path Index and Content Index (V2 Architecture)
"""
import argparse
import json
import redis
from datetime import datetime
from collections import defaultdict

def generate_indices(redis_cli_path, redis_url):
    print("\n📊 Generating Redis Indices (V2)...")
    
    # Connect directly to Redis (using redis-py for complex operations)
    # We parse the redis_url to get credentials
    # url format: redis://:password@host:port or redis://user:pass@host:port
    try:
        r = redis.from_url(redis_url, decode_responses=True)
        r.ping()
    except Exception as e:
        print(f"❌ Failed to connect to Redis: {e}")
        return False

    # 1. Fetch all keys
    print("  → Fetching all keys...")
    # Helper to filter out :children keys (legacy sets)
    def filter_keys(keys):
        return [k for k in keys if not k.endswith(':children')]

    doc_keys = sorted(filter_keys(r.keys("doc:*")))
    ch_keys = sorted(filter_keys(r.keys("ch:*")))
    para_keys = sorted(filter_keys(r.keys("para:*")))
    subpara_keys = sorted(filter_keys(r.keys("subpara:*")))
    chunk_keys = sorted(filter_keys(r.keys("chunk:*")))

    total_keys = len(doc_keys) + len(ch_keys) + len(para_keys) + len(subpara_keys) + len(chunk_keys)
    print(f"  ✓ Found {total_keys} total content keys")

    # 2. Build Hierarchy Map
    print("  → Building hierarchy map...")
    
    # Load all objects to memory (for speed, assuming DB fits in memory)
    # Optimization: Pipeline the gets
    pipeline = r.pipeline()
    all_keys = doc_keys + ch_keys + para_keys + subpara_keys + chunk_keys
    for k in all_keys:
        pipeline.json().get(k)
    all_data = pipeline.execute()
    
    data_map = dict(zip(all_keys, all_data))
    
    # Helper to get children (using V2 'children' list if available, else finding via parent pointer)
    # Since we just uploaded, 'children' list might be populated. 
    # But for robustness, we can rebuild relationships from the bottom up or top down.
    # Actually, we have all data. Let's build a tree from the bottom up to aggregate content.
    
    # Map parent -> list of children objects
    tree = defaultdict(list)
    for key, data in data_map.items():
        if not data: continue
        parent = data.get('parent')
        if parent:
            tree[parent].append(data)

    # Sort children by sequence
    for parent in tree:
        tree[parent].sort(key=lambda x: x.get('sequence_in_parent', 0))

    # 3. Generate Content Aggregations for Summaries
    # We need to aggregate text for Paragraphs (Para + SubPara + Chunk)
    print("  → Aggregating content for summaries...")
    
    def get_full_text(key):
        data = data_map.get(key)
        if not data: return ""
        
        # Self text
        text = data.get('text', '')
        if data.get('type') in ['chapter', 'document']: 
            text = "" # Don't include title repeated
            
        # Children text
        children = tree.get(key, [])
        child_texts = [get_full_text(child['key']) for child in children]
        
        return (text + "\n" + "\n".join(child_texts)).strip()

    # 4. Build Content Index (Doc -> Chapter -> Paragraph with Summary)
    content_index = {
        "generated_at": datetime.now().isoformat(),
        "type": "content_index",
        "documents": []
    }

    for doc_key in doc_keys:
        doc_data = data_map.get(doc_key)
        doc_entry = {
            "key": doc_key,
            "title": doc_data.get('name', 'Untitled'),
            "summary": doc_data.get('metadata', {}).get('summary', "Document Purpose"), # Placeholder if not in metadata
            "chapters": []
        }
        
        # Chapters
        for ch_data in tree.get(doc_key, []):
            ch_entry = {
                "key": ch_data['key'],
                "title": ch_data.get('title', ''),
                "paragraphs": []
            }
            
            # Paragraphs
            for p_data in tree.get(ch_data['key'], []):
                # Aggregate Summary
                full_text = get_full_text(p_data['key'])
                summary = full_text[:500] + "..." if len(full_text) > 500 else full_text
                
                p_entry = {
                    "key": p_data['key'],
                    "title": p_data.get('title', ''),
                    "summary": summary
                }
                ch_entry["paragraphs"].append(p_entry)
            
            doc_entry["chapters"].append(ch_entry)
        
        content_index["documents"].append(doc_entry)

    # 5. Build Path Index (Full Hierarchy)
    path_index = {
        "generated_at": datetime.now().isoformat(),
        "type": "path_index",
        "documents": []
    }

    def build_path_node(key):
        data = data_map.get(key)
        node = {
            "key": key,
            "type": data.get('type'),
            "children": []
        }
        for child in tree.get(key, []):
            node["children"].append(build_path_node(child['key']))
        return node

    for doc_key in doc_keys:
        path_index["documents"].append(build_path_node(doc_key))

    # 6. Upload Indices
    print("  → Uploading indices...")
    
    r.json().set("index:content", "$", content_index)
    print("  ✓ Uploaded index:content")
    
    r.json().set("index:path", "$", path_index)
    print("  ✓ Uploaded index:path")
    
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate V2 Indices")
    parser.add_argument('--redis-cli', help="Path to redis-cli (unused by this script but kept for compatibility)")
    parser.add_argument('--redis-url', required=True, help="Redis connection URL")
    args = parser.parse_args()
    
    generate_indices(args.redis_cli, args.redis_url)

