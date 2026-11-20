# Testing an MCP Server

## 1. Handler tests (fast, most coverage)

Test each tool function directly, without the protocol:

- valid inputs return the expected result and identifiers
- every invalid input returns `isError: true` with an actionable message, not an exception
- boundary values: empty strings, maximum lengths, zero and negative numbers, unicode
- hostile inputs: `../` and absolute paths, shell metacharacters, SQL fragments, very large payloads, prompt-injection text in fields that end up in results
- access control: a caller without permission is refused
- upstream failures (simulated with a local fake): timeouts and errors become clear `isError` results
- no secret appears in any result or error

Follow `test-first-development`: write the failing test for a behaviour or bug first.

## 2. Protocol tests

Run the server and talk to it with the SDK's own client, in memory or over stdio:

- the tools list contains each tool with the expected schema; descriptions are present
- calls with valid arguments return results that validate against `outputSchema`
- calls with invalid arguments return `isError: true`
- an unknown tool name returns a protocol error
- for stdio: nothing but MCP messages appears on stdout (capture stdout and parse every line)
- for Streamable HTTP: requests without valid authorization get 401; a disallowed `Origin` gets 403; mismatched protocol-version or routing headers get 400

Run these for each specification revision you claim to support.

## 3. Inspector and real clients

- Connect a protocol inspector or debugging client to list tools and make calls by hand. Check that the tool supports your specification revision before trusting its results.
- Install the server in at least one real agent client in a test configuration (not the user's main setup without approval).
- Give the agent realistic requests and check that it picks the intended tool, passes valid arguments, and recovers from an `isError` result.
- Confirm destructive tools trigger a confirmation in the client.

## Evaluating tool descriptions

If you change descriptions or tool shapes, measure the effect: a small set of realistic requests, run with the old and new definitions, scoring whether the right tool was chosen with valid arguments. `skill-evaluation` describes the method; the same approach works for tool definitions.

## Checklist before release

- [ ] All handler and protocol tests pass
- [ ] stdout is clean for stdio; HTTP authorization, Origin and header checks verified
- [ ] Each supported specification revision tested
- [ ] A real client used the tools successfully on realistic requests
- [ ] README documents setup, required environment variables (names only), permissions each tool needs, and which tools are destructive
