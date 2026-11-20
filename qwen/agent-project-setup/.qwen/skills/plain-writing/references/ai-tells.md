# Machine-Writing Patterns and Replacements

None of these words is banned in every context; a database really can be "robust" against crashes when you say against what. The problem is reflexive use where a specific statement belongs.

## Words

| Instead of | Prefer, or say the specific thing |
|---|---|
| delve into | look at, explain, cover |
| leverage, harness, utilize | use |
| facilitate, enable | help, let, allow |
| seamless, seamlessly | say what no longer needs doing ("no restart needed") |
| robust | say what it withstands ("survives a crash mid-write") |
| comprehensive | say what it covers ("all 13 agents") |
| cutting-edge, state-of-the-art, game-changing | drop it, or name the measurable difference |
| unlock, elevate, empower, supercharge | describe the result ("lets you deploy without SSH") |
| landscape, realm, ecosystem, tapestry, journey | name the actual thing ("the Rust crates we publish") |
| pivotal, crucial, vital, essential | only when something truly depends on it; otherwise "important", or nothing |
| a myriad of, a plethora of | many, or the number |
| in order to | to |
| due to the fact that | because |
| at this point in time | now |
| prior to | before |
| commence, initiate | start |
| endeavour | try |
| showcase | show |
| ensure | make sure (or state the check: "the installer checks the hash") |

## Openers and closers to delete

- "In today's fast-paced world…", "In the ever-evolving landscape of…"
- "It's worth noting that…", "It's important to note that…", "Notably,…"
- "Let's dive in", "Let's explore", "Without further ado"
- "In conclusion", "In summary", "To sum up" (when the text is short enough to remember)
- "I hope this helps!", "Feel free to reach out", "Happy coding!"
- "Great question!", "Certainly!", "Absolutely!"

## Constructions

| Pattern | Example | Fix |
|---|---|---|
| Not just X, but Y | "not just a linter, but a complete quality platform" | "a linter that also formats and type-checks" |
| Whether you're A or B | "whether you're a beginner or an expert" | drop it, or name who it is for |
| X isn't merely Y; it's Z | "This isn't merely a tool; it's a philosophy" | delete |
| Padded triplet | "fast, reliable, and scalable" | keep the one you can prove, with the proof |
| Hedging chain | "may potentially help to somewhat reduce" | "reduces" (or "reduced it by 20% in our tests") |
| Empty transition | "With that in mind, let's move on to…" | start the next section |
| Rhetorical question opener | "Ever wondered why builds are slow?" | "Builds are slow because…" |
| Restating summary | a final paragraph repeating the intro | delete |

## Formatting

- Emoji on every heading or bullet: keep them only where the project's style uses them deliberately (for example one icon per table row)
- Bold sprinkled through sentences: bold only the few words a skimmer must not miss
- Headings over short sections: merge sections under a few lines
- Everything as bullets: use prose for reasoning and cause-and-effect, bullets for steps and parallel items
- Long dashes as the default connector: prefer a comma, colon, parentheses or a full stop

## Rhythm

Machine text often uses sentences of the same length and shape, paragraph after paragraph. Vary it: a short sentence lands a point; a longer one carries a qualification. Do not add variety artificially; let it follow the content.
