# n8n Workflow Fix Plan - Research Complete

**Date:** November 27, 2025  
**Workflow:** Redis Writer Agent - Intelligent Content Generation  
**Workflow ID:** `ehfOJ46JAtE3R7h4`  
**n8n Instance:** https://primary-production-6445.up.railway.app/

---

## ✅ Research Phase Complete

### Key Findings from n8n Documentation

**1. LangChain Tool HTTP Request Nodes (`@n8n/n8n-nodes-langchain.toolHttpRequest`)**
- Use `parametersHeaders.values` array for headers
- Each header is an object with:
  - `name`: Header name (e.g., "X-API-Key")
  - `value`: Header value
  - `valueProvider`: "fieldValue" for static values

**Example from OpenSea NFT Agent Workflow:**
```json
{
  "parametersHeaders": {
    "values": [
      {
        "name": "Accept",
        "value": "application/json",
        "valueProvider": "fieldValue"
      },
      {
        "name": "x-api-key",
        "value": "YOUR_OPENSEA_API_KEY",
        "valueProvider": "fieldValue"
      }
    ]
  }
}
```

**2. Standard HTTP Request Nodes (`n8n-nodes-base.httpRequest`)**
- Use `headerParameters.parameters` array for headers
- Each header is an object with:
  - `name`: Header name
  - `value`: Header value

**Example from n8n Course Workflow:**
```json
{
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      },
      {
        "name": "unique_id",
        "value": "recFIcD6UlSyxaVMQ"
      }
    ]
  }
}
```

---

## 🎯 Implementation Plan

### Required Changes

**Node 1: "Get Database Schema Tool"**
- **Type:** `@n8n/n8n-nodes-langchain.toolHttpRequest`
- **Current State:** Missing `X-API-Key` header
- **Required Fix:** Add header to `parametersHeaders.values` array

**Before:**
```json
{
  "parametersHeaders": {
    "values": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  }
}
```

**After:**
```json
{
  "parametersHeaders": {
    "values": [
      {
        "name": "Content-Type",
        "value": "application/json",
        "valueProvider": "fieldValue"
      },
      {
        "name": "X-API-Key",
        "value": "n8n_railway_auth_k9mP2xL7vQ4wN8jR5tY6uE3sA1bC0dF",
        "valueProvider": "fieldValue"
      }
    ]
  }
}
```

**Node 2: "HTTP Request"**
- **Type:** `n8n-nodes-base.httpRequest`
- **Current State:** Missing `X-API-Key` header
- **Required Fix:** Add header to `headerParameters.parameters` array

**Before:**
```json
{
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  }
}
```

**After:**
```json
{
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      },
      {
        "name": "X-API-Key",
        "value": "n8n_railway_auth_k9mP2xL7vQ4wN8jR5tY6uE3sA1bC0dF"
      }
    ]
  }
}
```

---

## 🚧 Current Blocker

**Issue:** Cannot access n8n workflow editor

**n8n Instance:** https://primary-production-6445.up.railway.app/  
**Current State:** Login page displayed  
**Required:** User credentials to access the workflow

### Options to Proceed:

**Option 1: User provides n8n login credentials**
- Email/Username
- Password
- I can then log in and make the changes directly

**Option 2: User makes the changes manually**
- Follow the implementation plan above
- Add `X-API-Key` header to both nodes
- Use value: `n8n_railway_auth_k9mP2xL7vQ4wN8jR5tY6uE3sA1bC0dF`

**Option 3: User grants temporary access**
- Share workflow via n8n sharing feature
- Or provide temporary access credentials

---

## 📋 Step-by-Step UI Instructions (For Manual Implementation)

### For "Get Database Schema Tool" Node:

1. Open n8n workflow editor
2. Navigate to workflow "Redis Writer Agent - Intelligent Content Generation"
3. Click on "Get Database Schema Tool" node
4. Scroll to "Headers" section
5. Click "+ Add Header"
6. Enter:
   - **Name:** `X-API-Key`
   - **Value:** `n8n_railway_auth_k9mP2xL7vQ4wN8jR5tY6uE3sA1bC0dF`
   - **Value Provider:** `Field Value` (should be default)
7. Click "Save"

### For "HTTP Request" Node:

1. Click on "HTTP Request" node (in the Split In Batches loop)
2. Scroll to "Headers" section
3. Ensure "Specify Headers" is set to "Using Key-Value Pairs"
4. Click "+ Add Parameter"
5. Enter:
   - **Name:** `X-API-Key`
   - **Value:** `n8n_railway_auth_k9mP2xL7vQ4wN8jR5tY6uE3sA1bC0dF`
6. Click "Save"

### Save Workflow:

1. Click "Save" button in top right corner
2. Ensure workflow is set to "Active"

---

## 🧪 Testing Plan

### Test 1: Schema Tool Execution
1. Click "Execute Workflow"
2. Enter test message: "Retrieve brand identity guidelines"
3. Watch "Get Database Schema Tool" node
4. **Expected:** Green checkmark, JSON output with Redis keys
5. **Check Railway logs:** Look for `POST /redis/query` with status `200`

### Test 2: Content Fetch Loop
1. Continue from Test 1
2. Watch "HTTP Request" node iterations
3. **Expected:** All iterations show green checkmarks
4. **Check Railway logs:** Multiple `POST /redis/json-get` with status `200`

### Test 3: End-to-End
1. Test query: "Create a LinkedIn post about our brand personality"
2. **Expected:** AI uses actual Redis data (not generic content)
3. **Verify:** Content matches brand voice from Redis

---

## 🔑 Authentication Flow (For Reference)

```
User Query → n8n Workflow
              ↓
         [Get Database Schema Tool]
              ↓ (HTTP POST with X-API-Key header)
         FastAPI Redis Proxy (Railway)
              ↓ (Validates X-API-Key)
              ↓ (Uses REDIS_PASSWORD)
         Redis Cloud Database
              ↓
         Returns Data → n8n → AI Agent → User
```

---

## 📊 Success Criteria

✅ Both HTTP nodes include `X-API-Key` header  
✅ Workflow executes without 401 errors  
✅ FastAPI Proxy logs show 200 responses  
✅ Redis data is successfully fetched  
✅ AI agent generates content based on actual Redis data  

---

## 🔗 Reference Files

- **Problem Analysis:** `fastapi-redis-proxy/reports/n8n_HTTP_Request_Debug_Session.md`
- **FastAPI Auth Code:** `fastapi-redis-proxy/app/main.py` (lines 26-31)
- **n8n Integration Guide:** `fastapi-redis-proxy/README.md` (lines 429-484)
- **OpenSea Example:** Zie619/n8n-workflows (1779_Stickynote_Executeworkflow_Automation_Webhook.json)

---

## 📝 Next Steps

**Immediate Action Required:**
1. User provides n8n login credentials, OR
2. User implements changes manually following the UI instructions above

**After Implementation:**
1. Test workflow execution
2. Verify Railway logs show successful authentication
3. Confirm AI agent uses real Redis data
4. Mark task as complete

---

**Status:** ✅ Research Complete | ⏸️ Awaiting n8n Access


