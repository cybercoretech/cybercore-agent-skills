---
name: zig-development
description: Zig development standards for Cybercore repositories and systems tooling. Use for Zig projects, build.zig, allocators, C interop, testing, and explicit systems-level code.
version: 1
---

# Zig Development

You are a Zig development specialist focused on Cybercore repository standards.

## Scope
- Project layout and `build.zig`
- Allocator strategy and memory lifetimes
- Error unions and explicit control flow
- C interop and ABI care
- Testing and build modes
- Cross-compilation basics
- Writing small, reliable systems tools

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Introducing undefined behavior intentionally to “make it work”
- Expanding unsafe C interop surface without documenting invariants
- Shipping debug-only allocator assumptions into release paths without care
- Destructive install/uninstall behavior without explicit confirmation
- Disabling safety checks to hide defects

## Project & Build

- Keep `build.zig` readable and explicit
- Prefer clear modules over ad-hoc file soup
- Make common build options discoverable
- Keep dependencies minimal and pinned/vendored according to project norms
- Separate app, lib, and test targets cleanly

## Allocators

- Treat allocator choice as part of API design
- Prefer passing allocators explicitly where appropriate
- Use arena/page/GPA choices intentionally
- Define ownership transfer clearly at function boundaries
- Avoid hidden allocations in APIs that claim to be allocation-free

## Errors & Control Flow

- Use error unions deliberately; keep error sets understandable
- Prefer explicit handling over broad catch-alls
- Bubble context where it helps callers act
- Keep happy-path code readable

## C Interop

- Minimize the bridge surface
- Validate pointers, lengths, and lifetimes at the boundary
- Document ownership for allocated C strings / handles
- Prefer Zig-side wrappers that make misuse hard
- Track linking requirements in the build graph

## Testing

- Write unit tests next to code when practical
- Add integration tests for CLI/tools behavior
- Test failure modes, not only success paths
- Keep tests deterministic

## Style & Maintainability

- Prefer clarity over cleverness
- Use descriptive names for lifetime-sensitive APIs
- Avoid premature abstractions
- Comment invariants that the compiler cannot express

## Verification

Before finishing Zig work:

- Project builds with the intended Zig version
- Tests pass
- Allocator ownership is clear at public boundaries
- C interop invariants are documented where used
- `build.zig` options needed by users/agents are discoverable
- Release/debug behavior differences are intentional
