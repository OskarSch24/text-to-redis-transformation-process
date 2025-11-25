# V2 Data Architecture

This document describes the V2 Data Architecture for the Redis Content Database. This architecture is designed to optimize Retrieval-Augmented Generation (RAG) workflows by separating **Navigation (Structure)** from **Content Retrieval (Semantics)**.

## 1. Core Concepts

### The Dual-Index Strategy
To avoid overloading AI context windows with massive JSON blobs, we maintain two distinct "Master Indices":

1.  **Path Index (`index:path`)**: A lightweight map of the entire database structure. Used for navigation ("What exists?").
2.  **Content Index (`index:content`)**: A semantic map containing summaries of key sections. Used for decision making ("Is this relevant?").

### Recursive Retrieval
To solve the "Empty Folder" problem (fetching a Chapter key but getting no text), every Parent object (Document, Chapter, Paragraph) now contains a **`children`** list.
This allows the Proxy to recursively fetch and aggregate text from all descendants in a single API call.

---

## 2. The Indices

### A. Path Index (`index:path`)
**Key:** `index:path`
**Type:** `JSON`

A pure hierarchy tree. Contains NO text content.

**Structure:**
```json
{
  "generated_at": "2025-11-25T...",
  "type": "path_index",
  "documents": [
    {
      "key": "doc:brand_brief:001",
      "type": "document",
      "children": [
        {
          "key": "ch:intro:001",
          "type": "chapter",
          "children": [
            { "key": "para:mission:001", "type": "paragraph", "children": [...] }
          ]
        }
      ]
    }
  ]
}
```

**Use Case:**
- AI Agent wants to "list all chapters".
- UI needs to build a sidebar navigation.

### B. Content Index (`index:content`)
**Key:** `index:content`
**Type:** `JSON`

A semantic summary map. Goes down to **Paragraph** level. Aggregates content from below.

**Structure:**
```json
{
  "generated_at": "2025-11-25T...",
  "type": "content_index",
  "documents": [
    {
      "key": "doc:brand_brief:001",
      "title": "Brand Brief",
      "summary": "Strategic brand guidelines...",
      "chapters": [
        {
          "key": "ch:philosophy:004",
          "title": "Business Philosophy",
          "paragraphs": [
            {
              "key": "para:values:001",
              "title": "Core Values",
              "summary": "We believe in hard work (chunk 1), transparency (chunk 2)... [Aggregated from all children]"
            }
          ]
        }
      ]
    }
  ]
}
```

**Use Case:**
- AI Agent (Reasoning) reads this to decide *which* paragraphs contain the answer to a user prompt.

---

## 3. The Hierarchy (Flattened)

We have removed the `Sub-Sub-Paragraph` level. The hierarchy is strictly:

1.  **Document** (`doc:...`)
2.  **Chapter** (`ch:...`)
3.  **Paragraph** (`para:...`) or (`p:...`)
4.  **Sub-Paragraph** (`subpara:...`) or (`sp:...`)
5.  **Chunk** (`chunk:...`) - The atomic text unit.

*Note: Deeply nested headers (H4, H5) in Markdown are now treated as **Chunks** with bold formatting, attached to the parent Sub-Paragraph.*

## 4. Recursive Fetching

Every parent object in Redis has this field:
```json
"children": ["child_key_1", "child_key_2"]
```

**API Endpoint:** `POST /redis/fetch-recursive`
**Input:** `{"key": "ch:philosophy:004"}`
**Output:** A single string containing the text of the Chapter + all its Paragraphs + all Sub-Paragraphs + all Chunks, preserving order.

