# Before and After

## README introduction

**Before**

> Welcome to SyncForge! 🚀 In today's fast-paced development landscape, keeping files in sync across machines is crucial. SyncForge is not just a sync tool, but a comprehensive, robust, and seamless solution that empowers developers to unlock effortless collaboration. Whether you're a solo hacker or a large team, SyncForge has you covered!

**After**

> SyncForge keeps a folder identical across your machines over SSH. It copies only changed blocks, resumes interrupted transfers, and never deletes a file on the other side without asking.

The "after" keeps the product name and replaces every adjective with something the tool actually does. If those facts were not known, the right edit is to ask, not to invent them.

## Pull request description

**Before**

> This PR delves into the configuration loading logic and introduces a robust new approach that leverages TOML parsing to seamlessly enhance the overall user experience. It's worth noting that this change is crucial for future scalability.

**After**

> Config files are now read as TOML instead of a custom key=value format.
>
> - Existing `.conf` files still load; a warning suggests running `tool migrate-config`.
> - Parse errors now show the line and column.
> - Tests: `cargo test config::` (12 new tests).

## Release notes

**Before**

> We're thrilled to announce version 2.4, packed with game-changing features and countless improvements that elevate your workflow to new heights!

**After**

> **2.4.0**
> - Added `--dry-run` to `sync`, which lists changes without copying.
> - Fixed a crash when a file name contained a newline (#212).
> - Changed: the default log level is now `warn` (was `info`).

## Error message

**Before**

> Oops! Something went wrong. An unexpected error occurred while processing your request. Please try again later.

**After**

> Couldn't save "Q3 report": the disk is full. Free some space, then try again.

(If the cause is genuinely unknown: "Couldn't save "Q3 report". Try again; if it keeps failing, copy the error ID ABC-123 into a support request.")

## Announcement email

**Before**

> I hope this email finds you well! I wanted to reach out to let you know that, moving forward, we will be leveraging a new process to streamline and optimize our deployment pipeline.

**After**

> From Monday 3 March, deploys go through the new pipeline: merge to `main` and it ships within ten minutes. You no longer need to run `deploy.sh`. Questions go to #platform.

## Editing someone else's text

Original (author's voice, slightly rambling):

> Honestly I think we should just drop the old API, nobody's used it in like a year and keeping it around is a pain every time we touch auth.

Edited for clarity, voice kept:

> I think we should drop the old API. Nobody has used it in about a year, and keeping it slows down every change we make to auth.

Not:

> It is recommended that the legacy API be deprecated due to low utilization and maintenance overhead.

The second loses the author's voice and adds formality nobody asked for.
