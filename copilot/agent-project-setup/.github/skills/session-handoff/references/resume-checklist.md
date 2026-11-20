# Resume Checklist

Run these before trusting a handoff. Adapt to the project's tooling.

## Repository

```sh
git fetch --prune
git status                      # branch, uncommitted changes
git log --oneline -5            # where the branch is
git log --oneline main -5       # where main is
git branch -vv                  # local branches and their upstream state
```

- Uncommitted changes you did not expect: find out whose they are before touching them.
- A branch the handoff calls "in progress" that is already merged: delete it only after confirming it is merged (`git branch --merged main`).

## Pull requests and CI (GitHub CLI)

```sh
gh pr list --author @me --state all --limit 10
gh pr view <number> --json state,mergedAt,statusCheckRollup
gh run list --branch main --limit 3
```

Update every pull request and CI claim in the handoff to what these show.

## Environment

- Required tools present (compilers, containers, sandbox tools), at the versions the handoff assumes
- Required environment variables set (check that they exist; never print secret values)
- Long-running processes the handoff mentions: are they still running, and should they be?

## Reconcile

| Handoff says | Reality | Action |
|---|---|---|
| PR open | Merged | Sync main, update the handoff, continue with the next step |
| Done | Missing | Tell the user before redoing it |
| Next step X | X already done | Skip it, update the handoff |
| A decision | The user now asks for something different | Follow the user; record the new decision |
| Nothing running | A process from the last session is still running | Ask before stopping it unless it is clearly yours |

Then update the handoff's "State now" section with today's date before starting work.
