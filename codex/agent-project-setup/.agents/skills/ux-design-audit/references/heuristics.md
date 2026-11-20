# Checkable Heuristics by Area

Each item is phrased so it can be checked in a screenshot or the code. Cite the item when reporting a finding.

## Hierarchy

- The primary action is visually strongest on the screen (size, colour, position); secondary actions are clearly weaker
- A newcomer can say what the page is for within about five seconds
- One clear heading per section; heading levels follow the content structure
- Decorative elements do not compete with content or calls to action

## Layout and spacing

- Spacing values come from one scale (for example 4, 8, 12, 16, 24, 32, 48); no arbitrary values
- Related items are closer to each other than to unrelated items (proximity)
- Edges align to a grid or a shared left edge; no near-miss alignments
- Content width limited for reading; full-bleed only for intentional sections
- Consistent padding inside similar components

## Typography

- At most a few sizes and two or three weights, with visible steps between levels
- Body text at least about 16 px on phones; line height about 1.4 to 1.6 for body
- Line length about 45 to 75 characters for paragraphs
- No more than two type families unless the brand specifies more
- Numbers in tables use tabular figures and align

## Colour and contrast

- Text contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text) in every theme
- Interactive borders and icons that convey meaning meet 3:1 against their background
- Colour is never the only signal (errors have text or icons, links are distinguishable)
- The accent colour marks what matters; not every element is highlighted
- No hard-coded colours that disappear in another theme

## Component states

- Buttons and links: default, hover, focus (visible ring), active, disabled
- Inputs: default, focus, filled, invalid with a message, disabled
- Data views: loading (skeleton or spinner), empty (with a next step), error (with recovery), partial
- Long content: very long names, many items, missing images

## Forms

- Every field has a visible label (placeholders are not labels)
- Required and optional fields are clear
- Errors appear next to the field, say what to do, and keep the user's input
- Primary submit is distinct; destructive actions are separated and confirmed
- Tap targets at least about 44 by 44 px with space between them
- Sensible input types and autocomplete hints (email, tel, one-time codes)

## Navigation

- The current page or section is indicated
- Labels are plain words users would use, not internal jargon
- Back, cancel and close behave predictably
- Important destinations are at most a few steps away

## Responsiveness

- No horizontal scrolling at 320 to 390 px
- Navigation remains reachable and usable on phones
- Images and tables adapt (scroll inside their container, or reflow)
- Sticky headers and footers do not cover content or inputs when the keyboard is open

## Motion

- Transitions roughly 150 to 300 ms, with purpose (orientation, feedback)
- No layout shift after load (reserved space for images and fonts)
- Reduced-motion users get instant or minimal transitions
- No auto-playing motion that cannot be paused

## Consistency

- The same component looks and behaves the same everywhere
- Icons from one family, at consistent sizes
- Values come from design tokens; repeated one-off values signal a missing token
- Terminology is consistent across screens

## Copy

- Buttons say what they do ("Save changes", not "Submit" or "OK")
- Error messages say what happened and what to do
- Empty states explain why it is empty and offer the next step
- No filler or marketing language inside working interfaces
