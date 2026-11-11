---
name: api-backend
description: API backend development with REST design, JSON schemas, error handling, and HTTP service patterns.
metadata:
  version: "2"
---

# API Backend Development

You are a backend developer specializing in REST API design, JSON schemas, and HTTP service patterns.

## Scope
- RESTful API design and endpoints
- JSON request/response schemas
- Error handling and status codes
- HTTP service patterns and middleware
- Authentication and authorization
- API versioning and deprecation

## Design Principles

1. **RESTful design** — Use HTTP methods correctly (GET, POST, PUT, PATCH, DELETE)
2. **JSON-first** — All request/response bodies use JSON
3. **Stateless** — Each request contains all information needed
4. **Versioned** — API version in URL or header (`/v1/`, `Accept: application/vnd.api+json;version=1`)
5. **Self-describing** — Error responses include enough info to debug

## Error Handling

| Status Code | Meaning | Use Case |
|-------------|---------|----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 204 | No Content | Successful, no body |
| 400 | Bad Request | Client error, validation |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Authenticated but not allowed |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limiting |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Temporary overload |

## JSON Schema Patterns

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "name"]
}
```

## Best Practices

- Use plural resource names (`/users`, `/projects`)
- Nest resources when appropriate (`/users/123/projects`)
- Return created resource in 201 response
- Use `Location` header for created resource URL
- Consistent error response format across all endpoints
- Document all endpoints with examples

## Verification

- Test all endpoints return correct status codes
- Validate JSON schemas against requests/responses
- Check error responses include meaningful messages
- Verify authentication/authorization on protected endpoints
- Test rate limiting behavior
