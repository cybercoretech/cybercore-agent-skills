---
name: diagrams-as-code
description: Draw architecture, flow, sequence, state, data-model and dependency diagrams as text (Mermaid, Graphviz DOT, D2, PlantUML or hand-written SVG) that lives next to the code, renders in documentation, and stays accurate. Chooses the format for where the diagram will be read, keeps each diagram focused on one question, derives it from the actual code or system rather than memory, renders it to check layout, and adds a text description for accessibility. Use when documenting a system or decision, explaining a flow in a README, pull request or ADR, mapping dependencies, modelling states or database tables, or when asked to "draw", "diagram", "visualise" or "map" how something works.
metadata:
  version: "1"
---

# Diagrams as Code

You make diagrams that help a reader understand a system in less time than reading the code, and that stay correct because they are text kept next to what they describe. A wrong diagram is worse than none: readers trust pictures.

## Scope

- Choosing the diagram type and the text format
- Deriving diagram content from the real code, configuration or system
- Writing Mermaid, Graphviz DOT, D2, PlantUML or SVG source
- Rendering and checking layout, in light and dark themes
- Accessible diagrams: titles, descriptions and colour use
- Keeping diagrams in sync as the system changes

Writing the surrounding documentation is `documentation-and-adrs`; understanding a large codebase before drawing it is `codebase-intelligence`.

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Putting secrets, internal hostnames, IP addresses, credentials or customer data into diagrams destined for public repositories or documents
- Publishing a diagram of security-sensitive architecture (network zones, authentication internals, data stores holding personal data) outside the audience the user approved
- Pasting diagram source or architecture details into online rendering services when the content is confidential; render locally
- Presenting a guessed architecture as fact: anything not verified in code or configuration is marked as assumed

## Choose the diagram

| Question the reader has | Diagram |
|---|---|
| What are the parts and how do they connect? | Architecture or context diagram (C4 context or container level) |
| What happens, step by step, between components? | Sequence diagram |
| What decisions does a process take? | Flowchart |
| What states can this thing be in, and what moves it? | State diagram |
| How is the data structured? | Entity-relationship diagram |
| What depends on what? | Dependency graph |
| When does what happen? | Timeline or Gantt chart |

One diagram answers one question. If you are tempted to show everything, draw two diagrams.

## Choose the format

| Format | Best for | Notes |
|---|---|---|
| **Mermaid** | Markdown docs, READMEs, PRs, ADRs on GitHub and GitLab | Renders natively in those viewers; flowchart, sequence, state, ER, class, Gantt, timeline and more |
| **Graphviz DOT** | Large generated graphs (dependencies, call graphs) | Strong automatic layout; render to SVG with `dot` |
| **D2** | Architecture diagrams with containers and icons | Needs the `d2` tool to render |
| **PlantUML** | Teams already using UML tooling | Needs Java or a local server |
| **Hand-written SVG** | Branded figures for websites | Full control, more effort; keep it accessible |

Prefer what the project already uses. For documentation read on GitHub, Mermaid is usually the right default because it needs no build step.

## Workflow

1. **Name the question and the reader.** "How does an upload get from the browser to storage, for a new backend engineer."
2. **Gather facts from the source.** Read the code, configuration, routes, schemas and infrastructure files. Note the file each element comes from. Mark anything you could not verify as assumed.
3. **Pick the type, format and level of detail.** Leave out what does not help answer the question.
4. **Write the source** following `references/style.md`: a few nodes (about 15 at most), labelled edges with verbs, one direction of flow, consistent shapes, short labels.
5. **Render it and look at it** (`references/formats.md`). Check crossings, cramped labels, unreadable colours in light and dark themes, and that it reads in the direction you intended.
6. **Add a title and a text description** (what the diagram shows, in two or three sentences) next to it, so readers who cannot see it, and search, get the same information.
7. **Keep the source next to what it describes** (in the README, ADR or a `docs/diagrams/` folder), and commit the source, not only an exported image. Generate images from source in CI if images are needed.
8. **Report** what it shows, what was left out, what was assumed, and where the source lives.

## Keeping diagrams accurate

- Cite the files a diagram was derived from in a comment inside its source.
- Update diagrams in the same pull request as the change they describe.
- Generate diagrams that can be derived mechanically (dependency graphs, database schemas) from the code instead of drawing them by hand.
- Date or version diagrams of systems that change often.

## Common failure modes

| Failure | Better |
|---|---|
| One diagram of the whole system with forty boxes | Several focused diagrams, one question each |
| Unlabelled arrows | Verbs on edges ("publishes", "reads from") |
| Drawn from memory, not the code | Derive from source; mark assumptions |
| Colour as the only way to tell things apart | Shapes, labels or a legend too |
| Text that disappears in dark mode | Theme-aware colours, or the renderer's defaults |
| Only a PNG committed | Commit the source; render images from it |
| Internal hostnames in a public README | Generic names, or keep the diagram internal |

## Verification

- [ ] The diagram answers one stated question for a stated reader
- [ ] Every element was verified in code or configuration, or is marked assumed
- [ ] It was rendered and inspected; labels are readable in light and dark themes
- [ ] Edges are labelled, flow has one main direction, and node count stays small
- [ ] A title and a short text description accompany it
- [ ] The source is committed next to what it describes
- [ ] No secrets, internal addresses or confidential data in diagrams for public places
