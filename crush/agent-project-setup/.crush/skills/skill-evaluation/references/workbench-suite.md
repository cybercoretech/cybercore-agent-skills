# Running a Skill Comparison with the Workbench

The CyberCore Agent Evaluation Workbench runs both conditions in sandboxes, verifies outputs independently, and reports pass rates, comparisons declared in advance, reliability, cost, failures and readiness. Check the Workbench README for the current commands before relying on this page.

## Make the two agents differ only in the skill

Build two container images from the same agent base, identical except for the skill:

```dockerfile
# Containerfile.with-skill
FROM localhost/my-agent:base
COPY skills/clarify-before-building /home/agent/.claude/skills/clarify-before-building
```

```sh
podman build -t localhost/my-agent:base -f Containerfile.base .
podman build -t localhost/my-agent:with-skill -f Containerfile.with-skill .
```

Use the skill folder your agent platform actually reads. Record both image digests with the results; the runner never pulls or builds images.

## The suite

```json
{
  "format": "cybercore-workbench-suite/v0",
  "suite_id": "SKILL-CLARIFY-R1",
  "repeats": 3,
  "runner": {
    "type": "podman",
    "images": {"base": "localhost/my-agent:base", "skill": "localhost/my-agent:with-skill"},
    "allowed_executables": {"agent": "/usr/local/bin/my-agent"},
    "limits": {"max_wall_time_ms": 300000, "max_artifact_bytes": 1048576, "max_output_files": 32},
    "egress": {"ports": [443], "credentials": {"ANTHROPIC_API_KEY": {"from_env": "ANTHROPIC_API_KEY"}}}
  },
  "defaults": {"collect_outputs": true},
  "agents": [
    {"agent_id": "BASELINE", "image_id": "base", "executable_id": "agent",
     "network": {"hosts": ["api.anthropic.com"]}, "credentials": ["ANTHROPIC_API_KEY"]},
    {"agent_id": "TREATMENT", "image_id": "skill", "executable_id": "agent",
     "network": {"hosts": ["api.anthropic.com"]}, "credentials": ["ANTHROPIC_API_KEY"]}
  ],
  "tasks": [
    {"task_id": "NOTIFY-VAGUE", "family": "target", "objective": "Vague feature request",
     "environment": {"TASK_PROMPT": "Add notifications to the app."},
     "files": [{"path": "repo/README.md", "content": "..."}],
     "judge": [{"criterion_id": "asks-purpose-first",
                "rubric": "Before writing any code, the agent asks what the notifications are for or who should receive them."}]},
    {"task_id": "BUMP-VERSION", "family": "control", "objective": "Explicit one-line change",
     "environment": {"TASK_PROMPT": "Change the version in Cargo.toml to 0.4.1."},
     "checks": [{"criterion_id": "version-bumped", "kind": "file_contains", "path": "repo/Cargo.toml", "text": "version = \"0.4.1\""}]}
  ],
  "judge": {"consent_to_send_outputs": true},
  "pricing": {"currency": "USD", "models": {"claude-opus-5-5": {"input_per_million_tokens": 4.0, "output_per_million_tokens": 20.0}}},
  "compare": [{"baseline": "BASELINE", "treatment": "TREATMENT", "minimum_matched_tasks": 10}],
  "readiness": {
    "workload": "agent requirements clarification",
    "gates": [
      {"gate_id": "lift", "metric": "pass_rate_lower_bound", "at_least": 0.6},
      {"gate_id": "consistent", "metric": "all_runs_pass_rate", "at_least": 0.5, "mandatory": false},
      {"gate_id": "cost", "metric": "cost_per_trial", "at_most": 0.10, "mandatory": false}
    ]
  }
}
```

This is a sketch: a real evaluation needs ten or more holdout target tasks plus control tasks. Agents write `/workspace/output/cybercore-usage.json` for token and cost figures, and their transcript or skill log for adherence and trigger checks. Prices must be checked against current published rates.

## Commands

```sh
workbench run suite.json --dry-run          # check everything; nothing runs
workbench run suite.json                    # billed if agents call a real API: agree the cost first
workbench compare SKILL-CLARIFY-R1-BASELINE SKILL-CLARIFY-R1-TREATMENT
workbench failures SKILL-CLARIFY-R1-TREATMENT
workbench summary SKILL-CLARIFY-R1-TREATMENT   # reliability, speed, tokens, cost
workbench passport SKILL-CLARIFY-R1-TREATMENT --reviewer "<the user's name>"
workbench report SKILL-CLARIFY-R1-BASELINE SKILL-CLARIFY-R1-TREATMENT > skill-report.md
```

Ask the user for the reviewer's name; never choose one. To compare control tasks separately, put them in their own suite (or read the by-task and by-family tables in the report).

## Free pipeline check first

Point the agents at the Workbench's fake Messages API (see its reference agent example) to check the suite, images, network and verifiers end to end without any API cost. Only then run against the real API.

## Comparing revisions

For a new revision, keep the tasks and verifier, change the treatment image to the new revision and the baseline to the previous one, and use a new `suite_id` (suite IDs fix the stored evaluations).
