---
name: rust-ui
description: Choosing and building Rust user interfaces for Cybercore and Omarchy apps. Use when deciding CLI vs ratatui vs a native GUI, or when adding a TUI. Do not add a GUI toolkit the repo does not already use without approval.
metadata:
  version: "1"
---

# Rust UI

You are a Rust UI specialist focused on Cybercore and Omarchy applications.

## Scope
- Choosing CLI, TUI, or GUI
- `ratatui` application structure
- Keeping domain logic out of the widget layer
- Omarchy and terminal constraints

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Adding GPUI, iced, egui, or another GUI crate the project does not already depend on
- A TUI that cannot be quit with a normal key (Esc or `q`) and Ctrl-C
- Drawing UI in a library crate that other binaries use as a pure library
- Grabbing the real terminal in tests without restoring it

## Choice

| Need | Use |
|---|---|
| Scripts, agents, pipes | CLI only (`rust-config-and-cli`) |
| Interactive terminal session | `ratatui` + `crossterm` |
| Native desktop | Only the toolkit already in the repo. If none, stop and ask |

- Default is CLI. A TUI is an extra surface, not a replacement: the same actions stay available as subcommands.
- Do not add a GUI “for later.”

## TUI Structure

- Domain state lives in the library. The TUI holds a view model and sends commands down.
- One event loop: tick, input, render. No ad-hoc threads drawing the screen.
- Restore the terminal on panic (a panic hook or `drop` guard) so the user’s shell is not left broken.
- Keys are documented in a help view.
- Respect terminal width. Do not assume 200 columns.
- On Omarchy, the TUI runs inside the user’s terminal. Do not take over the Hyprland session.

## Tests

- Test the view model and reducers without a tty.
- Snapshot full screen buffers only for a stable, narrow widget. Do not snapshot entire frames that include timestamps.

## Verification

- CLI path still works if you added a TUI
- Quit and Ctrl-C restore the terminal
- No new GUI crate without approval
- Domain tests do not open a terminal
- Help lists the keys you added
