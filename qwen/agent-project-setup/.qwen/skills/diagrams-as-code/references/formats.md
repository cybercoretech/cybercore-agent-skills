# Formats, Examples and Rendering

## Mermaid

Renders inside Markdown on GitHub and GitLab when fenced as `mermaid`.

**Flowchart** (a decision is a diamond node, not a self-loop)

```mermaid
flowchart LR
    %% Derived from src/upload/routes.rs and src/storage/mod.rs
    browser[Browser] -->|POST /uploads| api[Upload API]
    api --> check{Size and type allowed?}
    check -->|no| reject[400 with reason]
    check -->|yes| bucket[(Object storage)]
    bucket -->|object key| db[(Database: upload record)]
```

**Sequence**

```mermaid
sequenceDiagram
    participant U as User
    participant A as API
    participant Q as Queue
    participant W as Worker
    U->>A: POST /exports
    A->>Q: enqueue export job
    A-->>U: 202 Accepted (job ID)
    Q->>W: deliver job
    W->>W: build CSV
    W-->>U: email with download link
```

**State**

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: submit
    Submitted --> Approved: approve
    Submitted --> Draft: request changes
    Approved --> [*]
```

**Entity relationship**

```mermaid
erDiagram
    CUSTOMER ||--o{ INVOICE : receives
    INVOICE ||--|{ LINE_ITEM : contains
    CUSTOMER {
        string id
        string email
    }
    INVOICE {
        string id
        date issued_on
        string status
    }
```

Render locally to check layout (no online service needed for confidential diagrams):

```sh
npx -p @mermaid-js/mermaid-cli mmdc -i diagram.mmd -o diagram.svg
```

The CLI drives a headless browser; if it cannot download one, point it at an installed Chromium with a Puppeteer configuration file (`-p puppeteer.json`).

## Graphviz DOT

Strong automatic layout for larger graphs, such as generated dependency graphs.

```dot
digraph deps {
    // Generated from Cargo.toml workspace members
    rankdir=LR;
    node [shape=box, fontname="Helvetica"];
    edge [fontname="Helvetica", fontsize=10];

    cli   [label="workbench-cli"];
    store [label="evaluation-store"];
    core  [label="evaluation-core"];
    judge [label="evaluation-judge"];

    cli   -> store [label="records runs"];
    cli   -> judge [label="verifies"];
    store -> core  [label="uses types"];
    judge -> core  [label="uses types"];
}
```

```sh
dot -Tsvg deps.dot -o deps.svg
dot -Tpng -Gdpi=150 deps.dot -o deps.png
```

Generate DOT from real data where possible (package manifests, import graphs, database schemas) instead of writing it by hand.

## D2 and PlantUML

Use them when the project already does. Render with their own tools (`d2 input.d2 output.svg`, `plantuml -tsvg input.puml`) and commit the source files.

## Hand-written SVG

For branded website figures:

- set `viewBox` and let the figure scale; no fixed pixel width
- include `<title>` and `<desc>` as the first children, and `role="img"` with `aria-labelledby` pointing at them
- use `currentColor` or CSS custom properties so it follows light and dark themes
- keep text as real `<text>`, not paths, so it stays searchable and selectable

## Checking the render

- Open the SVG or PNG and look: crossings, overlapping labels, clipped text
- Check light and dark themes (GitHub renders Mermaid in the viewer's theme)
- Read it in the intended direction; if your eye jumps around, simplify or split it
