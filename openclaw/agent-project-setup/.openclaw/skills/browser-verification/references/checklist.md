# What to Check, by Kind of Change

Always: the changed flow works, no console errors, no failed requests, phone and desktop widths, both themes when supported.

## Layout or styling

- Element appears where intended at phone and desktop widths
- No horizontal scrolling; nothing clipped or overlapping
- Long text, long words and translated strings still fit
- Neighbouring components unchanged
- Contrast readable in light and dark themes
- Sticky headers and footers do not cover content or controls

## Forms

- Each field reachable by keyboard, with a visible label
- Validation messages appear, are readable and are announced (associated with the field)
- Submit works once (no double submission), shows progress, then success or a clear error
- Error from the server is shown, not swallowed
- Use test data; never submit to real payment, email or production endpoints

## Navigation and routing

- Links and buttons go where they say; back and forward work
- Direct load of a deep URL works (not only client-side navigation)
- Unknown routes show a proper not-found page
- Active state in the navigation is correct

## Data loading

- Loading state shown, not a blank flash
- Empty state is meaningful
- Error state when the request fails (simulate a failing response if possible)
- No duplicate requests or request loops in the network log

## Theming

- Both themes render every changed element; no hard-coded colours that vanish in one theme
- The theme choice persists across reloads if the site supports choosing
- Scrollbars, focus rings and form controls follow the theme

## Animation and motion

- End state correct after the animation
- No layout jump or flicker
- Respects reduced motion (check with reduced motion emulated)
- No jank on a phone-sized viewport

## Interactive components (menus, dialogs, tabs)

- Open and close with mouse and keyboard (Escape closes dialogs and menus)
- Focus moves into a dialog and returns to the trigger on close
- Focus is not trapped elsewhere
- Screen-reader names and states present (`aria-expanded`, roles)
