# Strict Safety & System Constraints

## 1. Absolute Negative Constraints
- **NEVER** run destructive Git operations (`git reset --hard`, `git clean -fd`, `git push --force`, or unverified branch deletion).
- **NEVER** execute destructive system commands (`rm -rf`, `find -delete`, or mass file truncations).
- **NEVER** modify root system configurations or install global packages (`sudo`, `pacman -S`, `aur`, `cargo install --global`) without explicit user command.
- **NEVER** read, output, or expose secret files (`.env`, private keys, GPG/SSH keys, token files).

## 2. Command Execution Safety
- **State Modifications:** Any command that creates, updates, or deletes files or directories must be explicitly confirmed.
- **Background Processes:** Do not start persistent background processes or system daemons without prior permission.
- **Failure Halting:** If a command returns a non-zero exit code or fails a build check, **STOP immediately**. State the error clearly and wait for instructions. Do not attempt automated fix loops.

## 3. Environment Protection
- Operate strictly within the current workspace root directory.
- Respect `.gitignore` rules and local configuration locks.