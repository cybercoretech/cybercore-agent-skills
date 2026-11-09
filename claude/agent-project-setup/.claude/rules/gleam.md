# Gleam Development Standards

## 1. Type Safety & Architecture
- **Type Annotations:** Leverage Gleam's strong static type system; let type inference work where appropriate, but explicitly type public module boundaries.
- **Error Handling:** Utilize the `Result(data, error)` type rather than throwing exceptions or panics.
- **BEAM Ecosystem:** Keep modules aligned with Erlang/OTP idioms when interacting with actors or supervision trees.
