# Public Release Scope

This repository is the sanitized public **agent-template distribution** for `cybercoretech/cybercore-agent-skills`.

It includes:

- 13 project-level agent templates (`<agent>/agent-project-setup/`)
- 42 canonical skills in `skills/` (38 default, 4 in the opt-in Omarchy pack) and 4 canonical rules in `rules/`
- `manifest.yaml`, the installer template, and the skill skeleton in `templates/`
- sync, validation, and sanitization scripts, the installer smoke test, and the CI workflow
- the Skills Explorer website (`website/`, published to GitHub Pages)
- README, setup guide, and MIT license

Every installer is project-level. Private builds may include machine-specific or global installers; those are intentionally not part of this distribution.

`scripts/check_public_sanitization.py` must pass before anything is published. It blocks private account names, local paths, and other machine-specific references.
