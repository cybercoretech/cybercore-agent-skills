---
name: terminal-keybinding-vim-nav
description: Apply uniform modal navigation (hjkl, /, ?, q) and generate discoverable footer keybind hints for terminal UIs. Use when asked to "add vim navigation", "standardize keybindings", "add keybind hints", "modal TUI navigation", "hjkl movement", "footer help bar", "discoverable shortcuts", or "keybinding audit". Not for TUI state and layout architecture (use ratatui-layout-state-architect).
metadata:
  version: '1'
---
# Terminal Keybinding & Vim-Navigation Standardizer

Applies uniform modal navigation (hjkl, `/`, `?`, `q`) and generates discoverable footer
keybind hints so every terminal UI behaves consistently and teaches itself to new users.

> [!IMPORTANT]
> Modal UIs break users who do not know the current mode. Every design decision here
> prioritizes **mode visibility** — the user must always know which mode they are in
> and how to leave it. When in doubt, make the mode indicator larger, not smaller.

---

## Steps

### 1. Audit the existing keybinding surface

Before standardizing anything, map the current state:

- List every key currently bound, its action, and which mode it belongs to.
- Note every place mode transitions occur (what triggers them, what the visual signal is).
- Identify bindings that conflict with the canonical set (§2) or with each other.
- Record whether a footer hint bar exists and what it currently shows.
- Note the UI framework in use (ratatui, blessed, bubbletea, curses/ncurses, OpenTUI, raw termios, etc.) — it determines how keybinds are registered and how the footer is rendered.

**Completion criterion:** a binding table is complete with columns:
`key | mode | action | conflict? | has hint?`
No changes are made in this step.

---

### 2. Apply the canonical binding set

Treat this table as the **single source of truth** for key assignments. Existing bindings
that conflict must be remapped, removed, or promoted to the conflict-resolution process (§3).

#### Universal bindings — active in every mode

| Key | Action |
|---|---|
| `?` | Toggle help overlay (full keybind reference) |
| `q` | Quit current view / close current pane; at root: exit |
| `Q` | Force-quit without confirmation (only when destructive state exists) |
| `Ctrl-c` | Interrupt / cancel current operation; never quit the whole app unless at idle root |
| `Ctrl-z` | Suspend to background (pass through to OS; do not capture unless essential) |
| `Esc` | Cancel current action / return to normal mode from any input mode |

#### Normal mode — navigation

| Key | Alias | Action |
|---|---|---|
| `h` | `←` | Move left / collapse node / go back |
| `j` | `↓` | Move down one item |
| `k` | `↑` | Move up one item |
| `l` | `→` | Move right / expand node / open / enter |
| `g` | `Home` | Jump to first item |
| `G` | `End` | Jump to last item |
| `Ctrl-f` | `Page Down` | Scroll one full page down |
| `Ctrl-b` | `Page Up` | Scroll one full page up |
| `Ctrl-d` | — | Scroll half-page down |
| `Ctrl-u` | — | Scroll half-page up |
| `H` | — | Jump to top of visible viewport |
| `M` | — | Jump to middle of visible viewport |
| `L` | — | Jump to bottom of visible viewport |
| `Enter` | `l` | Confirm / activate selected item |
| `Tab` | — | Move focus to next panel / widget |
| `Shift-Tab` | — | Move focus to previous panel / widget |

#### Search mode — triggered by `/` or `?`

| Key | Action |
|---|---|
| `/` | Enter forward search; cursor moves to search input |
| `?` | Enter backward search (or toggle help if no search context) |
| `n` | Next match (forward) |
| `N` | Previous match (backward) |
| `Esc` | Cancel search; return to normal mode; clear highlight |
| `Enter` | Confirm search term; return to normal mode; keep highlight |

#### Insert / input mode — triggered by `i`, `a`, `e`, or explicit field focus

| Key | Action |
|---|---|
| `Esc` | Exit input mode; return to normal mode; discard uncommitted input |
| `Enter` | Submit / confirm input |
| `Ctrl-u` | Clear current input field |
| `Ctrl-w` | Delete previous word |
| `Ctrl-a` | Move cursor to start of field |
| `Ctrl-e` | Move cursor to end of field |

#### Action / command mode — triggered by `:` (optional, for power tools)

| Key | Action |
|---|---|
| `:` | Enter command mode; focus command line |
| `Esc` | Cancel; return to normal mode |
| `Enter` | Execute command |
| `↑` / `↓` | Navigate command history |

#### Selection mode — triggered by `v` or `Space`

| Key | Action |
|---|---|
| `v` | Toggle selection on current item |
| `Space` | Toggle selection and advance cursor |
| `V` | Select all visible items |
| `u` | Deselect all |
| `Esc` | Exit selection mode; deselect all |

**Completion criterion:** every binding in the audit table (§1) is mapped to a canonical
slot, remapped, or flagged as a conflict for §3. No unresolved binding shares a key with
a canonical action.

---

### 3. Resolve conflicts

For every conflict identified, apply this decision order:

1. **Drop the non-canonical binding** if the action it performed has a canonical replacement.
2. **Remap to an unused uppercase or Ctrl variant** if the action has no canonical replacement
   and is used frequently enough to warrant a key (not every action needs one).
3. **Move to command mode** (`:action-name`) if the action is rare; keybinding is not required
   for rare actions.
4. **Document the deviation** if a binding cannot be canonicalized (e.g., the framework
   hardcodes it) — record it in the footer hint system as an exception.

**Conflict audit rule:** a key may have only one action per mode. Cross-mode shadowing is
permitted (e.g., `j` does different things in normal vs. insert mode) but must be
documented and must not surprise the user (the mode indicator makes the context explicit).

**Completion criterion:** no two bindings share a key within the same mode.
Every conflict has a resolution decision recorded.

---

### 4. Design the mode indicator

The mode indicator is a persistent, always-visible element that tells the user their current
modal context. It is not optional.

#### Placement

- **Preferred:** left side of the footer bar, before keybind hints.
- **Alternative:** top-left corner label, inside a status bar.
- Never inside the content area; it must not reflow content on mode change.

#### Indicator format

```
 NORMAL    ← padded, uppercase, styled block
 INSERT    ← distinct color from NORMAL
 SEARCH    ← distinct color; show search term alongside: SEARCH /query█
 SELECT    ← distinct color; show count: SELECT 3 items
 COMMAND   ← distinct color; show prompt: :█
```

#### Styling rules

| Mode | Suggested foreground | Suggested background | Note |
|---|---|---|---|
| NORMAL | black / bg | blue | Calm; this is the resting state |
| INSERT | black / bg | green | Active input — green = "go, type" |
| SEARCH | black / bg | yellow | Attention, scanning |
| SELECT | black / bg | magenta | Distinct from navigation |
| COMMAND | black / bg | cyan | Power-user tier |

> [!NOTE]
> These are suggestions, not mandates. The mandatory property is **distinctness** — every
> mode must be visually unambiguous from every other mode under the app's color theme.
> Run the colors through a contrast check if the theme is not yours to control.

**Completion criterion:** every mode in the binding set has a named, visually distinct
indicator that is visible in every screen state of the app.

---

### 5. Build the footer keybind hint bar

The footer hint bar is a single line at the bottom of the terminal that shows the most
relevant bindings for the current mode. It is _discoverable_ — it teaches the UI to users
who have not read documentation.

#### Hint bar anatomy

```
 NORMAL  │ hjkl Navigate  /  Search  ?  Help  q  Quit  Tab  Focus
```

```
 INSERT  │ Esc  Normal  Enter  Submit  Ctrl-u  Clear  Ctrl-w  Del Word
```

#### Design rules

1. **Show at most 6–8 bindings** per mode. The bar must fit in 80 columns (or the terminal
   width, whichever is smaller). Overflow is hidden, not wrapped.
2. **Order by frequency of use**, not alphabetical. The binding the user reaches for most
   often appears first.
3. **Separate key from label with two spaces** (not a colon, not a dash):
   - ✓ `q  Quit`
   - ✗ `q: Quit` / `q - Quit`
4. **Separate pairs with two or more spaces** or a thin vertical divider `│` (U+2502).
5. **Key tokens are styled** (bold, or background-highlighted); labels are plain.
6. **`?  Help` is always the last visible pair** (or second-to-last if `q  Quit` is last).
   Users who cannot find a binding must always find `?` to get the full list.
7. The hint bar updates on **every mode transition** — it must reflect the current mode
   within the same render frame that the mode changes.
8. When the terminal is narrower than 40 columns, **collapse to mode indicator only** —
   do not truncate individual hints mid-label.

#### Footer rendering template

```
╭──────────────────────────────────────────────────────────────╮
│  content area                                                │
╰──────────────────────────────────────────────────────────────╯
 NORMAL  │ hjkl Navigate  /  Search  Enter  Open  ?  Help  q  Quit
```

The footer sits outside the box, flush to the terminal bottom, full width.

---

### 6. Build the `?` help overlay

`?` opens a full-screen or modal overlay listing every binding grouped by mode. The hint
bar points users here; the overlay is the _complete_ reference.

#### Overlay structure

```
┌─ Keybindings ──────────────────────────────────────────────────┐
│                                                                 │
│  NAVIGATION                    SEARCH                           │
│  h / ←   Move left             /    Forward search              │
│  j / ↓   Move down             ?    Backward search             │
│  k / ↑   Move up               n    Next match                  │
│  l / →   Move right / open     N    Previous match              │
│  g        First item            Esc  Cancel search               │
│  G        Last item                                              │
│  Ctrl-f   Page down            SELECTION                        │
│  Ctrl-b   Page up              v    Toggle item                  │
│  Tab      Next panel           Space Toggle + advance            │
│                                V    Select all                   │
│  GLOBAL                        u    Deselect all                 │
│  ?    Toggle this help                                           │
│  q    Quit / close             [tool-specific section here]      │
│  Esc  Cancel / normal mode                                       │
│                                                                  │
│  Press ? or Esc to close                        v1.0  mytool     │
└──────────────────────────────────────────────────────────────────┘
```

#### Overlay rules

- Renders above all content; content below does not shift (use an overlay layer, not a push).
- Closes on `?`, `Esc`, or `q`.
- Scrollable if content exceeds terminal height (`j`/`k` or arrow keys scroll within overlay).
- Shows app name and version in the bottom-right corner of the overlay border.
- Never spawns a sub-overlay; `?` inside the overlay closes it, not opens another.

**Completion criterion:** `?` opens the overlay from every mode without raising an error.
Overlay closes on `?`, `Esc`, and `q`. Overlay content matches the actual binding table.

---

### 7. Handle terminal-width edge cases

The layout must not break at narrow widths. Apply all three degradations:

#### Width breakpoints

| Terminal width | Footer behavior |
|---|---|
| ≥ 80 columns | Full hint bar: mode indicator + all pairs |
| 40–79 columns | Abbreviated hint bar: mode indicator + 3 most-used pairs + `?  Help` |
| < 40 columns | Mode indicator only: `NORMAL` label, no pairs |

#### Overlay at narrow widths

- Below 60 columns: single-column layout (all binding groups stacked vertically).
- Below 40 columns: show only `Keybindings: press ? to close` message; do not attempt to render the table.

#### Scroll position preservation

- Mode transitions must not reset the scroll position in the content area.
- Entering and exiting search must restore the cursor to the item that was selected before search began, unless the user explicitly navigated to a match.

**Completion criterion:** resize the terminal to 38 columns while the app is running.
Confirm no layout crash, no truncated escape codes visible, no overlapping elements.
Restore to 80+ columns and confirm full layout returns.

---

### 8. Validate the full keybinding contract

Run all checks before marking complete.

#### Functional checklist

- [ ] `h`/`j`/`k`/`l` navigate in normal mode; arrow keys do the same.
- [ ] `g` jumps to first item; `G` jumps to last.
- [ ] `Ctrl-f` / `Ctrl-b` scroll a full page; `Ctrl-d` / `Ctrl-u` scroll half.
- [ ] `/` enters search mode; mode indicator changes; search input is focused.
- [ ] `n` / `N` cycle matches; `Esc` clears and returns to normal mode.
- [ ] `Esc` from insert mode returns to normal without submitting.
- [ ] `q` quits the current view; at root it exits the process (exit 0).
- [ ] `Ctrl-c` cancels the current operation; at idle it exits (exit 130 or 0 per design).
- [ ] `?` opens the help overlay from every mode.
- [ ] `?` / `Esc` closes the overlay; app returns to the prior mode.
- [ ] Footer hint bar updates on every mode transition within the same frame.
- [ ] Footer shows mode indicator on the left at all widths.
- [ ] At terminal width < 40, only the mode label is shown — no truncated pairs.
- [ ] Terminal resize does not crash the layout.
- [ ] All bindings in the overlay match the bindings that actually work.

**Completion criterion:** every checkbox checked. Any failure resets to the step owning
that surface (§2 for bindings, §4 for mode indicator, §5 for footer, §6 for overlay, §7 for width).

---

## Reference

### Framework integration notes

#### ratatui (Rust)

```rust
// Mode enum — define before anything else
#[derive(Clone, Copy, PartialEq)]
enum Mode { Normal, Insert, Search, Select, Command }

// Key dispatch — match on (mode, key_event)
fn handle_key(mode: &mut Mode, key: KeyEvent) {
    match (*mode, key.code) {
        (Mode::Normal, KeyCode::Char('j')) => move_down(),
        (Mode::Normal, KeyCode::Char('k')) => move_up(),
        (Mode::Normal, KeyCode::Char('/')) => { *mode = Mode::Search; }
        (Mode::Normal, KeyCode::Char('?')) => toggle_help(),
        (Mode::Normal, KeyCode::Char('q')) => quit(),
        (Mode::Insert, KeyCode::Esc)       => { *mode = Mode::Normal; }
        (Mode::Search, KeyCode::Enter)     => { *mode = Mode::Normal; }
        (_, KeyCode::Char('?'))            => toggle_help(), // universal
        _ => {}
    }
}
```

#### bubbletea (Go)

```go
type model struct { mode Mode; ... }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch m.mode {
        case ModeNormal:
            switch msg.String() {
            case "j": return m.moveDown(), nil
            case "k": return m.moveUp(), nil
            case "/": m.mode = ModeSearch; return m, nil
            case "?": m.showHelp = !m.showHelp; return m, nil
            case "q": return m, tea.Quit
            }
        case ModeInsert:
            if msg.Type == tea.KeyEsc { m.mode = ModeNormal; return m, nil }
        }
    }
    return m, nil
}
```

#### OpenTUI / blessed (Node.js)

```javascript
screen.key(['j', 'down'],  () => list.down(1));
screen.key(['k', 'up'],    () => list.up(1));
screen.key(['/'],          () => enterSearchMode());
screen.key(['?'],          () => toggleHelp());
screen.key(['q', 'C-c'],   () => process.exit(0));
screen.key(['escape'],     () => returnToNormal());
```

---

### Canonical binding cheat-sheet (copy into `?` overlay)

```
NAVIGATION              SEARCH                  GLOBAL
h / ←   Left            /    Forward search      ?    Help overlay
j / ↓   Down            ?    Backward search      q    Quit / close
k / ↑   Up              n    Next match           Esc  Cancel / normal
l / →   Right / open    N    Previous match       Tab  Next panel
g        First           Esc  Cancel search
G        Last            Enter Confirm search
Ctrl-f   Page down
Ctrl-b   Page up         SELECTION               INPUT MODE
Ctrl-d   Half-page down  v    Toggle item         Esc     Normal mode
Ctrl-u   Half-page up    Space Toggle + advance   Enter   Submit
H        Top of view     V    Select all          Ctrl-u  Clear field
M        Mid of view     u    Deselect all        Ctrl-w  Delete word
L        Bottom of view                           Ctrl-a  Field start
Enter    Open / confirm                           Ctrl-e  Field end
```

---

### Footer hint bar — per-mode templates

```
 NORMAL  │ hjkl Navigate  /  Search  Enter  Open  v  Select  ?  Help  q  Quit

 INSERT  │ Esc  Normal  Enter  Submit  Ctrl-u  Clear  Ctrl-w  Del Word

 SEARCH  │ Type to search  Enter  Confirm  n/N  Next/Prev  Esc  Cancel

 SELECT  │ Space Toggle  V  All  u  None  Enter  Act  Esc  Cancel  ?  Help

 COMMAND │ Type command  Enter  Run  ↑↓  History  Esc  Cancel  Tab  Complete
```

> [!TIP]
> Build the footer from a data structure, not a hardcoded string. Each mode owns a list of
> `(key_token, label)` pairs; the renderer joins them at display time and truncates to fit
> the current terminal width. This makes it trivially easy to add, remove, or reorder hints
> without touching layout code.

> [!WARNING]
> Never bind destructive actions (delete, overwrite, force-quit) to single lowercase letters
> without a confirmation step. `d` for delete is acceptable **only** if followed by a prompt
> or a second keypress (vim's `dd` pattern). Single-key destruction with no undo is a UX
> contract violation — it will surprise every user at the worst moment.
