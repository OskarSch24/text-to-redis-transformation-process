# Environment Variables Note

## Missing .env File
The original `.env` file from the v1.0 server is **intentionally not archived** for security reasons.

## Required Environment Variables
The v1.0 server uses these environment variables (if .env is used instead of hardcoded values):

```bash
# Redis Cloud Connection (these values are hardcoded in server.js)
REDIS_HOST=redis-11116.c311.eu-central-1-1.ec2.redns.redis-cloud.com
REDIS_PORT=11116
REDIS_USERNAME=default
REDIS_PASSWORD=[REDACTED - See server.js for actual values]
```

## Security Note
- Credentials are hardcoded in server.js for v1.0
- v2.0 Enhanced server also uses hardcoded credentials
- Both work with the same Redis Cloud instance
- No .env file is required for either version

## Restoration Instructions
If restoring v1.0:
1. The server.js contains all required connection details
2. No .env file setup needed
3. Server connects directly to Redis Cloud instance