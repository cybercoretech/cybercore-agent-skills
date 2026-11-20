# Tool Options

Use whatever browser tooling the environment already provides. Do not install global packages or browsers without the user's approval.

| Tool | Good for | Notes |
|---|---|---|
| **Playwright library** (Node or Python) | Scripted flows, console and network capture, several viewports and themes, axe scans | Most complete. Use the project's dependency if present; otherwise ask before adding it. |
| **Playwright CLI** | Quick screenshots without writing a script | `npx playwright screenshot` takes options for viewport size, colour scheme, full page and waiting for a selector |
| **Agent browser tools** (MCP or built-in) | Interactive exploration: click, type, read the page, screenshot | Convenient for one-off checks; record the steps you took for the report |
| **Chrome DevTools automation** | Console, network, performance traces and DOM inspection in a real Chrome | Good for debugging why something fails, not just whether |
| **Fetching HTML** (`curl`) | Last resort when no browser is available | Proves the server responds and the markup contains something; does not prove layout, scripts or interaction |

## Playwright: a verification script (Node)

```js
// verify.mjs  —  node verify.mjs http://localhost:4321/
import { chromium } from "playwright";

const url = process.argv[2];
const out = process.env.OUT_DIR ?? "/tmp/browser-check";
const problems = [];
const browser = await chromium.launch();

for (const [name, viewport] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 800 }]]) {
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport, colorScheme });
    page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
    page.on("pageerror", (e) => problems.push(`exception: ${e.message}`));
    page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));
    page.on("requestfailed", (r) => problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`));

    await page.goto(url, { waitUntil: "networkidle" });
    // walk the flow here, for example:
    // await page.getByRole("button", { name: "Subscribe" }).click();
    // await page.getByText("Thanks for subscribing").waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) problems.push(`${name}/${colorScheme}: horizontal overflow`);
    await page.screenshot({ path: `${out}/${name}-${colorScheme}.png` });
    await page.close();
  }
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "no console errors, failed requests or overflow");
```

Read every screenshot afterwards; the script only catches what it measures.

## Accessibility scan with axe (Playwright)

```js
import AxeBuilder from "@axe-core/playwright";
const results = await new AxeBuilder({ page }).analyze();
for (const v of results.violations.filter((v) => ["serious", "critical"].includes(v.impact))) {
  console.log(`${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} element(s))`);
}
```

Automated scans find only part of accessibility problems; keep the manual keyboard check.

## Keyboard check

```js
await page.keyboard.press("Tab");
const focused = await page.evaluate(() => {
  const el = document.activeElement;
  return el ? `${el.tagName} ${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 40)}` : null;
});
```

Repeat through the changed controls and confirm focus is visible in the screenshots.

## Waiting correctly

- Wait for a selector, a role or text, or `networkidle`, never a fixed delay.
- For animations, wait for the end state or disable motion with `reducedMotion: "reduce"`.
- For a dev server, poll the URL until it answers before starting the browser.
