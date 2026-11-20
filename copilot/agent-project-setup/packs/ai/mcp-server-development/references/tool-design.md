# Tool Design for Agents

The model decides which tool to call and how, from the name, description and schema alone. Write them for a capable reader who has never seen your system.

## Shape tools around tasks

| Poor | Better |
|---|---|
| `get_users`, `get_user_by_id`, `get_user_by_email`, `get_users_by_team` | `find_users` with optional `id`, `email` or `team` filters |
| `api_request` with free-form method and path | Specific tools for the operations agents need |
| `manage_issue` with `action: create/update/close/delete` | `create_issue`, `update_issue`, `close_issue` (separate risk levels and annotations) |

Separate read and write tools, so read-only tools can be marked and allowed freely while writes require confirmation.

## Descriptions

Cover four things, briefly:

1. **What it does:** "Creates a draft invoice for a customer."
2. **When to use it, and when not:** "Use get_invoice instead if the invoice already exists."
3. **Limits:** "At most 50 line items. Amounts in the customer's currency."
4. **What it returns:** "Returns the new invoice_id; the invoice stays a draft until send_invoice."

Avoid marketing language and internal jargon. If the model often picks the wrong tool, fix the descriptions first.

## Parameters

- Every parameter has a `description` with an example of a valid value.
- Use `enum` for closed sets, `format` (`date`, `email`, `uri`) where it applies, and `minimum`/`maximum`/`maxLength` for limits.
- Prefer IDs over names when both exist, and say where IDs come from ("from search_invoices").
- Keep optional parameters few and give them sensible defaults.
- `additionalProperties: false` so typos fail loudly.

## Results

- Lead with what the model needs for the next step: IDs, status, counts.
- Summarise large results and paginate with a cursor; state the total if known.
- Return `structuredContent` with an `outputSchema` for data, plus a short text form.
- Do not return raw HTML, huge logs or binary data unless the task needs it; offer a resource or a follow-up tool instead.
- Mark untrusted external text clearly (for example under a "Fetched content (untrusted)" heading) so the model treats it as data.

## Errors that help the model recover

- Say what was wrong and how to fix the call: "status must be one of open, paid, void; got 'unpaid'".
- Include the valid alternatives when there are few.
- For upstream failures, say whether retrying makes sense ("rate limited; retry after 30 s").
- Never include stack traces, internal URLs or secrets.

## Annotations

| Hint | Set it to true when |
|---|---|
| `readOnlyHint` | The tool changes nothing anywhere |
| `destructiveHint` | A write can delete or irreversibly change data (only meaningful when not read-only) |
| `idempotentHint` | Calling twice with the same arguments has the same effect as once |
| `openWorldHint` | The tool reaches external systems beyond the server's own data (web, third-party APIs) |

Clients may use these to decide when to ask the user for confirmation, but must not trust them from untrusted servers. Your server's own confirmation and access controls are what actually protect users.

## Long-running and multi-step work

- Return a handle immediately and provide a status tool, rather than blocking for minutes.
- For workflows across calls, pass opaque handles instead of relying on server-side sessions.
- Make write tools idempotent where possible (accept a client-provided request ID), so retries do not duplicate actions.
