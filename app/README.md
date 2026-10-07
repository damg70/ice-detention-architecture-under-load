# Architecture Under Load

A static browser app with no build step and no dependencies (three.js
loads from a CDN, only when the person view first opens). It implements
`../architecture_under_load_spec.md`, model version 3. Design history and
open questions live in `../design_notes.md`.

## Run

```bash
cd app && python3 serve.py
```

Open <http://localhost:5173>: the landing page (`index.html`), which leads into
the model (`model.html`). It needs a local server because ES modules
and JSON `fetch` don't load from `file://`. `serve.py` is `http.server`
with caching turned off, so browsers (Safari especially) always load the
latest data and code.

The app has four views in one sliding track:

1. **Grid** (`#`): 13 architectural capacities × 10 lived domains. Set
   baselines, move the duration and population sliders.
2. **Network** (`#network`): capacities and domains as nodes, marked
   cells as edges.
3. **Person** (`#person/<capacity>`): opened from a capacity node. A
   figure on stepped rings inside a half-cell, a 24-hour day cycle and a
   thought bubble.
4. **Equation** (`#equation/<row>:<col>`): opened with "See the math"
   on a selected cell. The model's math for that one tile, worked out
   live; edits there are a sandbox.

`person.html` is the person view on its own, with scenario and capacity
pickers, kept as a test page.

`equation.html` is the equation lab: equation mode for one tile, with a
lab bar for choosing the scenario and tile. Edits there are a sandbox and
never change the scenario or the model.

## Test

```bash
cd app && npm test
```

(or `node --test` from `app/`). The tests cover the §9.4 reference
values, the scenario checks Tests A–E, the unmarked / N/A / provisional
rules, the schema-1 migration, determinism, preset validity, the network
reading, the person scene (rings, mound and pit, lighting from
baselines), and thought-bubble selection.

## The model

Two levels (spec §5.0): 13 capacity rows meeting 10 domain columns in
cells, and two global stressors, duration and population. Each marked
cell has a baseline (0–4) and authored sensitivities; the sliders become
`D` and `P`, which reach every cell unchanged. Per cell:

```
load   = baseDemand + dS·D + pS·P + iS·D·P
demand = 1.15 · (1 − e^(−load))
E      = clamp(0.5 + Q − demand)        Q = baseline / 4
```

There are no form-wide modifiers: capacity elasticity and the
designed-for duration were removed in v3 (how a building copes with
crowding or long stays is read from its cells). Scenarios store raw
hours and load ratios, never model coefficients.

The model layer (`src/model/`) is pure: no DOM, and the same code runs in
the browser and in the tests.

## Where things live

| Change this                                              | Edit |
|----------------------------------------------------------|------|
| Formula (per cell)                                       | `src/model/processCell.js` |
| `D`/`P` curves, demand ceiling, state bands, defaults     | `src/data/model-config.json` |
| Per-cell sensitivities, mechanisms, N/A cells            | `src/data/intersections.json` |
| Rows / columns and their question phrases                | `src/data/rows.json`, `src/data/columns.json` |
| Archetypes, biographies, suggested load                  | `src/data/presets.json` |
| Selected-cell panel                                       | `src/ui/cellInspector.js` |
| Explanation sentences                                    | `src/model/explain.js` |
| Duration and population sliders                          | `src/ui/stressControls.js` |
| Grid                                                     | `src/ui/grid.js` |
| Network reading (nodes, edges, domain status)            | `src/model/network.js` |
| Network drawing, node panel                              | `src/ui/networkView.js`, `src/ui/nodePanel.js` |
| Views, routing, header, scenarios                        | `src/main.js`, `model.html` |
| Landing page (and the summary PDF it links)              | `index.html`, `landing.css`, `docs/` |
| Colors                                                   | `src/ui/colorScale.js` |
| Scenario schema, import/export, storage                  | `src/storage/` |
| Person view: rings, home rings, lighting tables          | `src/data/person-config.json` |
| Person view: ring and figure reading                     | `src/model/personScene.js` |
| Person view: day cycle (`HOUR_SECONDS` = 4)              | `src/model/dayCycle.js` |
| Person view: 3D scene and camera                         | `src/person/scene.js` |
| Person view: day bar, bubble, ring selection (shared)    | `src/person/personMode.js` |
| Person view: standalone page                             | `src/person/main.js`, `person.html`, `person.css` |
| Thought-bubble lines (one, or a list rotating by day) and when each may speak | `src/data/bubble-lines.json` |
| Thought-bubble selection and pacing (`BUBBLE_SECONDS` = 6) | `src/model/bubbles.js` |
| Equation mode (shared) and its lab page                  | `src/equation/equationMode.js`, `src/equation/main.js`, `equation.html`, `equation.css` |

## Not yet built

From the spec: comparison mode (§16), the derived views and failure
frontier (§23), and explicit inter-cell cascades (§11). `processGrid` is
a pure function of `(scenario, metadata)`, so comparison mode can call it
twice. From the design notes: a formula view that explains the math (E,
light-load comparison, sensitivities), per-capacity access scripts and
crowding in the person view.
