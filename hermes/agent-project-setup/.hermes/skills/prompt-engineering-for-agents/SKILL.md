---
name: prompt-engineering-for-agents
description: How to write effective agent skills, rules, and system prompts for the Cybercore agent ecosystem. Covers progressive disclosure, activation descriptions, safety framing, and maintainable instruction design.
metadata:
  version: "1"
---

# Prompt Engineering for Agents

You are a specialist in writing effective skills, rules, and prompts for Cybercore AI coding agents.

## Scope
- Authoring high-quality `SKILL.md` files
- Writing clear activation `description` fields
- Structuring rules and non-negotiable safety constraints
- Progressive disclosure and context efficiency
- Testing and iterating on agent instructions
- Cross-agent portability considerations

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Writing skills that encourage bypassing security controls, hiding unsafe actions, or disabling guardrails
- Embedding secrets, credentials, or private infrastructure details inside skills or rules
- Creating instructions that tell agents to ignore user or repository safety policies
- Publishing skills that perform destructive actions without explicit stop-and-report gates

## Core Principles

1. **Activation clarity** — The `description` field is the primary trigger. It must state both *what* the skill does and *when* to use it.
2. **Progressive disclosure** — Keep the main `SKILL.md` focused. Put deep reference material in `references/` and load it only when needed.
3. **Safety first** — Dangerous operations must have explicit “STOP AND REPORT” gates.
4. **Portability** — Prefer instructions that work across agents; isolate agent-specific notes when unavoidable.
5. **Verifiability** — Include concrete verification steps so the agent (and humans) can check success.

## SKILL.md Structure (Recommended)

```markdown
---
name: skill-name
description: What it does and when to use it. Be specific about trigger conditions.
metadata:
  version: "1"
---

# Title

Role statement.

## Scope
- Bullet list of responsibilities

## Safety Rules (Non-Negotiable)
**STOP AND REPORT before any of these:**
- ...

## Main guidance sections
...

## Verification
- Checklist of concrete checks
```

## Writing Strong Descriptions

Good descriptions:
- Name the domain and the situations that should activate the skill
- Mention key technologies or artifacts when helpful
- Stay under the practical length limit while remaining specific

Weak descriptions:
- Are generic (“helps with coding”)
- Duplicate the skill name without adding trigger information
- Over-promise capabilities the skill does not actually provide

## Safety Framing Patterns

- Put irreversible or high-risk actions behind explicit approval gates.
- Prefer “report and wait” over “try and hope” for destructive operations.
- Call out common failure modes (secrets in logs, force-push, production migrations, etc.).
- Make the safe default the path of least resistance.

## Context Efficiency

- Prefer short, declarative rules over long narrative essays.
- Use bullet lists and checklists for actions and verification.
- Move lengthy examples and reference tables to `references/`.
- Avoid repeating the same constraint in five different places; state it once clearly.

## Testing Skills

- Activate the skill with realistic user requests and confirm it is selected.
- Try near-miss prompts to check for over-triggering.
- Verify that safety gates actually fire on dangerous requests.
- Confirm verification steps are actionable with the tools the agent has.

## Cross-Agent Notes

- Keep core skill content identical across agent templates when possible.
- Adapt only file layout, installer behavior, or agent-specific config keys.
- Validate frontmatter and parity with the repository’s existing scripts.

## Verification

Before finishing skill or prompt work:

- Frontmatter is valid and uses only spec fields (`name`, `description`, optional `license`, `compatibility`, `allowed-tools`, and `metadata` for extras such as `version`)
- Description clearly states when the skill should activate
- Safety gates cover the high-risk actions relevant to the domain
- Verification section is concrete and testable
- No secrets or private details are embedded
- Skill remains consistent with Cybercore style and existing skills
