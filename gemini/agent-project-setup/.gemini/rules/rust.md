# Rust Development Standards

## 1. Idiomatic Code & Safety
- **Avoid Unsafe Code:** Never use `unsafe` blocks without explicit user approval and a detailed safety comment explaining invariants.
- **Error Handling:** Avoid `.unwrap()` and `.expect()` in production library code; return `Result<T, E>` and utilize proper error propagation (`?`).
- **Memory Management:** Minimize unnecessary allocations and prefer borrowing (`&T`, `&mut T`) over cloning (`.clone()`) where lifetime constraints allow.

## 2. Toolchain & Testing
- Use standard cargo commands (`cargo check`, `cargo test`, `cargo clippy`).
- Ensure all compiler warnings are resolved before confirming code changes.