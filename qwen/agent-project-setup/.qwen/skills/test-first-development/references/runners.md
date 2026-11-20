# Running One Test and the Suite

Run the single test during the cycle, and the relevant suite before calling a step green. Check the project's own scripts, Makefile or CI workflow first: they are the source of truth for flags and environment.

| Ecosystem | One test | Relevant suite |
|---|---|---|
| Rust (Cargo) | `cargo test name_fragment` | `cargo test -p crate_name`, or `cargo test --workspace` |
| Python (pytest) | `pytest path/test_file.py::test_name` | `pytest path/` or `pytest` |
| TypeScript (Vitest) | `npx vitest run path/file.test.ts -t "name"` | `npx vitest run` |
| TypeScript (Jest) | `npx jest path/file.test.ts -t "name"` | `npx jest` |
| Go | `go test ./pkg -run TestName` | `go test ./...` |
| Zig | `zig build test -- --test-filter "name"` (depends on `build.zig`) | `zig build test` |
| Shell (Bats) | `bats path/file.bats --filter "name"` | `bats test/` |
| Lua (busted) | `busted spec/file_spec.lua --filter "name"` | `busted` |
| Qt/QML | `QT_QPA_PLATFORM=offscreen ./tst_name` | the project's test target (`make check` or `ctest`) |

Notes:

- Run with the project's lockfile and pinned toolchain (`--locked` for Cargo, the repo's package manager for Node).
- Headless UI tests usually need an offscreen platform; never open real windows on the user's desktop from tests.
- Tests that need optional tools (containers, sandboxes) often skip when the tool is missing. Report skips; a skipped test is not a passing test.
