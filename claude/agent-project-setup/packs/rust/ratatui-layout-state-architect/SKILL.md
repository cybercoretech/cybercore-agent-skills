---
name: ratatui-layout-state-architect
description: Design and refactor Ratatui terminal applications around Elm-style state, messages, update logic, responsive layout constraints, and separated rendering widgets. Use for Rust TUI architecture, event-loop design, layout bugs, and maintainable screen composition. Not for choosing between a CLI, TUI or GUI (use rust-ui).
license: Apache-2.0
metadata:
  domain: software-development
  subdomain: rust-tui
  tags: rust, ratatui, tui, elm-architecture, event-loop, layout, state-management
  version: '1'
---
# Ratatui Layout State Architect

Use this skill when building or reviewing a Ratatui application whose correctness depends on predictable state transitions, terminal-size adaptation, focus/navigation behavior, or clean separation between application logic and drawing code.

## Target Architecture

Shape the application as a small Elm-style loop:

```text
terminal event / timer / command result
                  │
                  ▼
               Message
                  │
                  ▼
       update(&mut Model, Message)
                  │
                  ▼
          view(&Model, Frame)
                  │
                  ▼
             terminal draw
```

Prefer explicit domain messages over having widgets mutate unrelated state. Keep the model authoritative, make `update` the normal place for transitions, and make `view` a read-only projection of the model. If an effect is needed, represent it as a command/effect returned by the update layer rather than hiding it in rendering code.

Choose names that make ownership obvious. A useful baseline is:

```rust
struct App {
    screen: Screen,
    focus: Focus,
    should_quit: bool,
    // domain data, loading/error state, and transient UI state
}

enum Message {
    Key(KeyEvent),
    Tick,
    Resize(u16, u16),
    DataLoaded(Result<Data, AppError>),
    Quit,
}

fn update(app: &mut App, message: Message) -> Option<Command> { /* transition */ }
fn view(frame: &mut Frame, app: &App) { /* compose widgets */ }
```

Keep event acquisition, message translation, state transitions, effects, and drawing as separate concerns. The loop may own terminal setup/restore and polling, but it should not contain screen-specific layout logic.

## Event-Loop Rules

- Convert terminal input into messages at one boundary. Do not scatter `event::read` or key matching through widget render functions.
- Handle quit, focus changes, navigation, submit, and errors in `update`; keep key bindings easy to find and test.
- Use a bounded polling/tick strategy when background work or animations matter. Avoid a busy loop and avoid blocking the UI thread on I/O.
- Treat resize as ordinary input. Usually store the latest size only when layout behavior needs it; Ratatui’s frame area is the source of truth during rendering.
- Ensure every spawned task has a cancellation/termination story and sends results back as messages. Do not let tasks borrow short-lived frame or terminal state.
- Restore the terminal in a cleanup path even when the application exits with an error.

## Responsive Layout

Build layouts from the `Rect` received by each render function. Use constraints to express priorities rather than hard-coded coordinates:

- `Length` for stable chrome such as headers, footers, or fixed input rows.
- `Min` for content that should receive remaining space.
- `Percentage` or `Ratio` for proportional panes when the relationship matters.
- `Fill` or newer equivalent APIs only when the project’s Ratatui version supports them; match the repository’s pinned version instead of assuming the newest API.

Compose layouts hierarchically: split the outer region, then pass each child its own `Rect`. Apply minimum-size fallbacks for narrow terminals. If a panel cannot be useful below a threshold, collapse it, stack it, or render a concise fallback instead of allowing clipped or overlapping content.

Use one layout calculation per visual region and keep it near the code that consumes it. Avoid recomputing subtly different constraints in multiple widgets. When layout depends on state (for example, a detail pane or modal), make the mode explicit and test the resulting rectangles or visible behavior.

## Widget Separation

Organize rendering around components with narrow inputs:

```rust
fn render(frame: &mut Frame, app: &App) {
    let area = frame.area();
    let chunks = main_layout(area);
    render_header(frame, chunks.header, app);
    render_body(frame, chunks.body, app);
    render_footer(frame, chunks.footer, app);
}
```

Each renderer should receive the smallest useful immutable slice of state, a target `Rect`, and any derived display data. It should construct and render widgets, not perform I/O, mutate domain state, decide global navigation, or own the event loop. Keep reusable layout functions free of terminal side effects.

For complex screens, separate:

1. domain state and transitions;
2. presentation state such as focus, selection, scroll offset, and modal visibility;
3. layout calculation;
4. widget rendering;
5. input mapping and commands.

Use stable identifiers or enums for focus rather than inferring focus from widget order. Clamp selection and scroll offsets whenever the underlying collection or viewport changes. Derive display-only values during update or in small pure helpers so rendering remains deterministic.

## Review Checklist

When implementing or reviewing a change, check:

- Can the behavior be described as `Message -> update -> Model -> view`?
- Is there a single owner for each piece of mutable state?
- Are asynchronous results, timer events, and resize events represented consistently?
- Does rendering work for small, wide, and tall terminal areas without panics or overlap?
- Are `Constraint`s based on intent, with `Min`/flexible content absorbing remaining space?
- Can each widget be rendered and tested with a focused model slice?
- Are selection, focus, and scroll values valid after filtering, resizing, or data refresh?
- Are terminal modes restored on normal exit and failure?

Prefer a small focused refactor over introducing a framework or abstraction that obscures state flow. Preserve the project’s existing Ratatui version, error model, naming, and input backend unless the task explicitly calls for a migration.
