# Audit Report Template

```markdown
# UX and design audit: <product or screen>

**Date:** YYYY-MM-DD  **Commit:** <sha>  **Scope:** <screens and flows>
**Viewed at:** 390 px and 1280 px, light and dark; states: empty, loading, error
**Design system:** <tokens file, component library, brand guide>

## Summary
Two or three sentences: the biggest problems and the order to fix them.

| ID | Finding | Area | Priority | Status |
|---|---|---|---|---|
| UX-1 | Primary "Start trial" button is weaker than the secondary link | Hierarchy | P1 | Open |
| UX-2 | Settings form errors appear only at the top of the page | Forms | P2 | Open |

## Findings

### UX-1: Primary action is weaker than the secondary link
- **Screens:** home, 1280 px and 390 px (`before/home-desktop-light.png`)
- **What's wrong:** the outline "Start trial" button sits next to a bold, accent-coloured "Learn more" link, so the eye goes to the secondary action first
- **Who it affects:** every new visitor; the trial is the page's main goal
- **Heuristic:** Hierarchy, "the primary action is visually strongest"
- **Fix:** use the filled `button--primary` component for "Start trial" and the neutral link style for "Learn more"; no new tokens needed

## Suggestions (optional design changes)
Ideas that would change the design rather than fix a problem, for the user to decide.

## What works well
Patterns worth keeping.

## Not reviewed
Screens, states or devices out of scope.
```

## Before and after log (when fixing)

```markdown
| ID | Change | Before | After | Rechecked |
|---|---|---|---|---|
| UX-1 | Primary component on "Start trial" | before/home-desktop-light.png | after/home-desktop-light.png | phone, dark: ok |
```

Capture before and after at the same width, theme, data and scroll position, so the comparison is fair.
