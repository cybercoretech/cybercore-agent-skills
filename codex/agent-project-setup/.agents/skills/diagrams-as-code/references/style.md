# Diagram Style

## Content

- One question per diagram; a title that states it ("How an upload reaches storage")
- About 15 nodes at most; group the rest into one box or a separate diagram
- Short labels in plain words; full names in the description if needed
- Label every edge with a verb or the data that moves ("publishes OrderPlaced", "reads config")
- Show only the level of detail the question needs: containers for architecture, functions only when the question is about code flow

## Layout

- One main direction of flow (left to right for pipelines, top to bottom for hierarchies)
- Inputs on one side, outputs on the other
- Avoid crossing edges; reorder nodes or split the diagram
- Related nodes grouped in a subgraph or container with a label

## Shapes and colour

- Use shapes consistently: rectangles for services, cylinders for data stores, rounded shapes for people or external actors
- Colour as a secondary cue only, always paired with a shape, label or legend
- Keep the renderer's default theme unless the project has its own; default themes handle light and dark viewers better than fixed colours
- If colours are custom, check contrast in both themes

## Accessibility

- Title and a two-to-three sentence text description next to the diagram
- For complex diagrams, a list or table of the same relationships in the text
- Do not rely on colour to convey meaning
- Real text (not text rendered into an image) wherever the format allows

## Truthfulness

- Every element traceable to code, configuration or a stated source
- Assumed or planned parts drawn differently (dashed lines) and marked "planned" or "assumed"
- Remove elements that no longer exist; a stale box misleads more than a missing one

## Where to keep sources

| Diagram for | Keep the source in |
|---|---|
| A README or doc page | Inline as a Mermaid block in the same file |
| An architecture decision record | Inline in the ADR |
| Several pages | `docs/diagrams/<name>.mmd` or `.dot`, rendered to SVG in CI |
| A website | The site's assets folder, as SVG source |
