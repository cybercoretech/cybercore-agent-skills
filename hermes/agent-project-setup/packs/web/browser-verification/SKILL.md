---
name: browser-verification
description: Check web changes in a real (usually headless) browser before claiming they work. Opens the running app, walks the changed user flow, and collects evidence, including screenshots at phone and desktop widths and in light and dark themes, console errors, failed network requests, and basic keyboard and accessibility checks. Use after changing a website, web app, component, style, route, form or client-side script; when a user reports something broken in the UI; or when asked to "check it in the browser", "take a screenshot", or "verify the page". Works with Playwright, browser automation tools or Chrome DevTools, whichever the environment provides.
metadata:
  version: "1"
---

# Browser Verification

You confirm that a web change works the way a person would experience it, in a real browser, and you bring back evidence. Passing unit tests and a clean build do not show that a button is visible, a form submits, or a page works on a phone.

## Scope

- Running the app locally (or opening a provided preview) and walking the changed flow
- Screenshots at several widths and colour schemes, and reading them critically
- Capturing console errors, uncaught exceptions and failed network requests
- Quick keyboard, focus and automated accessibility checks
- Reporting what was checked, what was seen and what could not be checked

Deep accessibility work belongs to `accessibility-a11y`; visual design direction to `web-design-and-frontend-craft`; writing lasting end-to-end tests to `test-first-development`.

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Using real user accounts, real credentials or personal data. Use test accounts or seeded local data; never put passwords or tokens in scripts, logs or screenshots.
- Submitting anything with real-world effects: payments, emails or notifications to real people, production writes, deleting real records
- Testing against production unless the user explicitly asked, and then read-only
- Starting long-running background servers when the environment's rules require approval for them; otherwise stop any server you started before finishing
- Automating third-party sites beyond what the task needs, or bypassing their terms, logins or rate limits

## Workflow

1. **Know what changed and how a person reaches it.** List the flow to check: the page, the steps, the expected result. Include the obvious edge (empty state, error state, long text).
2. **Get the app running.** Use the project's own scripts (`npm run dev`, `astro dev`, `cargo run`, a static server for built output). Note the URL and port. Wait until it responds before opening it; never assume a fixed delay is enough.
3. **Pick the tool available.** Playwright (library or CLI), the agent's browser automation tools, or Chrome DevTools automation. See `references/tool-options.md`.
4. **Walk the flow.** Navigate, click, type and submit as a user would, waiting for elements and network activity rather than sleeping.
5. **Collect evidence while you go:**
   - console errors and warnings, and uncaught page exceptions
   - failed requests (network errors, 4xx and 5xx responses)
   - screenshots of the key states
6. **Check responsiveness and themes.** At least a phone width (about 390 px) and a desktop width (about 1280 px); light and dark if the site supports both. Look for horizontal scrolling, overlapping or clipped content, unreadable contrast, and controls too small to tap.
7. **Check the keyboard path.** Tab through the changed controls: every one reachable, focus visible, order sensible, nothing trapping focus. Run an automated accessibility scan (axe) if available and report serious findings.
8. **Read the screenshots.** Actually look at them. A screenshot you did not inspect is not evidence. Describe what you see.
9. **Clean up.** Stop servers you started, and keep evidence files in a scratch or temporary directory, not in the repository, unless the user wants them committed.
10. **Report.** What you checked, at which widths and themes, what you saw, console and network findings, and anything you could not check and why.

`references/checklist.md` lists what to check for common kinds of change (layout, form, navigation, data loading, theming, animation).

## Reading screenshots well

- Compare against the intent: is the changed element present, positioned and styled as intended?
- Check neighbours: did the change break something next to it?
- Look for the classic regressions: overflowing text, a hidden button under a sticky header, white-on-white text in one theme, layout jumps after fonts or images load.
- **Blank or single-colour captures are a tool problem, not a result.** Full-page captures of content far down a long page sometimes render empty in headless Chromium. Scroll the element into view or capture it directly, and check that the image is not one flat colour before trusting it.
- When comparing before and after, capture both at the same size, theme and data.

## Writing the report

```markdown
**Checked:** <flow>, at 390 px and 1280 px, light and dark
**Result:** works / broken / partly works — one sentence
**Seen:** what the screenshots show (attach or list paths)
**Console:** none / the errors, with source
**Network:** none failed / the failing requests and status codes
**Keyboard and a11y:** reachable, focus visible / issues found
**Not checked:** anything skipped and why (no test account, needs a real payment, etc.)
```

Never report "verified in the browser" without having opened the page in this session. If the browser tools are unavailable, say so and fall back to the next-best check (fetching the HTML, running the component tests), naming what that does not prove.

## Common failure modes

| Failure | Better |
|---|---|
| "Build passes, so the page works" | Open it and walk the flow |
| Only checking desktop width | Phone and desktop, both themes |
| Fixed `sleep` before clicking | Wait for the element or the network to settle |
| Taking screenshots but not looking at them | Inspect and describe each one |
| Ignoring console errors because the page "looks fine" | Report them; they often break other flows |
| Leaving a dev server running | Stop what you started |
| Logging in with your own real account | Test accounts and seeded local data only |

## Verification

- [ ] The changed flow was walked in a real browser in this session
- [ ] Screenshots at phone and desktop widths (and both themes when supported) were captured and inspected
- [ ] Console errors, page exceptions and failed requests were collected and reported
- [ ] Keyboard reachability and visible focus were checked for changed controls
- [ ] No real accounts, credentials, payments or production writes were used
- [ ] Servers started for the check were stopped, and evidence files stayed out of the repository unless requested
- [ ] The report states what was not checked
