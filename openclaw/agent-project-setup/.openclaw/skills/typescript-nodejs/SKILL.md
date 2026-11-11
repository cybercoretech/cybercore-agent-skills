---
name: typescript-nodejs
description: TypeScript and Node.js development standards for Cybercore repositories. Covers strict typing, modern module systems, tooling, API patterns, testing, and safe practices.
metadata:
  version: "1"
---

# TypeScript & Node.js Development

You are a TypeScript and Node.js development specialist focused on Cybercore repository standards.

## Scope
- TypeScript strict mode and type-safe patterns
- Node.js / Deno / Bun runtime considerations
- Package management and module systems (ESM preferred)
- Linting, formatting, and static analysis
- API and backend service patterns
- Frontend framework awareness (React, Next.js, etc.)
- Testing with Vitest / Jest / Playwright
- Configuration, environment handling, and security

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Installing packages without a lockfile or outside the project package manager
- Using `any` to silence type errors without documenting why
- Disabling strict TypeScript options or ESLint rules just to make code compile
- Committing secrets, `.env` files, or credentials
- Using `eval()`, dynamic `require`/`import` of untrusted code, or `child_process` with unsanitized input
- Force-pushing or rewriting history related to dependency changes
- Running production builds or deploys without explicit approval

## Project Setup & Tooling

- Prefer **TypeScript strict mode** (`"strict": true` and related flags).
- Use a modern package manager: **pnpm** or **npm** with lockfiles; Bun is acceptable when the project already uses it.
- Prefer **ESM** (`"type": "module"`) for new projects.
- Recommended core tools:
  - Formatter / linter: `eslint` + `@typescript-eslint` (or Biome when already adopted)
  - Type checker: `tsc --noEmit`
  - Test runner: Vitest (preferred) or Jest
- Keep `tsconfig.json` clean and shared via project references when monorepos are involved.

## Typing Standards

- Annotate public APIs, function parameters, and return types.
- Prefer `unknown` over `any`. Narrow with type guards.
- Use discriminated unions, `satisfies`, and utility types effectively.
- Prefer interfaces for object shapes that may be extended; types for unions and mapped types.
- Avoid unnecessary type assertions (`as`). Prefer proper narrowing.

## Code Organization

- Clear separation of concerns: routes / controllers, services, repositories, domain logic.
- Prefer small, focused modules over large files.
- Use path aliases (`@/`) consistently when configured.
- Keep side effects out of import-time code when possible.

## Error Handling & Logging

- Prefer typed error classes or Result-style patterns over throwing raw strings.
- Never swallow errors silently.
- Use structured logging. Avoid `console.log` for operational output in production code.
- Propagate context (request IDs, user IDs) through async boundaries.

## Async & Concurrency

- Prefer `async/await` over raw Promises or callbacks.
- Handle promise rejections; avoid floating promises.
- Be deliberate about concurrency limits when calling external services.
- Use `AbortController` for cancellable operations when appropriate.

## Testing

- Unit tests with Vitest/Jest for business logic.
- Integration / API tests for critical paths.
- End-to-end tests (Playwright) for user-critical flows when the project already uses them.
- Prefer deterministic tests; mock external services.
- Run type checking and tests in CI on every PR.

## Dependencies & Security

- Keep the dependency surface small.
- Prefer well-maintained packages with active security response.
- Audit new dependencies for license, maintenance, and known vulnerabilities.
- Never commit `.env` or credential files. Use environment variables or a secret manager.

## Verification

Before finishing TypeScript/Node work:

- `tsc --noEmit` (or project equivalent) reports no new errors
- Linter / formatter checks pass
- Relevant unit and integration tests pass
- No secrets or `.env` files staged
- Lockfile is consistent with `package.json`
- Entry points and basic smoke checks succeed
