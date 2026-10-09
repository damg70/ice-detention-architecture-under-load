# Design notes: visual representations beyond the grid

Ideas explored, decided and built, with dates. These are working notes,
not spec. The grid, network and person views are all built now; the
person view's current state is in the last section.

## Bookmarked: per-cell vignettes (2026-10-01)

Clicking a cell shows a small, layout-ish cluster of 2D shapes for that
one relationship. It is not a floorplan and not a depiction of any
facility. The aim is to raise a report or article to an imaginative
level, not to produce documentary images.

- **Composition.** The row draws a *spatial device* (wet-core = fixtures
  and screens; granularity = how a volume is divided; daylight = an
  opening and its depth; circulation = a path and its thresholds). The
  column draws a *human scene* (hygiene = people at and waiting for
  fixtures; sleep = horizontal bodies and gaps). That is 13 + 10
  generators instead of 130 drawings.
- **Channels.** Baseline sets the device configuration, which is fixed
  under load. Population sets the count of figures (Isotype-style
  counting, not portraiture). Duration sets what accumulates (belongings,
  mats, worn paths). Processed E tints only *where strain gathers*.
- **Phase space.** A 3×3 sheet of vignettes for one cell (duration ×
  population) is a pictorial version of the spec's §23 failure frontier.
- **Rules.** Stable slot placement (figure *k* is always at slot *k*),
  with no randomness. Strain is shown spatially (crowding, distance,
  queues, missing partitions), never as depicted distress, and there are
  no faces. Unmarked cells draw the device in dashed outline with no
  scene. Supportive states must not look pleasant or inviting, only less
  crowded.
- **Open.** Deterministic captions ("Seventeen people, three fixtures,
  one screen. The second month."). Temporal orientation may need its own
  device (a strip of days). Placement: the top of the inspector.
- **First slice if built.** The wet-core and horizontal-space devices
  plus the hygiene and sleep scenes.

## The cognitive path (user-defined, 2026-10-01)

1. **Grid.** The user loads an archetype and moves the duration and
   population sliders to watch the cells change.
2. **Network.** Revealed through an interface still to be decided. It
   displaces the grid or pushes it aside, like a slideshow. (Built
   2026-10-01 as a Grid | Network switch that slides one track.)
3. **Person.** The user opens a node in the network and gets a view that
   drives home what the architecture and its load are doing to one
   person. (Built 2026-10-05: a capacity node opens it, as the third view
   in the same track.)

Each step trades precision for immediacy: the grid is exact, the network
is structural, the person is felt.

## Network view (step 2)

**Built 2026-10-01.** `src/model/network.js` and `src/ui/networkView.js`.
Capacities are on the left and domains on the right, in grid order. The
Grid | Network switch slides one track; the sliders stay live in both
views; the view is kept in the URL (`#network`). Domain status is
'supported', 'last-support', 'unsupported', or 'none' (no edges
asserted). Supportive means E ≥ 0.6. Capacity nodes have an `onOpenNode`
hook, unused until the person view exists. (Since 2026-10-05 it opens the
person view; see "Integration" below.)

**Structure.** A two-sided graph.

- **Nodes:** the 13 architectural capacities on one side and the 10
  lived domains on the other.
- **Edges:** one per *marked* cell. Unmarked and N/A cells have no edge,
  so "unmarked ≠ zero" holds naturally, and a blank model is an empty
  network.
- **Edge thickness = baseline** (architecture, fixed). **Edge color =
  processed E** (live). Dashed = provisional coefficients.

**What it shows that the grid doesn't.** The grid answers "how is this
relationship doing?" The network answers "does this lived domain still
have any supportive path left?"

- **Redundancy.** Sleep has many incoming edges; temporal orientation
  has two (daylight, exterior permeability), so it is structurally
  fragile even when both are green.
- **Loss of the last support.** As load rises, a domain's incoming
  edges turn red one by one until no supportive edge remains.
- **Heavy edges going red.** Strong architecture being overwhelmed is
  the finding; weak edges failing is expected.
- **Hubs.** Capacities connected to many domains (spatial granularity,
  acoustic refuge) are where one decision spreads furthest.

**The three model levels in the network.**

- Capacities and domains are nodes; cells are edges.
- Global stressors (duration, population) are *not* nodes, because
  their sensitivities are per edge. They act as an ambient field: the
  whole network responds to the sliders at once.
- There are no form-wide modifiers (removed 2026-10-05, model v3; see
  "Form modifiers removed" below).

**Rules.**

- **Fixed node positions.** Use two columns, ordered once in config to
  reduce edge crossings. No force-directed layout: it reshuffles on
  every edit and breaks cause and effect. Only edge color changes under
  load.
- **No domain scores.** Never color a domain node by its average
  incoming state. If a node shows its edges at all, show the
  distribution (e.g. a ring with one segment per incoming edge), not a
  verdict.

**Future: cascades.** The spec's §11 cascades become authored
edge-to-edge dependencies ("when wet-core × hygiene falls below 0.4, it
adds load to wet-core × safety"). The network is their natural home,
in a later model version (version 3 went instead to removing the form
modifiers, 2026-10-05).

## Person view (step 3): how it evolved

### Ring taxonomy (agreed)

Concentric rings around one abstracted person form an expanding set of
nested agencies and affordances: **body · reach · room · building ·
world.** Rings are scales of distance, not scores. Architecture
controls the distance at which a need is met: a toilet in the cell
versus down a corridor behind a locked door.

### Rejected along the way

- **Many resource icons around the person** (bed, toilet, clinic,
  phone, yard…). Too much at once.
- **A cell-driven profile.** Wrong entry point: step 3 is opened from a
  *node*, not a cell.
- **A time dial or day ticks.** Duration is inherited from system state,
  through E.
- **Arcs on rings as the final visual** (each edge → one arc, stroke
  weight = baseline, color = E). Correct as a mapping, but still a
  diagram. It is "translated once"; the scene needs translating again.

### The mapping layer (kept as hidden structure)

> The home-ring table below is live (`person-config.json`). The "one edge
> → one visual element" rule now applies to the thought bubble, not to
> the rings; rings show each ring's average (user decision, 2026-10-02).

**Opening a node shows its ego-network wrapped around the person.**

- **Each capacity has one home ring:**
  - body: horizontal space
  - reach: wet-core, acoustic refuge
  - room: spatial granularity, sensory compartmentalization,
    climate/HVAC
  - building: functional adjacency, circulation autonomy, spatial
    differentiation
  - world: daylight, exterior permeability, territorial connectivity,
    inspectability
- **A domain node** spreads its incoming edges *across* rings (it reads
  radially: at which scale does this need fail?).
- **A capacity node** puts all its outgoing edges on its *one* home
  ring, divided into domain sectors (it reads circumferentially: what
  does this feature reach?).
- **Fixed sectors** per row and column, with faint empty slots for
  unmarked edges, so nothing shifts when other cells are marked or
  sliders move.
- **One edge drives exactly one visual element.** Nothing averages
  edges. Example: medical access = functional adjacency (the clinic is
  close) + circulation (getting there needs staff). These become two
  separate elements: "the clinic is fine; reaching it isn't."
- **Crowding is the only ambient layer** (the body and reach fills,
  inherited from system state).

### The scene: translating again (2026-10-01 direction)

> **Superseded in part.** See "Person view (integrated)" at the end of this
> file for what is built and decided now. Texture is off for now; posture
> was dropped; rings are averaged per ring rather than one element per
> edge, with the per-edge detail moving to the thought bubble. Lighting
> comes from baselines, not E. The camera is fixed (no orbiting, no
> top-down view), and the day runs 4 s per hour (a 96-second day),
> starting at midnight, playing, on every opening.

The third view should be immediately legible as a person in relative
comfort or despair. Four channels:

1. **Texture.** Four procedural materials applied to ring plates, keyed
   to the state of the edge(s) at that ring:
   - soft (supportive or resilient)
   - worn (mixed)
   - hard (substantial strain)
   - degraded (severe)

   Contradictions stay visible: a soft bed in a hard room.
2. **Light, literal rather than mood.** A compressed day loop (e.g. 24 s
   = 24 h), driven by specific edges:
   - daylight strained → fluorescent all day (flat, cold, shadowless,
     constant)
   - daylight supportive → a shifting day with a warm "sun" spotlight
     crossing through an aperture
   - exterior permeability × movement → a recreation interlude where
     the scene becomes open sky, then cuts back to fluorescent; its
     share of the loop follows the edge
   - sensory/acoustic × sleep at night → lights go down (supportive) or
     stay on / spill in (strained)

   Lighting must never be driven by an aggregate state, which would be
   the forbidden facility verdict delivered as atmosphere. The user owns
   the scrubber (play, pause, drag); there are no camera moves that
   dramatize.
3. **Scale.** Crowding compresses the reach ring (personal space is
   occupation, not architecture, so it may move). Other figures press
   in from the room edge as population rises.
4. **Posture.** Driven by the network reading "does this domain still
   have a supportive path left?": the count and weight of the
   still-supportive edges, not an average. While one strong support
   remains, the person can rest; as supports fall away the posture
   closes, ending curled and compressed.

**Guardrails.**

- The figure is a neutral mannequin: one uniform material, no face, no
  age, gender or race, no gestures of pain.
- Postures come from a small fixed vocabulary of resting positions
  (lying, seated, upright, curled).
- A supportive scene must not look pleasant or inviting, only quieter
  and less compressed.

**3D.** three.js with OrbitControls. The default view is an orthographic
top-down camera matching the flat ring reading; tilting reveals the
scene. Ring plates carry the materials, and rims can rise as boundaries.
Procedural canvas textures keep it deterministic with no asset pipeline.

**First scene to build: the Sleep domain node.** It has the most
incoming edges, the night portion of the loop matters most, and lying
versus curled is the clearest posture contrast.

**Open questions:** four or five textures (leaning four); whether
opening a node starts the loop or opens paused (leaning: paused at
night for sleep).

## Person view: decisions, 2026-10-01 (supersede the above where they conflict)

**Scenes belong to capacity nodes only (decided).** An opened capacity
node's scene expresses only that node's edges. In the purpose-built
archetype, wet-core has two edges, so its scene is about hygiene and
safety and nothing else. Domain nodes stay analytic: in the network,
selecting one highlights its incoming edges and shows their
distribution, but it does not open a scene.

**Stage.** The distance rings stay **body → world** in every scene.
They are not redefined per domain.

**Global lighting, constant across all scenes.** The day loop's light
reads from the daylight and exterior-permeability edges (sun versus
constant fluorescent; the outdoor interlude) whichever node is open. It
is driven by those specific edges, never by an aggregate. If those edges
are unmarked, the light is neutral (no assertion). (Refined 2026-10-03:
lighting reads those cells' *baselines*, not their E, so it never moves
with the load sliders. See "Lighting" below.)

**The day loop shows access over time.** Each capacity has an authored
**access script** in config, a deterministic function of loop time and
its edges' E (not built yet, except the global lighting and the outdoor
interlude; still open):

| Capacity | What the day loop varies |
|---|---|
| Wet-core | Whether the fixture can be reached |
| Horizontal space | When and where lying down is allowed |
| Daylight | Light itself (also the global lighting) |
| Exterior permeability | The outdoor interlude and how short it is |
| Acoustic refuge | Noise across day and night; whether quiet is reachable |
| Circulation autonomy | Door states: open hours versus locked |
| Spatial granularity | How many others share the space at each hour |
| (remaining rows) | To author |

Scripts are representational conventions, not claims about real
schedules. Flag them in config as design hypotheses, like the
coefficients.

**No queues or menacing figures.** Crowding, contested fixtures and
conflict exposure go into the **thought bubble**, not into rendered
crowds.

**The thought bubble holds needs, not moods.** It shows the node's
domain icons in their live states, plus short **narrative snippets**
that speak to the need ("I haven't been able to lie down…", "It's
freezing in here…", "When will I be able to call my family?", "It's so
loud in here…"). Snippets are chosen deterministically from an authored
library keyed by (capacity, domain, state band, loop phase). The model
computes support against demand, not psychology, so the bubble never
claims an emotion; preoccupation with an unmet need carries the
psychological reading.

- Snippets are plain, neutral statements of a condition ("It's freezing in
  here"), in the register of the examples above.

**The mannequin.** Colored with the cells' state palette, which also
avoids accidental racialization. Proposed rule (since built): color by the opened
node's *least-supported* edge (needs are non-compensatory), not an
average. The bubble still shows each edge separately. **Reference: the
Waldorf doll:** a blank face and simplified limbs, leaving maximum room
for the viewer's imaginative projection.

**Posture dropped** in favor of mannequin color plus the bubble (less
modeling effort, more legible).

**Gap noted: age and gender.** The model currently takes no account of
age, gender, family status, disability or medical need. This links to
the "population profile" future stressor (spec §5.0). The blank
mannequin keeps the figure open to projection, but the *model* treats
everyone identically, and that should be stated wherever the person
view appears.

## To-dos and open discussions

- **Review the 28 new archetype baselines** (`baseline_review.md`) once the
  person view is running. They were applied as proposed on 2026-10-01 so
  the network could show the new edges.
- **Cell editing as its own mode.** Tweaking individual cells may need a
  distinct editing mode rather than happening inline while exploring
  load. Discuss before changing anything. Part of the same discussion:
  the **baseline support** mini-editor (in the cell inspector) is still
  ambiguous to use: it isn't obvious what it changes, when, or how it
  relates to the sliders. (The look-alike capacity elasticity control,
  which compounded the confusion, is gone.) The **scenario note** panel is
  hidden until then; its code and storage are intact. **Update
  (2026-10-06 review):** a separate mode looks unnecessary for now. The
  Selected cell panel serves both builders (the baseline control) and
  readers (question, support against demand, explanation), and with the
  removals below it sorts itself out. The scenario note stays hidden.
- **Archetype title once cells are customized (decided 2026-10-05).**
  The first cell change makes the form **Custom**: the
  archetype picker reads "Custom", and a title still carrying the
  archetype's name becomes "Custom (<archetype>)". An untouched archetype's title
  is read-only; once custom (or blank, or already renamed) it is editable
  in place, with a dashed underline as the cue. Load sliders don't count
  as edits. Reset returns a "Custom (<archetype>)" title to the archetype's
  name. The "edited" tag is gone.
- **Selected cell panel, after review (2026-10-06).** From the user's
  comments on a section-by-section review page:
  - **Removed:** the current-state line (swatch, state name, "E … at …";
    the grid tile already shows the state, and E means nothing without the
    math), the minimal-load comparison, and the sensitivity metadata with
    its "provisional" line. Unmarked cells show only the question and the
    baseline control.
  - **Changed:** support against demand gains a one-line reading above
    the bars ("What the architecture supplies (from the baseline) and what
    the current duration × population load asks of it."); where the load
    comes from keeps the bar and legend, without numbers; unmarked copy is
    "Unmarked — no baseline has been set."; the empty state is one line.
  - **Moved (grid view only):** the shortcuts into the hint line under the
    grid, and the legend under that, so the side column is only the
    selected cell. The network and person views keep the legend in the
    column.
  - **Kept:** cell name, question, baseline control ("user-authored" and
    the label are fine), the written explanation, the cell note.
  - **Open:** where support against demand sits, now that the state and
    minimal-load lines are gone.
  - **Resolved (2026-10-06):** the explanation's last sentence no longer
    says "minimal load"; it reads "With only a few people here for a
    couple of hours, this cell would read "…". The architecture is the
    same; only the demand on it has changed."
- **Principle: overcrowding stands in for understaffing (2026-10-06).**
  Staffing and operations are deliberately not modeled; the tool reads
  what the architecture provides. Overcrowding beyond design capacity is
  the honest proxy: the same kitchen, rooms and staff serving more people
  than they were built for. Lines and mechanisms may describe that strain
  (late meals, sack lunches) as long as the cause is capacity meeting
  load.
- **Equation mode (lab built 2026-10-06, `app/equation.html`).** Formerly
  "formula mode". The math for one tile in five steps: 0 baseline (the
  question, the 0–4 scale, ending in the tile), 1 support, 2 load,
  3 demand, 4 margin. Each step: a title with a short definition, the
  equation in words on a chalkboard band, then the worked equation large,
  then a short paragraph. Amber = this tile's numbers (baseline, four
  sensitivities); blue = model-wide constants (ceiling 1.15, midpoint
  0.5); white dotted = slider pressures D and P. Every element of a
  worked equation has a pop-up (what it is; whether it is editable and
  why); operators and the chalkboard lines have none. The chalkboard graph
  (demand curve, support line, this tile's point, shortfall or headroom)
  sits in the right column. Everything is live: baseline, amber and blue
  numbers, and the header sliders recompute every step, the tile and the
  graph. Edits are a sandbox with a reset; nothing is saved, and each
  opening starts from the model's values. No moving to other tiles from
  inside equation mode. In the load step the four sensitivities light their
  definition in a key (chalkboard) instead of a pop-up; the key's
  definitions are universal, the same for all 52 tiles.
  **Integrated 2026-10-06:** "See the math" in the Selected cell panel opens
  it as the fourth view in the track (`#equation/<row>:<col>`), with the
  graph in the side column and the legend hidden. An Equation tab appears
  once used (opens the selected cell, else the last one). Grid, Network,
  Escape or browser Back leave it; focus returns to the cell. Touch: a tap
  opens a pop-up, which stays until the next tap elsewhere. Open: whether a
  baseline changed here should write back to the scenario.
  **Saving (decided 2026-10-06).** Leaving equation mode saves its edits to
  the scenario. The tile's baseline and own sensitivities are saved without
  asking (stored as `cell.meta`, like a baseline set in the grid). A change
  to a model-wide constant (ceiling, midpoint) affects every tile in the
  scenario, so leaving asks first: Apply to all tiles / Discard this change
  / Stay in equation mode (Escape = Stay). Applied constants are kept with
  that scenario only (`scenario.model`), exported with it, and leave the
  authored model and other scenarios untouched. Any saved adjustment makes
  the scenario Custom. Reset in equation mode returns the model's numbers to
  their authored values. A reload keeps tile edits and drops an unconfirmed
  model change. The grid, network, person view and Selected cell panel all
  use the scenario's adjustments (`modelConfig`, `cellMeta` in
  `processGrid.js`). Lab-only: `processCell` accepts `config.midpoint`
  (default 0.5) so the midpoint can be tried.
- **Sticky stress band (2026-10-05).** Once the title bar scrolls away,
  the duration and population sliders and the color ramp stick to the top
  and the workspace scrolls beneath them. Only on windows at least 761 px
  wide and 640 px tall; on smaller screens the stacked band would cover
  most of the view.
- **Wording: "architecture", not "form", in the Selected cell panel
  (2026-10-05).** The only instance was spatial granularity's question
  phrase in `rows.json`. "Form" remains elsewhere ("Untitled Form", the
  scenario-note placeholder).
- **Form modifiers removed (decided 2026-10-05, model v3).** The Form
  modifiers panel is gone, with both of its controls:
  - **Designed-for duration** never entered the calculation; it only
    drove the "% of design duration" text and a ▼ mark on the duration
    slider. What a form was designed for emerges from how its baselines
    are set. Removed from the UI, presets and saved scenarios.
  - **Capacity elasticity** scaled population stress between 100% and
    200% of capacity for every cell. It was a "global temperature"
    shortcut for what the per-cell baselines already say more precisely:
    how a form absorbs crowding should emerge from its cells (spatial
    granularity, horizontal space, …). P now reaches every cell
    unmodified; results equal v2 with elasticity unmarked. Archetypes
    that had elasticity set read differently between 100% and 200% load.
  The model now has two levels, capacities and stressors. Saved
  scenarios and imports simply drop the old `form` field.
- **Help and tooltips.** The archetype biographies (in `presets.json`)
  and the removed explanatory copy are kept for a future help or tooltip
  system.

## Person view (integrated, current state 2026-10-06)

Begun 2026-10-02 as a standalone prototype; integrated into the main app
on 2026-10-05 (see "Integration" below). In the main app it opens from a
capacity node in the Network. The standalone `app/person.html`, served by
`serve.py` at <http://localhost:5173/person.html>, remains as a test
page: it reads the real model data, the archetypes, and scenarios saved
by the main app (read-only), and offers a scenario picker, a capacity
picker, and the duration and population sliders.

The lighting lab that seeded the fluorescent color model is at
`~/Documents/Projects/lighting-3js` (served on :8080 when running). It
was a starting point only, not a guide: the person view is a hybrid of
model and data visualization, not a documentary cell.

### What it shows

- **The opened capacity picks the domains.** Every edge into those
  domains, from any capacity, sits on its capacity's home ring
  (`person-config.json → homeRing`).
- **Rings: one unbroken band each.** Color and height both come from the
  **average** E of the ring's edges (user decision, 2026-10-02;
  step = (average − 0.5) × `stepHeight`). Steps stack from the world ring
  inward: supportive states build a stepped mound with the mannequin on
  top, strained ones a pit with the mannequin at the bottom. Rings with
  no edges stay flat and translucent (no assertion).
- **Flat color, no textures (for now).** The four procedural materials
  (soft / worn / hard / degraded) are still in `scene.js` behind
  `USE_TEXTURES = false`.
- **White rim:** marks the opened capacity's home ring, since every ring
  mixes edges from several capacities.
- **Ring sizes (2026-10-04):** body 0–0.275, reach 0.275–0.45, room
  0.45–0.569, building 0.569–0.706, world 0.706–0.869. The room, building
  and world widths have been halved three times, the reach width twice.
  No floor or ground tiles.
- **Mannequin:** a blank face and simplified limbs (the Waldorf doll),
  colored by the opened capacity's *least-supported* edge. It is now
  large relative to the rings (about 1.2 tall); its scale is one number.

### The half-cell (symbolic)

- A **half-cylinder wall** with the radius of the outermost ring plus
  0.0225 (now 0.891). It is derived from `person-config.json` radii, so it
  follows future ring changes,
  on the far side from the opening camera, so the window sits behind the
  mannequin as first seen. The wall reaches down to the ring base, mound
  or pit.
- A **half-lid ceiling** (2026-10-05): a solid slab over the back half only,
  as thick as the wall and cut on the same section line, like an
  architectural section model. It replaced the full-circle ceiling, which
  was visible only from below and vanished from the raised camera, leaving
  the tubes floating. Its height is 1.867 (lowered by a third, 2026-10-04). It rises only when a
  high mound would push the mannequin's head through it (ceiling = max(1.867,
  body top + 1.23 + 0.2 headroom)), so supportive scenes lift both floor and
  headroom. The ceiling tubes ride with it.
- **Ring step height** scaled by the same 2/3 (`stepHeight` 0.7 → 0.467),
  so mound and pit stay in proportion with the lower cell.
- **Camera: fixed (2026-10-05).** No orbit: the user owns the clock, not
  the camera. The view is frontal into the open half-cell, raised 20°, with
  a 28° lens (reads as a vitrine or diorama), and **half-follows** the
  mannequin vertically (`rig.follow = 0.5` in `scene.js`): height still
  reads between mound and pit, and nothing crops. The distance fits the
  screen's aspect. The comparison sheet is `camera_options.png`.
- **Wall thickness:** 0.06 (2026-10-05). The wall is a solid slab with closed
  ends, a top edge and a window reveal; the bars sit mid-thickness.
- **Color:** near-white institutional paint, `#dedcd6` (changed from dark
  gray on 2026-10-03 so the light reads as fluorescent).
- **Window:** cut into the wall behind the mannequin; its kind comes from
  the daylight baseline (see Lighting). Widths scale with the wall (×0.68
  on 2026-10-04) so each keeps its share of the wall; heights are fixed.
  Heights scaled by 2/3 with the wall (2026-10-04); vertical position stays
  a fraction of the ceiling height. The barred window is 0.422 × 0.307 at
  3/4 height with five bars; the slit is 0.109 × 0.333, at 0.85, with one
  bar; the large window is 0.612 × 0.413 with seven bars. Bar radius is 0.02. The ceiling tubes' length and
  spacing are derived from the cell radius.
- **The cell disappears during the outdoor interlude**: the person has
  left it.

### Lighting (global, the same for every capacity)

**Rule (2026-10-03): lighting shows what the facility *provides*, which
comes from baselines; what it *means* to the person (E) is shown by the
rings, mannequin and bubble.** Lighting never changes when the load
sliders move, which keeps the central demonstration intact.

This replaced an E-driven version, in which a short stay produced high E
because little was demanded. That gave the windowless short-term holding
room 1.25 hours of yard time at 8 hours, gave long stays the least yard
time, and changed the lights-out policy with length of stay.

| Driver (baseline) | 0 | 1 | 2 | 3 | 4 | Unmarked |
|---|---|---|---|---|---|---|
| **Window** (daylight × temporal) | no window, solid wall | high slit | barred window | barred window | larger window | dashed outline, admits nothing |
| **Sun strength** | 0 | 0.35 | 0.7 | 0.8 | 1 | 0 |
| **Yard** (exterior × movement) | never outside | 1 h | 2 h | 3 h | 4 h | no interlude |
| **Night** (sensory compartmentalization × sleep) | lit all night | lit all night | dimmed night setting | lights out | lights out | dimmed night setting |

All of these values live in `person-config.json → lighting`.

By archetype:
- **Short-term holding:** windowless, never outside, lit all night.
- **County jail, converted prison, soft-sided camp:** a slit.
- **Converted warehouse:** windowless, 1 h of yard, lit all night.
- **Purpose-built:** the barred window.
- **Family campus:** the barred window, 3 h of yard, lights out.

- **Fluorescents under the half-lid**, parallel to the section line (so none
  sit in the open): three tubes as soft area lights, plus
  one small shadow-casting point. 4100 K plus a green tint, from the lab.
  Below the lights-out threshold the tubes go fully dark (no glow) and
  read as unlit fixtures; a dim, cool night ambient remains.
- **Flicker (2026-10-03):** a mains buzz plus an occasional slow
  "breathing" dip, ported from the lighting lab but deterministic. It
  uses seeded value noise of elapsed time and a fixed phase per tube, not
  `Math.random()`. The tubes flicker independently. It applies only
  while the tubes are on, so lights out stays dark. The amount is
  `FLICKER = 0.15` in `scene.js`, in code only.
- **Faulty tube (2026-10-03; the middle of three since 2026-10-04):** it
  stutters on and off in bursts, all
  the time, ported from the lab. It is **deliberately random** (user
  decision): texture, not data, and the one non-deterministic element in
  the view. Like the flicker, it applies only while the tubes are on. The
  lab's warm-up strike was not ported.
- **Sun through the window:** a spot outside the cell aimed through the
  real opening, so the wall and bars cast the barred patch. It swings
  ±35° across the day and climbs toward midday. Only by day, only
  indoors, only when there is an opening.
- **Sky glow outside the window:** the opening shows the time of day (night
  → day sky by the clock), dimmer for smaller openings.
- **Outdoor interlude:** open sky with a real sun, from 13:00, for the
  baseline's hours. The cell disappears while the person is outside.
- **Ambient:** a hemisphere light; constants in code, with no UI.

**Integration (built 2026-10-05).** In the main app, a selected capacity
node opens the person view: click it again, press Enter on it, or use
**Open person view** in the node panel. It is the third view in the
sliding track (grid → network → person), sized to fill the window below
the header, with its panel in the side column like the other views
(below the scene on narrow windows). The header and stress band stay
live: their sliders set the person's load, and the scenario menu and
archetype picker switch what it shows. The view switch gains a third
tab, **Person**, once a person has been opened. It is selected in the
person view and disabled in the grid; in the network it opens the
selected capacity (else the last one opened). Grid and Network leave the
person view.

The side panel shows **← Network**, the capacity's name, the day bar (play or
pause and clock, then the scrubber and lighting mode, at the column's
width; it sits over the scene only in the standalone page), and a note on how the
thought bubble reads: for the capacity (one feature at a time, by time of
day) or, with a ring selected, for that ring alone, with how to move
between rings and go back. The legend lists ring color and height, the
white rim, and the figure's color.

Each opening starts the day at midnight, playing. Escape clears a
selected ring first, then closes. The URL is `#person/<capacity>`:
browser Back closes it, and the link reopens it on load. On close, focus
returns to the capacity node. three.js loads only on first open, and the
scene stops rendering while hidden. Lighting rules are unchanged: they
belong to the person view.

The view lives in `src/person/personMode.js` (`createPersonMode`), shared
by the main app and the standalone `person.html`, which keeps its own
scenario and capacity pickers as a test harness. The hidden right-hand
readout was dropped in the move.

### Day cycle

`HOUR_SECONDS = 4` in `src/model/dayCycle.js` (code only; a 96-second
day, slowed from 1 s per hour on 2026-10-04 to pace the thought bubble).
Each opening starts at 00:00, playing. Play, pause and scrub are
user-owned. `lightingAt()` returns the hour, fluorescent and tube levels,
outdoor blend, window sun, sun angle, sunUp (clock only), daylight (from
the baseline), the window kind and the yard hours.

### Panels

- **Main app:** the right-hand column holds ← Network, the capacity's
  name, the day bar (play/pause, clock, scrub, lighting mode) and the note
  on how the thought bubble reads, with the legend below. The header and
  stress band supply scenario, archetype, duration and population.
- **Standalone `person.html`:** a left panel with scenario, capacity,
  duration and population; the day bar sits over the scene.
- **Right (readout):** removed in the integration (2026-10-05).

### Ring hover (built 2026-10-05)

A raycaster from the pointer finds the first ring under it (each ring
mesh carries `userData.ring`). The mannequin counts as the body ring,
since it covers most of the body disc. The hovered ring brightens
slightly, and a small label beside the cursor names it with the
configured ring name (body, reach, room, building, world). Code: the
"Ring hover" block in `scene.js` and the `.ring-label` element made in
`personMode.js`.

**Ring selection (built 2026-10-05).** Click a ring (or the mannequin, for
body) to select it.
- The ring stays highlighted, more strongly than on hover.
- The bubble switches from the opened capacity's edges to that ring's own
  edges: the per-edge detail the ring's average hides.
- The bubble's outline and dots are stroked in the ring's average color
  (no tint, so text stays legible), with a small ring-name tag.
- Selected-ring lines ignore the time-of-day filter, except that lines
  about night appear only in the evening or at night (night variants only
  at night).
- Leave by clicking the ring again, clicking empty space, pressing Escape,
  or changing the scenario or capacity. Hover never changes the mode.
- Code: `ringBubbleAt()` in `bubbles.js` (tested), selection and keys in
  `personMode.js` (in `main.js` before the integration).
- **Keyboard (2026-10-05):** Tab focuses the scene (never hijacked, so
  focus can move on). Enter or Space toggles ring mode, starting at the
  opened capacity's own ring. Arrows cycle the selected ring and wrap:
  ↑/→ step outward (body → world), ↓/← inward; an arrow with nothing
  selected starts at the capacity's ring. Escape exits.
- Not yet: touch-specific behavior.

### Thought bubble (built 2026-10-04)

- **Always cycles:** one bubble above the mannequin steps through the
  opened capacity's edges across the day, one edge at a time. No ring
  click is needed; selecting a ring (built 2026-10-05, above) switches the
  bubble to that ring's edges.
- **Every edge speaks, supportive ones included,** with neutral lines
  ("I can wash when I need to"), not only strained ones.
- **Per-edge library:** a line for each authored edge × state band
  (supportive / mixed / substantial / severe), plus night variants where
  the condition differs at night. Approved and in use: the data is in
  `app/src/data/bubble-lines.json`, the reference table in
  `bubble_lines_review.md`.
- **Icons hidden for now** (2026-10-05): `.bubble-icon { display: none }` in
  `person.css`; the glyphs and colors are still set.
- **Rendering:** an HTML overlay tracked to a point above the mannequin's
  head (crisp, accessible), with the edge's lived-domain icon in its live
  state color beside the line (hidden for now, above).
- **Singular voice (2026-10-04):** every line is first person singular;
  no "we" or "us".
- **Time of day:** phases are morning 06–12,
  afternoon 12–18, evening 18–22 and night 22–06. Each edge may appear
  only in its phases: a default per lived domain, overridden where a line
  refers to a time or to daylight. A check keeps any line that mentions
  night out of the day.
- **Pacing:** 6 s per bubble (`BUBBLE_SECONDS` in `src/model/bubbles.js`); the day slows
  to 4 s per hour (`HOUR_SECONDS`, a 96 s day). Selection is
  deterministic: 1.5 h slots, allowed edges in a fixed order, slot mod
  count. No bubble when nothing is allowed (superseded: it now always
  speaks, below); outdoors, only exterior edges speak.
- **Implementation:** `src/model/bubbles.js` (pure; tested), the overlay
  in `src/person/personMode.js` (in `main.js` and `person.html` before
  the integration), and glyphs in `src/person/icons.js`. The bubble
  follows a point above the mannequin's head every frame (also while
  paused) and fades between lines.

- **Always speaks (fixed 2026-10-05).** When none of the capacity's
  lines fits the time of day, its other lines speak instead (lines that
  mention night still wait for the evening). Before this, exterior
  permeability, whose lines are all daytime, was silent from 18:00 to
  06:00, and so for the first 24 seconds after every opening. Exterior
  permeability's lines have since gained night variants and may speak in
  every phase, evening and night included.

- **Alternative lines (built 2026-10-06).** Any day line or night variant
  in `bubble-lines.json` may be a list of strings instead of one. Day 0 of
  a viewing (the first 24 hours after opening) uses the first; each later
  day moves to the next, wrapping (`pickLine`, `lineFor` in `bubbles.js`).
  Deterministic: the same day always says the same thing. The capacity
  exists for all 52 tiles × 4 bands; variety is added only where longer
  work with the model shows a tile needs it, reviewed as tables first.
  **Rule:** alternatives for one tile and band must be equally severe,
  interchangeable phrasings of the same condition. Escalating across
  days would fake a decline the model doesn't compute.
  **Rule (2026-10-06):** no line names a specific other day (yesterday,
  tomorrow, last week, "ago"). Habits within the stay ("every day",
  "most days", "since I got here") are fine: the duration slider sets
  the stay. Enforced by a test over every line and alternative.
  **Rule (2026-10-09):** a line describes the relationship its cell
  measures, not one building type's hardware (a cell door, a combination
  sink over the toilet, a phone room, a hallway), because every archetype
  speaks from the same library and the values alone decide what is said.
  Found when the converted warehouse reached five such lines; they were
  rewritten neutrally at the same severity.
- **The bubble stays scoped to the opened capacity (decided 2026-10-06).**
  It never mixes in other capacities' lines to build a narrative. The
  stitching (meals that don't come, a fight across the room) happens in
  the user's head as they open other nodes and inspect rings. Rejected:
  a default bubble drawing from every capacity in the scene.
- **No day counter (decided 2026-10-06).** The duration slider is the
  model's only time; the 24-hour loop shows one representative day at
  the set duration and load, not time passing. A visible day count would
  be a second, contradictory clock and would imply accumulation the model
  doesn't have (a step toward simulation). The day index that picks
  alternative lines stays internal and unlabeled.
- **Food (2026-10-06).** Functional adjacency × Food & water now speaks
  about how often and how well people are fed, not where they eat (the
  Hygiene and Sleep tiles in that row already cover where): "Three hot
  meals, at the same times every day." / "Meals come late, and they're
  often cold." / "Most days it's a sandwich and maybe some fruit." /
  "Sometimes I don't know when or what I'm going to eat." Its mechanism
  now includes kitchen and serving space sized for the design
  population, and its sensitivities rose (population 0.55 → 0.75,
  interaction 0.45 → 0.6) so a strong kitchen still slips at extreme
  overcrowding. Intersections metadata version 2026-10-06. A likely
  first candidate for alternative lines.

### Next and open

Built since this list began: ring interaction (hover, click and keyboard
selection, above), the thought bubble, mannequin scale (now about 1.2
tall), and integration into the main app (2026-10-05).

- **Per-capacity access scripts** for the day loop (see "decisions"
  above); only the global lighting and the outdoor interlude exist.
- **Crowding** compressing the reach ring.
- **Mannequin redesign.**
- **Touch behavior** for ring hover and selection.
- **Renaming "world" to "territory"** (possibly).
- **Formula mode** (see To-dos).
- **Population profile gap:** the model treats everyone identically (see
  "Gap noted: age and gender" above).
- **Review the 28 new archetype baselines** (see To-dos). It's due now
  that the person view runs.

## Landing page (built 2026-10-06)

The site opens on `index.html`, a short reading page, instead of the grid.
The model moved to `model.html`; its title and an About link lead back.
Sections: the question and the summary's opening lines; what this is (and
isn't); four ways to look (one sentence per view); the idea (support as a
moving margin, with a small chalkboard demand curve); where the numbers
come from (an invitation to change them); start with a building (seven
archetype buttons, `model.html#start/<archetype>`, which open that
archetype in the grid; a card left alone on the last row spans it); credits (no repository link). Text is the
summary's, shortened in the same voice. The summary PDF is served from
`app/docs/`.

## Converted warehouse archetype (2026-10-09)

The seventh archetype, `converted_warehouse`, follows reporting on ICE's
plan to convert large distribution warehouses into detention sites. It
sits next to the soft-sided camp, its nearest neighbour, and it is
included because people who know the facility type from the news should
find it here.

- **One archetype, minimal fit-out.** Reports on the same building
  describe very different interiors, from bunk rows under constant
  surveillance to cellblocks with medical wings. The baselines assume the
  minimal one: bunk rows divided by fencing, added restroom blocks, a
  kitchen built into the shell with meals in a shared hall, a small fenced
  yard. A heavier fit-out moves toward purpose-built detention, so it is
  left to users to raise those cells, not given its own preset.
- **Baselines in three groups.** The empty building (daylight, exterior,
  acoustic refuge, sensory compartmentalization, granularity, climate,
  wet core) is weak because of the walls, roof and mechanical systems,
  and the fit-out can't fix it. The site (territorial connectivity,
  inspectability) is weak because of where the buildings sit and who
  controls them. The rest depends on the fit-out. Mean baseline 0.65 with
  23 zeros, the lowest of the seven (short-term holding 0.83, soft-sided
  camp 1.0). It scores above the camp on medical isolation (a planned
  medical wing), on medical and legal adjacency (under one roof) and on
  reaching a toilet without an escort (restroom blocks inside each
  section).
- **The plans' room list is not taken at face value.** ICE's planning
  paper lists courtrooms, cafeterias, legal visitation, law libraries and
  recreation space. Only courtrooms and legal visitation count toward the
  legal cells; the law library is treated as unconfirmed.
- **Suggested load:** 1440 h (about 60 days, the stated average for the
  large-scale sites) at load ratio 1.0.
- **Person view:** windowless, 1 h of yard, lit all night.
- Reviewed cell by cell in a comment artifact. The research behind it
  (`warehouse_detention_research.md` and the two source PDFs) stays local.

## Deployment (2026-10-06)

- **Live:** http://157.230.158.58:8001, open to anyone (no password).
- **Droplet:** the same DigitalOcean droplet as other projects. Each
  project there runs its own small server on its own port under pm2; there
  is no shared web server. This one: folder `/root/ice/`, pm2 process
  `ice`, port 8001, started as `pm2 start serve.py --name ice --interpreter
  python3 -- 8001`. `pm2 save` has been run, so it restarts after a reboot.
  The firewall (UFW) allows 8001/tcp; nothing else on the droplet was
  changed.
- **Redeploy:** `./dropit` at the project root (local only, gitignored,
  since it holds the droplet's address and login). It copies `app/` to
  `/root/ice/` without the tests, removes files deleted locally, and
  restarts only the `ice` process. It needs the SSH key loaded first
  (`ssh-add --apple-use-keychain ~/.ssh/id_ed25519`).
- **What is served:** `app/` only. Nothing is stored on the server: each
  visitor's scenarios stay in their own browser. The person view loads
  three.js from its CDN.
- **Source:** https://github.com/damg70/ice-detention-architecture-under-load
  (public). Review notes, sketches and `dropit` are kept local and
  gitignored.
