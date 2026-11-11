---
name: rust-persistence
description: File and SQLite persistence for Cybercore Rust apps. Use for atomic writes, data directories, SQLite setup, and ordered migrations. Do not invent a second database without approval.
version: 1
---

# Rust Persistence

You are a Rust persistence specialist focused on Cybercore applications.

## Scope
- When to use a file vs SQLite
- Atomic file writes
- SQLite connection settings
- Ordered migrations
- Tests against temporary databases

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- A migration that drops or rewrites user data without a backup step or an explicit approval
- Editing a migration that has already shipped
- Opening the developer’s real data directory from tests
- A new database engine (Postgres, a custom file format) when SQLite or one file is enough
- Storing secrets in the same world-readable file as ordinary settings

## Choose the Store

| Data | Store |
|---|---|
| Small settings the user may hand-edit | TOML or JSON file in the config dir |
| Records you query, update, or migrate | SQLite in the data dir |
| Cache that can be deleted | Cache dir, never the only copy of user work |

## Files

- Write a temp file in the same directory, then `rename` over the target. Same-directory rename is atomic on Linux.
- fsync the file (and the directory when durability matters) before treating the write as committed.
- Read with a clear error if the file is missing vs corrupt. Corrupt is a failure, not a silent reset, unless the file is a cache.

## SQLite

- One application database file under the data dir.
- Set a busy timeout. Prefer WAL for apps with a reader and a writer.
- Foreign keys on.
- Do not hold a transaction across `.await`. Finish the transaction on the blocking pool or use an API that is safe to await.
- Parameters are bound. Never format SQL with user strings.

## Migrations

- Integer versions, applied in order, recorded in a `schema_migrations` table (or the tool’s equivalent).
- Ship a new migration to change the schema. Do not rewrite an old one.
- Migrations are forward-only unless you also ship a tested down migration.
- Run migrations at startup before serving commands. Fail startup if a migration fails.

## Tests

- Each test gets a temp directory and its own database file.
- Assert the migration sequence from empty to current.
- Do not point tests at `~/.local/share/<app>`.

## Verification

- Store choice matches the table above
- Writes are atomic
- SQL is parameterized
- New schema changes are a new migration
- Tests use temp databases only
- Startup fails clearly when a migration fails
