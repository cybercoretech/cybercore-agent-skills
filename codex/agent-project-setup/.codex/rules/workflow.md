# Development Workflow & Execution Standards - Codex rules

prefix_rule(pattern=["cargo", "check"], decision="allow")
prefix_rule(pattern=["cargo", "test"], decision="allow")
prefix_rule(pattern=["cargo", "clippy"], decision="allow")
prefix_rule(pattern=["git", "status"], decision="allow")
prefix_rule(pattern=["git", "log"], decision="allow")
prefix_rule(pattern=["git", "diff"], decision="allow")
