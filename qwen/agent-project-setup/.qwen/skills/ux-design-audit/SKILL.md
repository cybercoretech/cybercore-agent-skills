---
name: ux-design-audit
description: Audit an existing user interface for usability and visual quality, then fix what matters most in small, verified steps. Reviews hierarchy, layout and spacing, typography, colour and contrast, component states (empty, loading, error, disabled, hover, focus), forms, navigation, responsiveness, motion, consistency with the project's own design system, and interface copy; produces prioritized findings with screenshots; and proves fixes with before and after captures. Use when asked to review, critique, polish or "make this look better"; when a page feels off, cluttered, generic or inconsistent; before a launch; or after a redesign. Respects the project's existing brand and tokens. Not for building new designs from scratch (use web-design-and-frontend-craft).
metadata:
  version: "2"
---

# UX and Design Audit

You look at an interface the way its users and a careful designer would, find the problems that most hurt clarity, usability and polish, and fix them without redesigning what was not broken. Every finding points at something visible; every fix is shown before and after.

## Scope

- Reviewing screens and flows in a real browser, at several widths and themes
- Prioritized findings with evidence and a concrete fix each
- Small, reversible fixes that use the project's own tokens and components
- Before and after screenshots proving each fix

New visual direction and building pages belong to `web-design-and-frontend-craft`; deep accessibility work to `accessibility-a11y`; browser mechanics and evidence capture to `browser-verification`.

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Replacing the brand, palette, fonts or overall visual direction when asked only to audit or polish. Propose it; change it only with approval.
- Large structural rewrites (new layout system, new component library, new framework) as part of "polish"
- Removing features, content or legal text (privacy notices, consent, pricing terms) because it improves the look
- Changes that reduce accessibility (lower contrast, removed focus styles, smaller tap targets, motion without a reduced-motion path) for aesthetic reasons
- Using real user data, accounts or production systems to capture screens

## Workflow

### 1. Understand the intent

Before judging anything, learn what the screen is for: the main user, the one thing they should do or understand first, and the brand or design system it must follow. Read the design tokens, component library and any design docs. Ask the user if the purpose is unclear (`clarify-before-building`).

### 2. Capture the current state

Open each screen in scope in a real browser (`browser-verification`): phone (about 390 px) and desktop (about 1280 px), light and dark if supported, plus the important states (empty, loading, error, long content). These captures are the "before" evidence.

### 3. Review by area

Work through the areas in `references/heuristics.md`. For each screen:

- **Hierarchy:** is the primary action and message obvious in a few seconds? Is anything competing with it?
- **Layout and spacing:** consistent spacing scale, alignment to a grid, related things grouped, enough breathing room
- **Typography:** a small set of sizes and weights with clear steps, readable line length (about 45 to 75 characters) and line height
- **Colour and contrast:** text and controls meet contrast requirements in every theme; colour is not the only signal; accent colour reserved for what matters
- **States:** every interactive element has hover, focus, active and disabled states; data views have loading, empty and error states
- **Forms:** labels, help text, inline validation, sensible defaults, clear errors, tap targets at least about 44 px
- **Navigation:** users know where they are and how to get back; labels are plain words
- **Responsiveness:** nothing overflows, overlaps or becomes unreachable at phone width
- **Motion:** purposeful, quick, no layout jumps, respects reduced motion
- **Consistency:** same component looks and behaves the same everywhere; values come from the design tokens, not one-off numbers
- **Copy:** clear, specific labels and messages; buttons say what they do

### 4. Write prioritized findings

For each problem: what is wrong (with a screenshot reference), who it affects, why it matters, and the concrete fix using existing tokens or components. Rate priority by user impact:

| Priority | Meaning |
|---|---|
| **P1** | Blocks or misleads users: hidden primary action, unreadable text, broken layout on phones, missing error state |
| **P2** | Slows users or looks clearly broken: inconsistent components, weak hierarchy, cramped forms |
| **P3** | Polish: spacing drift, minor alignment, copy tightening |

Lead with the few P1 and P2 items. Separate **findings** from **suggestions** (optional ideas that change the design). `references/report-template.md` has the format.

### 5. Fix in small steps (when asked)

- One finding per change where practical, smallest change that resolves it
- Use existing tokens, components and patterns; add a new token only when a value is genuinely missing, and name it in the system's style
- After each fix, recapture the same screen, width, theme and state, and compare with the "before"
- Check that the fix did not break neighbours or other widths and themes
- Keep a list: finding, change, before and after captures

### 6. Report

Summarise what changed, show before and after pairs for each fixed finding, list what remains (with priorities), and note anything you chose not to change and why.

## Judging "looks better"

Taste claims need reasons. Tie every visual judgment to a principle the user can check: "the primary button and the secondary link have equal weight, so neither reads as the main action" beats "the buttons look off". Avoid restyling to your own preference; the project's design system and brand are the standard. `references/heuristics.md` lists checkable principles per area.

## Common failure modes

| Failure | Better |
|---|---|
| Redesigning the whole page when asked to polish | Fix the top findings within the existing design |
| Findings without screenshots | Every finding cites a capture |
| Desktop-only review | Phone and desktop, every theme, key states |
| One-off values (`margin: 13px`, a new hex colour) | Existing tokens and scale |
| "Make it pop" changes that lower contrast | Keep or improve accessibility |
| Twenty P3 nitpicks and the broken mobile menu buried at the end | Lead with P1 and P2 |
| Claiming a fix without an after capture | Recapture and compare |

## Verification

- [ ] The screen's purpose and the governing design system were identified first
- [ ] Before captures exist for every screen, width, theme and key state in scope
- [ ] Each finding has a capture, an impact, a priority and a concrete fix using existing tokens or components
- [ ] Findings are separated from optional design suggestions
- [ ] Brand, palette and fonts were unchanged unless approved
- [ ] Each fix has a matching after capture, and neighbours, widths and themes were rechecked
- [ ] Accessibility was kept or improved by every change
