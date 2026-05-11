# API Reference

Live docs: https://codeinsight-pro.onrender.com/api/docs

OpenAPI JSON: https://codeinsight-pro.onrender.com/api/openapi.json

## GET /api/health

Returns API availability and active provider mode.

```bash
curl https://codeinsight-pro.onrender.com/api/health
```

Example response:

```json
{
  "ok": true,
  "provider": "mock",
  "uptimeSeconds": 120,
  "startedAt": "2026-05-11T12:00:00.000Z"
}
```

## POST /api/review

Reviews pasted code or a pull request diff.

```bash
curl -X POST https://codeinsight-pro.onrender.com/api/review \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix user lookup",
    "description": "Review this database access change.",
    "codeSnippet": "function getUser(id) { return db.query(`SELECT * FROM users WHERE id=${id}`) }"
  }'
```

Example response:

```json
{
  "review": {
    "mode": "mock",
    "summary": "1 critical, 0 major, 0 minor",
    "findings": [
      {
        "severity": "critical",
        "category": "security",
        "message": "Potential SQL query construction via concatenation detected.",
        "suggestion": "Use parameterized queries/prepared statements instead of concatenating user input."
      }
    ]
  }
}
```

## Error Shape

```json
{
  "error": {
    "code": "INVALID_CODE_SNIPPET",
    "message": "codeSnippet is required and must be a non-empty string.",
    "requestId": "lxi7rs-abc123"
  }
}
```
