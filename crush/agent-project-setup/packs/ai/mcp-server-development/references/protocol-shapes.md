# Protocol Shapes (revision 2026-07-28)

These shapes follow the MCP specification revision 2026-07-28. Check the current specification before relying on them; SDKs usually build these messages for you.

## Tool definition (in a tools list)

```json
{
  "name": "search_invoices",
  "title": "Search invoices",
  "description": "Find invoices for one customer, newest first. Use this before get_invoice when you only know the customer. Returns at most 20 invoices per page; pass next_cursor to get more.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "customer_id": {"type": "string", "description": "Customer ID, for example CUS-1042"},
      "status": {"type": "string", "enum": ["open", "paid", "void"], "description": "Optional status filter"},
      "cursor": {"type": "string", "description": "next_cursor from a previous call"}
    },
    "required": ["customer_id"],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "invoices": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "invoice_id": {"type": "string"},
            "total": {"type": "string"},
            "status": {"type": "string"}
          },
          "required": ["invoice_id", "total", "status"]
        }
      },
      "next_cursor": {"type": ["string", "null"]}
    },
    "required": ["invoices", "next_cursor"]
  },
  "annotations": {
    "readOnlyHint": true,
    "openWorldHint": false
  }
}
```

- `name` and `inputSchema` are required; `inputSchema` must be an object schema. For a tool without parameters: `{"type": "object", "additionalProperties": false}`.
- Annotations are hints. Defaults: `readOnlyHint` false, `destructiveHint` true (meaningful only when not read-only), `idempotentHint` false, `openWorldHint` true.
- A parameter may be mirrored into an HTTP header with `x-mcp-header`; never do that for sensitive values.

## Successful call result

```json
{
  "resultType": "complete",
  "content": [
    {"type": "text", "text": "{\"invoices\":[{\"invoice_id\":\"INV-77\",\"total\":\"120.00\",\"status\":\"open\"}],\"next_cursor\":null}"}
  ],
  "structuredContent": {
    "invoices": [{"invoice_id": "INV-77", "total": "120.00", "status": "open"}],
    "next_cursor": null
  },
  "isError": false
}
```

When returning `structuredContent`, also return the serialized JSON in a text block for clients that do not read structured results.

## Tool execution error (the model can correct itself)

```json
{
  "resultType": "complete",
  "content": [
    {"type": "text", "text": "No customer CUS-1O42 (letter O). Customer IDs use digits only; did you mean CUS-1042?"}
  ],
  "isError": true
}
```

Use this for invalid arguments, failed upstream calls and business-rule violations. Use JSON-RPC protocol errors only for malformed requests and unknown tools (for example code `-32602`).

## Asking the user for input mid-call

In this revision, a server that needs more input during a call returns `resultType: "input_required"`, and the client retries the call with the user's responses (multi round-trip requests). This replaces server-initiated elicitation, sampling and roots requests from earlier revisions.

## Streamable HTTP headers (summary)

| Header | Rule |
|---|---|
| `MCP-Protocol-Version` | On every POST; must match the version in the request's `_meta`; mismatch gives HTTP 400 |
| `Mcp-Method` | The JSON-RPC method, on every request |
| `Mcp-Name` | The tool, prompt or resource name or URI, for `tools/call`, `prompts/get` and `resources/read` |
| `Authorization` | `Bearer <token>` on every request when the server requires authorization |
| `Accept` | Must list `application/json` and `text/event-stream` |

Servers reject requests whose headers disagree with the body (HTTP 400). Servers on this revision do not issue session IDs.

## Older revisions

Clients on 2025-11-25 and earlier use an `initialize` handshake and may use session IDs. If you must serve them, use an SDK that supports both and test each revision you claim to support.
