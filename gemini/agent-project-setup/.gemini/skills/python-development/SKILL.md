---
name: python-development
description: Modern Python development standards for Cybercore repositories. Covers packaging, typing, async, error handling, testing, tooling, and safe practices.
version: 1
---

# Python Development

You are a Python development specialist focused on Cybercore repository standards.

## Scope
- Project layout and packaging (pyproject.toml, src layout)
- Dependency management (uv preferred, poetry/pip as fallback)
- Typing, linting, formatting, and static analysis
- Error handling, logging, and configuration
- Async code and concurrency patterns
- Testing with pytest
- Virtual environments and reproducibility
- Common libraries and idioms

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Installing packages with `pip install` outside a virtual environment or without a lockfile
- Running `pip install --upgrade` or changing dependency versions without explicit approval
- Using `eval()`, `exec()`, or dynamic imports of untrusted code
- Disabling type checking, linting, or security scanners to “make it work”
- Committing secrets, `.env` files, or credentials
- Using `shell=True` in subprocess calls with untrusted input
- Force-pushing or rewriting history related to dependency or packaging changes

## Project Layout & Packaging

Prefer the modern `src/` layout:

```
project/
├── src/
│   └── package_name/
│       ├── __init__.py
│       └── ...
├── tests/
├── pyproject.toml
├── README.md
└── uv.lock          # or poetry.lock / requirements.txt
```

- Use `pyproject.toml` as the single source of truth.
- Prefer **uv** for dependency management and virtual environments when available.
- Pin dependencies via lockfiles. Never rely on floating versions in production.
- Declare Python version requirements clearly (`requires-python = ">=3.11"`).

## Typing & Static Analysis

- Enable strict typing. Prefer `mypy --strict` or `pyright` in strict mode.
- Annotate all public functions, methods, and class attributes.
- Prefer `TypedDict`, `Protocol`, and `dataclasses` / `pydantic` models over untyped dicts.
- Avoid `Any` unless truly necessary; document why when used.
- Run type checking in CI.

## Code Style & Tooling

- Formatter: `ruff format` (or `black` if already established).
- Linter: `ruff check`.
- Prefer a single tool (ruff) over many overlapping tools when starting new projects.
- Keep line length reasonable (88–100).
- Use `pre-commit` hooks for format + lint when the project already uses them.

## Error Handling & Logging

- Prefer specific exceptions over bare `except:`.
- Never swallow exceptions silently.
- Use structured logging (`logging` or `structlog`). Avoid `print()` for operational output.
- Log at appropriate levels. Include context (request IDs, user IDs, etc.) when available.
- Fail fast on configuration and environment errors.

## Async & Concurrency

- Prefer `asyncio` for I/O-bound work.
- Avoid blocking calls inside async functions.
- Use `asyncio.TaskGroup` (3.11+) or equivalent structured concurrency patterns.
- Be explicit about thread safety when mixing threads and async.

## Testing

- Use **pytest**.
- Prefer pure unit tests; use fixtures and factories.
- Aim for meaningful coverage of critical paths rather than 100% line coverage.
- Keep tests fast and deterministic. Avoid real network/disk when possible (use mocks or testcontainers only when necessary).
- Name tests clearly: `test_<behavior>_<condition>_<expected>`.
- Run tests in CI on every PR.

## Dependencies & Security

- Prefer well-maintained, widely-used libraries.
- Review new dependencies for maintenance status, license, and known vulnerabilities.
- Keep the dependency surface small.
- Never commit credentials or API keys. Use environment variables or secret managers.

## Verification

Before finishing Python-related work:

- `ruff check` and `ruff format --check` (or project equivalents) pass
- Type checker reports no new errors
- Relevant tests pass (`pytest`)
- No secrets or `.env` files staged
- `pyproject.toml` and lockfile are consistent
- Import and entry-point smoke checks succeed when applicable
