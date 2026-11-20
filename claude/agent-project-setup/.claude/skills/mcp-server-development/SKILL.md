---
name: mcp-server-development
description: Design, build, secure and test Model Context Protocol (MCP) servers that expose tools, resources and prompts to AI agents. Covers agent-friendly tool design (names, descriptions, strict input schemas, structured output, errors the model can recover from), the stdio and Streamable HTTP transports, the stateless request model of current spec revisions, authorization for remote servers, security against prompt injection and over-broad permissions, and testing at the handler, protocol and real-client levels. Use when creating or changing an MCP server or tool, wrapping an API or CLI for agents, reviewing an MCP server's safety, or debugging why a client cannot see or call a tool.
metadata:
  version: "1"
---

# MCP Server Development

You build MCP servers that agents can use correctly and that cannot be turned against their users. A good server has few, well-described tools with strict inputs and clear results, follows the specification revision its clients speak, and treats every input, including text from the model, as untrusted.

## Scope

- Choosing what to expose as tools, resources and prompts
- Writing tool definitions: names, descriptions, input and output schemas, annotations
- Implementing handlers with validation, errors and limits
- stdio and Streamable HTTP transports; authorization for remote servers
- Security review of an MCP server
- Testing handlers, protocol behaviour and real-client use

Calling models and designing agents is `llm-application-patterns`; general API design is `api-backend`; a full security review uses `security-audit`.

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Exposing tools that run arbitrary shell commands, evaluate code, or read and write arbitrary file paths. Confine them to allowlisted commands and directories, or get explicit approval for the risk.
- Exposing destructive or irreversible tools (delete, send, pay, deploy) without a confirmation step and accurate annotations
- Binding an HTTP server to all interfaces or publishing it on a network without authentication
- Passing a user's or client's token through to an upstream API. The server uses only tokens issued for it, and its own credentials for upstream calls.
- Putting secrets in tool descriptions, results, logs or error messages
- Installing an MCP server into a user's agent configuration, or adding third-party servers, without their approval

## Start from the specification revision

MCP changes. Revision **2026-07-28** made the protocol stateless: the `initialize` handshake and `Mcp-Session-Id` header were retired, each request carries its protocol version and capabilities in `_meta`, clients may call `server/discover`, and Streamable HTTP requests carry routing headers. Older clients may still speak 2025-11-25 or earlier.

Before writing code:

1. Read the current specification at `modelcontextprotocol.io/specification` and note the revision.
2. Check which revision your SDK supports; SDKs can lag the spec. Prefer an official SDK (TypeScript, Python, C#, Go, Rust and Ruby are Tier 1 at the time of writing) over hand-rolled JSON-RPC.
3. Decide which client revisions you must support, and whether you need the older handshake for them.

`references/protocol-shapes.md` shows the current tool definition, call result and error shapes.

## Decide what to expose

- **Tools** are actions the model chooses to call (search, create, update). Most servers are mainly tools.
- **Resources** are data the client reads by URI (files, records, documents).
- **Prompts** are reusable, user-chosen templates.

Expose the smallest set that covers the real tasks. Many narrow, overlapping tools confuse models; one giant tool with a mode switch hides behaviour. Design around user tasks ("find invoices for a customer"), not around your API's endpoints one to one.

## Design tools for agents

`references/tool-design.md` has detail and examples. In short:

- **Names:** short, specific, consistent verbs (`search_issues`, `create_issue`); 1 to 128 characters from letters, digits, `_`, `-` and `.`.
- **Descriptions:** what it does, when to use it versus similar tools, important limits, and what it returns. The model only knows what the description says.
- **Input schema:** a strict JSON Schema object with types, enums, formats, ranges and required fields; `additionalProperties: false`. Describe every parameter.
- **Output:** concise text the model can use, plus `structuredContent` matching an `outputSchema` when results are data. Return identifiers the next call needs. Paginate large results; never dump everything.
- **Errors:** report tool failures inside the result with `isError: true` and a message that says what went wrong and how to fix the call; reserve protocol errors for malformed requests and unknown tools.
- **Annotations:** set `readOnlyHint`, `destructiveHint`, `idempotentHint` and `openWorldHint` truthfully. They are hints for clients, not security controls; the defaults assume a tool may be destructive and open-world.
- **State:** the protocol is stateless. If a workflow spans calls, return an opaque handle from the first call and accept it in later ones, instead of relying on a session.

## Implement handlers safely

- Validate every argument against the schema and your own rules, even if the SDK validated it already.
- Enforce access control per call: who is calling, and may they touch this object?
- Confine file access to configured roots (resolve paths, reject anything outside); run commands only from an allowlist, with argument arrays and no shell.
- Set timeouts, size limits and rate limits on every outbound call and result.
- Treat text from external sources (web pages, documents, issue bodies) that you return to the model as untrusted: label it as data, never as instructions, and never let it trigger other tools on its own.
- Keep secrets in the server's environment or secret store; redact them from errors and logs.

## Transports

- **stdio** (local servers launched by the client): write only valid MCP messages to stdout, one per line; send all logging to stderr; exit promptly when stdin closes. Credentials come from the environment, not from the protocol's authorization flow.
- **Streamable HTTP** (remote or shared servers): one endpoint accepting POST; validate the `Origin` header on every request; bind to localhost unless deliberately exposed; require authentication; check the protocol version and routing headers the current spec requires. The legacy HTTP+SSE transport is deprecated; support it only for old clients.

## Authorization for remote servers

Follow the specification's authorization section: OAuth 2.1 through an authorization server, protected resource metadata, bearer tokens on every request (never in the query string), and **audience validation**: accept only tokens issued for this server. Return 401 for missing or invalid tokens and 403 with the required scope for insufficient scope. Never accept or forward other tokens. Use a mature OAuth library; do not build token validation by hand.

## Testing

`references/testing.md` covers each level:

1. **Handler tests:** call tool functions directly with valid, invalid and malicious inputs (path traversal, huge inputs, injection strings).
2. **Protocol tests:** run the server with the SDK's client (in memory or over stdio) and check discovery or listing, tool calls, `isError` results and schema conformance.
3. **Inspector and real clients:** connect a protocol inspector (check that it supports your revision) and at least one real agent client; confirm the tools appear, descriptions lead the model to the right tool, and confirmations fire for destructive tools.

## Common failure modes

| Failure | Better |
|---|---|
| Logging to stdout in a stdio server | Logs to stderr; stdout carries only MCP messages |
| One tool per API endpoint, forty tools | A few task-shaped tools |
| Vague descriptions ("Gets data") | What, when, limits, returns |
| Throwing protocol errors for bad arguments | `isError: true` result with a fix hint |
| Returning ten thousand rows | Paginate and summarise |
| `readOnlyHint: true` on a tool that writes | Truthful annotations |
| Trusting annotations or descriptions from a third-party server | Treat them as untrusted hints |
| HTTP server on `0.0.0.0` without auth | Localhost and authentication |
| Forwarding the client's token upstream | Server's own credentials for upstream calls |
| Assuming the SDK speaks the latest spec | Check the SDK's supported revision |

## Verification

- [ ] The target specification revision and the SDK's supported revision are known and compatible with intended clients
- [ ] Each tool has a specific name, a description covering what, when, limits and returns, and a strict input schema
- [ ] Results are concise, paginated where large, structured where data, and include the identifiers next calls need
- [ ] Tool failures return `isError: true` with actionable messages; annotations are truthful
- [ ] Inputs are validated, files and commands confined, limits and timeouts set, secrets redacted
- [ ] stdio servers keep stdout clean; HTTP servers validate Origin, bind safely and require authentication with audience-checked tokens
- [ ] No token passthrough; destructive tools require confirmation
- [ ] Handler, protocol and real-client tests pass
