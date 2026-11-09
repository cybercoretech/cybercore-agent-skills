# Strict Safety & System Constraints - Codex rules

prefix_rule(pattern=["git", "reset", "--hard"], decision="deny")
prefix_rule(pattern=["git", "clean", "-fd"], decision="deny")
prefix_rule(pattern=["git", "push", "--force"], decision="deny")
prefix_rule(pattern=["rm", "-rf"], decision="deny")
prefix_rule(pattern=["sudo"], decision="deny")
prefix_rule(pattern=["pacman", "-S"], decision="deny")
prefix_rule(pattern=["cargo", "install", "--global"], decision="deny")
