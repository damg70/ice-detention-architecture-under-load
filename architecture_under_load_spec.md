# Architecture Under Load

## Specification for a Parametric Detention-Environment Grid

**Status:** coding-agent handoff\
**Artifact type:** interactive exploratory model\
**Primary output:** browser-based 2D grid with two global stress
controls\
**Working title:** *Architecture Under Load*

------------------------------------------------------------------------

## 1. Purpose

Build an interactive visual model for exploring how architectural form,
environmental conditions, and institutional load interact over time.

The model is **not** a representation, rating, or simulation of any
specific ICE detention facility. It abstracts the architectural research
into a manipulable form.

The central proposition is:

> A built environment contains capacities and vulnerabilities.
> Population load and duration of exposure do not merely add more
> discomfort; they can activate, amplify, or overwhelm those
> architectural properties.

The interface should allow a user to describe a hypothetical form by
marking the degree to which architectural capacities support particular
dimensions of lived experience. Two global controls---**duration** and
**population load**---then place that form under stress. As those
controls change, individual intersections should tend toward green,
neutral, amber, or red according to their baseline condition and
sensitivity to load.

The visualization should make it possible to see **where a form remains
resilient, where it begins to fail, and which failures cascade across
multiple dimensions of lived experience**.

This is an exploratory instrument, not a moral calculator.

------------------------------------------------------------------------

## 2. Conceptual lineage

The model comes from research into the interiors of
immigration-detention facilities, but its underlying object is broader:
**architecture as stored institutional behavior**.

Different architectural types arrive with different histories:

-   purpose-built detention center;
-   county jail used for immigration detention;
-   converted or reactivated prison;
-   short-term office/processing holding space;
-   soft-sided or rapidly deployable mass camp;
-   converted warehouse;
-   family/residential detention campus.

These types encode different assumptions about duration, population,
security, privacy, movement, bodily maintenance, visibility, and social
life.

The model should preserve that "biographical" dimension without turning
the interface into a database of real facilities. Architectural
archetypes may be offered as **starting presets**, but they must remain
editable abstractions rather than claims about actual sites.

The deeper proposition is:

> Architecture does not determine behavior. It establishes the cost of
> doing otherwise.

A short-term holding room can function acceptably for several hours and
become severely degrading when used for several days. A dormitory can
work at design occupancy and become acoustically, hygienically, and
medically unstable at twice that occupancy. A prison conversion can
possess abundant secure circulation while making ordinary movement,
legal access, or healthcare behaviorally remote.

The model should make those transformations visible.

------------------------------------------------------------------------

## 3. Non-goals

Do **not** build:

1.  A map of ICE facilities.
2.  A database of allegations or inspection findings.
3.  A facility "humane/inhumane" score.
4.  A compliance checker for ICE detention standards.
5.  A predictive model claiming empirical accuracy.
6.  A machine-learning model.
7.  An AI-generated assessment.
8.  A single aggregate red/green verdict.
9.  A game in which "good detention" is the win state.
10. A visualization in which an unmarked cell is silently treated as a
    bad condition.

The first version should be deterministic, inspectable, local, and easy
to modify.

------------------------------------------------------------------------

## 4. Core interaction

The screen is dominated by a **two-dimensional matrix**.

### Rows: architectural capacities

Rows describe properties of the built form.

### Columns: lived domains

Columns describe dimensions of human experience affected by the
architecture.

### Cells: intersections

A cell represents the relationship between one architectural capacity
and one lived domain.

Example:

> `Daylight / exterior orientation × Temporal orientation`

asks:

> To what degree does this form allow daylight and exterior cues to
> support a person's ability to distinguish day from night and orient
> themselves in time?

Another:

> `Wet-core / plumbing design × Hygiene & bodily privacy`

asks:

> To what degree does the sanitary architecture support regular washing,
> elimination, drainage, ventilation, and reasonable bodily privacy
> under the current form?

The user marks the degree of support at relevant intersections.

The grid then responds to the two global stress controls:

-   **Duration of exposure**
-   **Population load**

Some cells should barely change when duration rises. Others should
deteriorate sharply.

Some cells should tolerate moderate crowding. Others should fail
rapidly.

Some should be especially sensitive when **both** duration and
population rise together.

------------------------------------------------------------------------

## 5. The grid

### 5.0 Two levels of the model

Not every variable belongs at the same level. Mixing them is how hidden
double counting enters the model, so the levels are kept apart in the
data, in the calculation, and in the interface.

  -------------------------------------------------------------------------------
  Level                       What it is                      Examples
  --------------------------- ------------------------------- -------------------
  **Architectural             Properties of the built form    Wet-core, daylight,
  capacities** (rows)         that support specific lived     acoustic refuge,
                              domains. Each meets each column spatial granularity
                              in a cell.

  **Global stressors**        Demands placed on the form.     Duration,
                              The architecture does not       population load
                              change when they do.
  -------------------------------------------------------------------------------

There is no separate level of form-wide settings. Global stress reaches
every cell directly, and each cell answers it from its own baseline.

Two variables from the earlier draft were moved out of the rows, and
both are now dropped from the model entirely:

-   **Capacity elasticity** restated the population slider as a row:
    the load ratio is already measured against design capacity. It was
    briefly kept as a single form-wide setting that scaled population
    stress beyond capacity, but that was a "global temperature"
    shortcut for what the per-cell baselines already express more
    accurately. How gracefully a form absorbs overcrowding should
    emerge from its cells (spatial granularity, horizontal space and
    sleep infrastructure, wet-core), not from one global number.
-   **Program-to-building fit** was dropped as an input. The baselines
    already record what a program provided: a long-term building has
    windows and showers, a holding room does not. A misfit such as
    "designed for hours, used for days" is therefore what the grid
    *shows* when the sliders move. Making fit an input would count that
    mismatch twice. For the same reason the form does not declare a
    duration it was designed for: what a form was built to sustain
    emerges from how its baselines are set.

**Not yet modeled: population profile.** One part of program fit is
captured nowhere: population *type* (families, children, people with
medical or disability needs, in forms built for single adults). It is
probably a third global stressor rather than a property of the form. It
is out of scope for the MVP, but the data model should leave room for
it.

### 5.1 Recommended row variables

Use these as the initial architectural-capacity rows:

1.  **Spatial granularity**\
    Ability to divide inhabitants into smaller social/spatial units
    rather than one large undifferentiated population.

2.  **Sensory compartmentalization**\
    Ability to keep sound, odor, moisture, light, conflict, and activity
    in one area from propagating throughout the environment.

3.  **Wet-core / plumbing design**\
    Adequacy, separation, drainage, ventilation, durability, and
    capacity of toilets, sinks, and showers.

4.  **Daylight & exterior orientation**\
    Access to natural light, visible day/night cues, sky, horizon, or
    other exterior temporal information.

5.  **Exterior permeability**\
    Practical access to outdoor air, sun, weather, recreation, and an
    environment beyond the enclosed interior.

6.  **Acoustic refuge**\
    Availability of spaces in which a person can escape or substantially
    reduce communal, mechanical, television, intercom, and impact noise.

7.  **Functional adjacency**\
    Whether sleeping, sanitation, dining, medical, legal, recreation,
    and other functions are appropriately separated yet practically
    reachable.

8.  **Circulation autonomy**\
    Degree to which a person can move among permitted spaces without
    every transition requiring staff intervention, escort, search, or
    door release.

9.  **Climate envelope / HVAC resilience**\
    Ability to maintain tolerable temperature, ventilation, humidity,
    and air quality as occupancy and weather change.

10. **Horizontal space & sleep infrastructure**\
    Ability to provide each person with a stable place to lie down,
    sleep, store basic belongings, and remain out of circulation paths.

11. **Territorial connectivity**\
    Architectural/logistical connection to hospitals, courts, lawyers,
    family visitation, transport, and other external services.

12. **Inspectability / observational permeability**\
    Ability of independent inspectors, attorneys, family, monitors, and
    other legitimate outsiders to observe conditions and communicate
    privately with inhabitants.

13. **Spatial differentiation**\
    Availability of genuinely different environments during the day:
    sleep space, dining space, outdoor space, medical space, legal
    space, recreation space, quiet space, etc.

These rows should be data-driven from a configuration file rather than
hard-coded into rendering logic.

------------------------------------------------------------------------

### 5.2 Recommended column variables

Use these lived-experience domains:

1.  **Sleep & rest**
2.  **Hygiene & bodily privacy**
3.  **Food & water**
4.  **Sensory regulation**
5.  **Movement & recreation**
6.  **Medical access**
7.  **Legal & social communication**
8.  **Temporal orientation**
9.  **Safety & conflict exposure**
10. **Agency & dignity**

These are not intended to be mutually exclusive. The point of the grid
is precisely that one architectural property may affect several lived
domains.

------------------------------------------------------------------------

## 6. Cell state

Every cell needs **two conceptually separate states**:

### A. Applicability / evidence state

-   `unmarked`
-   `marked`

An unmarked cell means:

> "No assertion has been made about this relationship."

It must **not** mean zero support.

Unmarked cells remain visually neutral and are excluded from processing.

### B. Baseline support value

For marked cells, use a five-step scale:

-   `0` --- actively poor / architecture strongly undermines this domain
-   `1` --- weak
-   `2` --- mixed / marginal
-   `3` --- supportive
-   `4` --- strongly supportive / resilient baseline

The UI should avoid presenting these numbers as scientific measurements.
They are user-authored model inputs.

A cell can be set by clicking repeatedly, opening a small popover,
dragging, or using keyboard controls. Favor an interaction that is fast
enough to populate a grid without becoming tedious.

Suggested visual input states before stress processing:

-   unmarked: empty / neutral gray
-   0: small filled indicator at low end
-   1: slightly larger/stronger
-   2: midpoint
-   3: high
-   4: maximum

Do not immediately equate input level with final red/green color. The
processed state is a separate visual layer.

------------------------------------------------------------------------

## 7. Global stress controls

Place two prominent controls adjacent to the grid.

### 7.1 Duration

Duration represents **continuous exposure to the modeled environment**.

Use a nonlinear/logarithmic slider because the difference between 6
hours and 72 hours is more important than the difference between day 181
and day 183.

Suggested labeled anchors:

-   2 hours
-   8 hours
-   24 hours
-   72 hours
-   1 week
-   1 month
-   3 months
-   6 months+

Internally normalize duration to `D ∈ [0,1]` on a log scale:

``` text
D = clamp( ln(hours / 2) / ln(4380 / 2), 0, 1 )
```

which places the anchors at:

  Anchor     2 h   8 h   24 h   72 h   1 wk   1 mo   3 mo   6 mo+
  -------- ----- ----- ------ ------ ------ ------ ------ -------
  `D`       0.00  0.18   0.32   0.47   0.58   0.77   0.91    1.00

The slider stores **hours**; `D` is always derived.

Do not imply that these anchors represent legal detention limits. They
are exposure durations.

### 7.2 Population load

The portable measure is **occupancy relative to design/operational
capacity**, not raw head count.

Suggested anchors:

-   25%
-   50%
-   75%
-   100% --- nominal capacity
-   125%
-   150%
-   200%
-   300%

Internally map the load ratio `L` (current / design capacity) to
`P ∈ [0,1]` by piecewise-linear interpolation over an editable anchor
table stored in config (not in code):

  `L`     ≤0.25   0.50   0.75   1.00   1.25   1.50   2.00   ≥3.00
  ----- ------- ------ ------ ------ ------ ------ ------ -------
  `P`      0.00   0.05   0.12   0.25   0.40   0.55   0.75    1.00

The shape is deliberate: under-capacity occupancy contributes little,
nominal capacity is not stress-free, and the curve is steepest between
100% and 200%, where overcrowding effects compound. The slider stores
the **ratio**; `P` is always derived.

The UI may label this control:

**Population / Capacity Load**

If the user optionally enters a design capacity and current population,
show the absolute numbers as secondary information and calculate the
ratio automatically.

Do not make absolute population mandatory.

------------------------------------------------------------------------

## 8. Stress sensitivity metadata

Each valid row/column intersection should have static metadata
describing how sensitive that relationship is to:

-   duration;
-   population load;
-   duration × population interaction;
-   base demand: how much support the relationship requires even at
    minimal load (a toilet is needed in the first hour; a recreation
    yard is not).

Baseline resilience is **not** a metadata field. Resilience comes from
the user-authored baseline itself (see §9): a strong form has more
margin against demand.

This metadata is **heuristic**, not empirically calibrated. It exists to
make the model behave intelligibly and should be easy to inspect and
edit.

Example configuration:

``` json
{
  "row": "wet_core",
  "column": "hygiene_privacy",
  "durationSensitivity": 0.55,
  "populationSensitivity": 0.90,
  "interactionSensitivity": 0.75,
  "baseDemand": 0.25
}
```

Example:

``` json
{
  "row": "daylight_orientation",
  "column": "temporal_orientation",
  "durationSensitivity": 0.90,
  "populationSensitivity": 0.10,
  "interactionSensitivity": 0.10,
  "baseDemand": 0.00
}
```

The second cell should become substantially more consequential as
exposure lasts days or weeks, but should not deteriorate much merely
because population rises.

By contrast:

``` json
{
  "row": "acoustic_refuge",
  "column": "sleep_rest",
  "durationSensitivity": 0.70,
  "populationSensitivity": 0.75,
  "interactionSensitivity": 0.85,
  "baseDemand": 0.05
}
```

should become particularly stressed when many people remain together for
a long time.

------------------------------------------------------------------------

## 9. Processing model

The model must be deterministic and simple enough to explain.

### 9.1 Principle: support is measured against demand

A cell does not hold a fixed quantity of support that load wears away.
It holds a **capacity**, and duration and population determine how much
of that capacity the situation **demands**. A bench is adequate sleep
infrastructure for four hours and inadequate for four days; the bench
did not change.

The processed value therefore expresses **margin**: how much the
architecture's support exceeds or falls short of what the current
conditions require.

### 9.2 Calculation (model version 3)

`D` and `P` come straight from the sliders (§7.1, §7.2):
`D = normalizeDuration(hours)` and `P = normalizePopulation(loadRatio)`.
The same `D` and `P` reach every cell; nothing at the level of the whole
form adjusts them.

**Steps 1–4, per marked cell:**

1.  Normalize baseline support:

``` text
Q = baseline / 4                         // Q ∈ [0,1]
```

2.  Calculate raw load on the relationship:

``` text
load =
    baseDemand
  + durationSensitivity    * D
  + populationSensitivity  * P
  + interactionSensitivity * D * P
```

3.  Convert load to demand with a soft saturation (no hard clamp, so
    the interaction term keeps mattering at high load):

``` text
demand = DEMAND_CEILING * (1 - exp(-load))
```

4.  Calculate processed support from the margin:

``` text
E = clamp(0.5 + (Q - demand), 0, 1)
```

Global constants, stored in model config:

``` text
DEMAND_CEILING = 1.15
```

### 9.3 How to read it

-   `E = 0.5` means **just adequate**: support matches demand.
-   Above 0.5, the form has headroom; below, it is under strain.
-   At minimal load, a cell's color reflects its baseline, shifted
    toward neutral: a baseline-0 cell starts amber, not deep red, unless
    its `baseDemand` is high.
-   A baseline-0 cell can never read as supportive (`E ≤ 0.5`).
-   A baseline-4 cell resists most realistic loads but, because
    `DEMAND_CEILING > 1`, it **can** cross into strain under extreme,
    prolonged overload in highly sensitive relationships. Strong
    architecture buys resilience; it does not buy immunity.
-   A relationship with low population sensitivity barely responds to
    the population slider.
-   How well a form absorbs overcrowding is read from its
    population-sensitive cells (horizontal space, wet-core, acoustic
    refuge, spatial granularity), each through its own baseline.

### 9.4 Reference values

Implementations should reproduce these (±0.01) as unit tests, using the
§26 coefficients:

  Cell                          Baseline   Condition       `E`
  ---------------------------- ---------- ------------- -------
  Horizontal space × Sleep          1      6 h / 70%      0.44
  Horizontal space × Sleep          4      1 mo / 150%    0.60
  Horizontal space × Sleep          4      6 mo / 300%    0.43
  Wet-core × Hygiene                1      6 h / 70%      0.34
  Wet-core × Hygiene                3      1 wk / 80%     0.64
  Daylight × Temporal orient.       1      6 h / 70%      0.60
  Daylight × Temporal orient.       4      6 mo / 300%    0.73
  Spatial granularity × Safety      4      6 mo / 300%    0.48

### 9.5 Why the version-0 formula was replaced

The earlier draft computed `E = Q − S·(1 − resilience·Q)` with `S`
hard-clamped to `[0,1]`. Prototyping against §27 showed that:

-   `E` could never exceed `Q`, so the processed layer simply restated
    the input at low load, and a sparse short-term room read red at 2
    hours (failing Test A and contradicting the central thesis);
-   `S` saturated around `D = P = 0.5` for high-sensitivity cells,
    erasing the interaction term;
-   with resilience ≈ 0.3, a baseline-4 cell fell to `E ≈ 0.30` at 1
    week / 180% (failing Test E).

### Important

Treat this formula as **version 3 of a working hypothesis**, not as
truth. (Version 2 added a form-wide capacity elasticity setting that
scaled population stress between 100% and 200% of capacity; version 3
removes it, so `P` reaches every cell unadjusted. Versions 1 and 3 have
no form-wide setting, and both give results identical to version 2 with
elasticity unmarked.)

Put the cell calculation in one clearly named module/function so it can
be replaced after visual experimentation. Export `MODEL_VERSION`.

Do not bury coefficients or constants in component code.

------------------------------------------------------------------------

## 10. Color behavior

The processed value `E` controls the cell's visual tendency.

Suggested semantic scale:

-   `0.00–0.20` --- deep red: severe strain
-   `0.20–0.40` --- red/orange: substantial strain
-   `0.40–0.60` --- neutral/amber: unstable or mixed
-   `0.60–0.80` --- yellow-green: supportive
-   `0.80–1.00` --- green: resilient/supportive

Use a **continuous interpolation**, not five hard bands, if technically
convenient.

`E = 0.5` is the **neutral point** (support just matches demand), so
the neutral/amber band is centered on it. Under the §9 model, a cell's
color is always relative to the current conditions, never a restatement
of its baseline.

### Critical semantic rule

The colors mean:

> **support ↔ strain under the modeled conditions**

They do **not** mean:

> moral ↔ immoral\
> legal ↔ illegal\
> humane ↔ inhumane\
> compliant ↔ noncompliant

Do not compute an overall facility color.

The visual argument is in the **pattern across the grid**.

### Accessibility

Red/green cannot be the only information channel.

Also encode state through at least one of:

-   luminance;
-   fill density;
-   border weight;
-   a small `+ / ~ / –` indicator;
-   optional numeric/word label.

Provide a colorblind-safe display mode if practical.

------------------------------------------------------------------------

## 11. Cascades

The first implementation does not need a complex causal simulation, but
it should prepare for one.

Some architectural failures create secondary pressure elsewhere:

``` text
overcrowding
    ↓
wet-core overload
    ↓
sanitation degradation
    ↓
hygiene strain
```

or:

``` text
high population
    +
low spatial granularity
    ↓
noise / conflict exposure
    ↓
sleep degradation
    ↓
medical / behavioral stress
```

For MVP, do **not** automatically propagate these causal chains.

Instead, allow metadata to create strong `duration × population`
sensitivities in cells where cascading effects are plausible.

Design the data model so explicit inter-cell dependencies could be added
later.

------------------------------------------------------------------------

## 12. Architectural archetype presets

Include an optional preset selector.

Presets are **starting configurations**, not factual facility profiles.

Suggested presets:

1.  Purpose-built long-term detention
2.  County-jail insertion
3.  Converted/reactivated prison
4.  Short-term processing/holding space
5.  Soft-sided mass camp
6.  Converted warehouse
7.  Family/residential campus
8.  Blank model

Selecting a preset should:

-   populate some baseline cells;
-   leave uncertain relationships unmarked where appropriate;
-   carry a **suggested load** (a plausible nominal duration and a
    population at or near nominal capacity), stored separately from the
    form's baselines;
-   apply the suggested load to the sliders, labelled as "suggested
    load for this archetype" so it reads as a starting condition and
    not as part of the architecture;
-   display a clear notice that this is an abstract archetype.

Every preset value must remain editable.

The user should always be able to choose **Blank model** and construct a
form from scratch.

Store presets as JSON or equivalent data files.

------------------------------------------------------------------------

## 13. Architectural biography panel

Because the research treats architectural types biographically, include
a small optional panel associated with each preset.

Example:

### Converted / Reactivated Prison

> Inherits a spatial system designed around correctional security:
> cells, controlled circulation, segregation capacity, secure perimeter,
> fixed medical and plumbing infrastructure. Reuse may provide immediate
> bed capacity while importing assumptions about classification,
> privacy, movement, visitation, and staff control that were developed
> for a different institutional purpose.

This text should explain **lineage**, not judge the type.

The panel disappears or becomes user-editable when the user creates a
custom form.

------------------------------------------------------------------------

## 14. Cell inspection

Clicking a cell should open a compact detail panel. It serves both the
person building a scenario (who sets the baseline here, right after
reading the question) and the reader of one.

Show:

-   architectural row name and lived-domain column name;
-   plain-language question represented by the intersection;
-   the baseline control (unmarked, 0–4) with the chosen level's label;
-   for a marked cell, support against current demand, as two bars on one
    scale with the margin (`Q − demand`, §9), introduced by one line:
    "What the architecture supplies (from the baseline) and what the
    current duration × population load asks of it.";
-   where the load comes from: the shares of base demand, duration,
    population and their interaction, as a bar and legend without
    numbers;
-   a short written explanation of why the cell is in its state;
-   the cell note.

Not shown here (revised 2026-10-06): the score `E`, the comparison with
minimal load, and the sensitivity metadata. Without the math they read as
noise. They belong to a future formula view that explains the
calculation. The grid tile already shows the processed state.

Example:

### Wet-core design × Hygiene & bodily privacy

**Baseline:** Supportive\
**Duration:** 1 week\
**Population:** 175% capacity\
**Demand:** 0.88 → **Margin:** −0.13\
**Current state:** Substantial strain

> This relationship is highly sensitive to population load. Increased
> use places pressure on fixture availability, drainage, ventilation,
> cleaning, and privacy. Longer exposure increases the consequence of
> persistent deficiencies.

The explanation must be generated deterministically from
metadata/templates, not by an LLM.

------------------------------------------------------------------------

## 15. Temporal interaction

Slider movement should update the grid immediately.

The most important experience is **watching the same form transform**.

A useful sequence might be:

1.  User constructs a moderately supportive form.
2.  Duration = 8 hours; population = 70%.
3.  Grid is largely neutral-to-green.
4.  User increases duration to 72 hours.
5.  Daylight, sleep, bathing, spatial differentiation, and
    temporal-orientation intersections begin moving toward amber/red.
6.  User raises population to 175%.
7.  Wet-core, acoustic refuge, horizontal space, circulation, medical
    adjacency, and safety intersections deteriorate rapidly.
8.  Some well-designed cells remain green.

The interface should make it visually obvious that **nothing about the
architecture itself changed**.

Only the demands placed upon it changed.

That is the central demonstration.

------------------------------------------------------------------------

## 16. Comparison mode

Not required for the first functioning prototype, but design toward it.

Comparison mode should allow:

-   Model A and Model B side by side;
-   or one form at two different load states.

The most useful comparison is probably:

> **same architecture, different duration/population**

Example:

``` text
FORM A
Duration: 8 hours
Load: 80%

versus

SAME FORM
Duration: 30 days
Load: 180%
```

A difference view could highlight cells whose state changed most.

Do not rank the two scenarios.

------------------------------------------------------------------------

## 17. Scenario persistence

Support lightweight scenario persistence.

Minimum:

-   save to localStorage;
-   rename scenario;
-   duplicate scenario;
-   reset;
-   export JSON;
-   import JSON.

Suggested schema:

``` json
{
  "schemaVersion": 2,
  "modelVersion": 3,
  "metadataVersion": "2026-10-06",
  "name": "Untitled Form",
  "archetype": "custom",
  "durationHours": 72,
  "loadRatio": 1.25,
  "designCapacity": null,
  "currentPopulation": null,
  "model": { "demandCeiling": 1.4 },
  "cells": {
    "wet_core:hygiene_privacy": {
      "marked": true,
      "baseline": 3,
      "meta": { "populationSensitivity": 0.95 }
    }
  }
}
```

Keep user-authored state separate from model metadata.

**Scenario adjustments (optional).** A scenario may adjust the model for
itself, from equation mode:

-   `model`: model-wide constants, `demandCeiling` (0.5–3) and `midpoint`
    (0–1). They apply to every tile in that scenario only. Changing one
    asks the user to confirm, since it affects all 130 tiles.
-   `cells[key].meta`: a tile's own sensitivities, `baseDemand` (0–1) and
    `durationSensitivity`, `populationSensitivity`,
    `interactionSensitivity` (0–1.5). A cell may carry `meta` without a
    baseline.

Only values that differ from the authored metadata are stored; anything
absent uses the authored value. Both are optional, exported with the
scenario, and validated on import: out-of-range numbers are clamped and
unknown fields dropped. The authored model and other scenarios are never
changed. Any stored adjustment makes the scenario Custom.

**Import never overwrites.** An imported scenario gets a new id, and if its
name is already used, a number: "County jail (2)".

Store **raw** load values (hours, ratio), never normalized `D` or `P`.
Normalization curves live in config and will change; a saved scenario
must mean the same conditions after they do.

**Migration from schema 1.** Schema-1 scenarios may contain
`capacity_elasticity:*` and `program_fit:*` cells. On import, drop them
without conversion (neither row exists in the model, §5.0) and tell the
user how many marked cells of each were dropped.

------------------------------------------------------------------------

## 18. Notes / provenance

Allow an optional note on:

-   the whole scenario;
-   individual cells.

This makes the tool usable for research without converting it into a
facility database.

Example:

``` text
Cell note:
"Assuming sleeping and dining share the same volume."
```

or:

``` text
Scenario note:
"Testing a soft-sided form with unusually good outdoor access."
```

No citations system is required in the MVP, but notes should survive
JSON export.

------------------------------------------------------------------------

## 19. Visual design

The grid should feel like an **instrument panel / analytic field**, not
a compliance dashboard.

Desired qualities:

-   calm;
-   legible;
-   material;
-   dense enough for comparison;
-   no glossy "data product" aesthetic;
-   no gamification;
-   no score gauges;
-   no celebratory green checkmarks.

The cells should be the dominant visual object.

Suggested layout:

``` text
┌──────────────────────────────────────────────────────────────┐
│ ARCHITECTURE UNDER LOAD              [Preset: Blank ▾]      │
│                                                              │
│ Duration  ─────●──────── 72 hours                            │
│ Population ─────────●──── 150% capacity                      │
├──────────────────────────────────────────────────────────────┤
│                     LIVED DOMAINS                            │
│             Sleep  Hygiene  Food  Sensory  Move  Medical ... │
│ Spatial       ▓       ▓      ·      ▒       ·      ·         │
│ Sensory       ▒       ▓      ▒      ▓       ·      ·         │
│ Wet-core      ·       ▓      ▒      ▒       ·      ·         │
│ Daylight      ▒       ·      ·      ▓       ▒      ·         │
│ Exterior      ▒       ·      ·      ▓       ▓      ·         │
│ ...                                                          │
├──────────────────────────────────────────────────────────────┤
│ Selected cell                                                │
│ Wet-core × Hygiene                                           │
│ Baseline: Supportive → Current: High strain                  │
│ [explanation]                                                │
└──────────────────────────────────────────────────────────────┘
```

This is schematic only. Do not treat it as final UI design.

------------------------------------------------------------------------

## 20. Hover and focus behavior

Hover/focus should highlight:

-   the selected cell;
-   its row;
-   its column.

The user should be able to visually ask:

> "What does this architectural feature affect?"

by scanning horizontally.

And:

> "What architectural properties are currently shaping sleep?"

by scanning vertically.

Keyboard navigation through cells is required.

------------------------------------------------------------------------

## 21. Sparse matrix behavior

Not every intersection needs to be meaningful.

For example:

`Wet-core design × Legal communication`

may have little direct relationship.

The metadata should support:

``` json
{
  "applicable": false
}
```

Non-applicable cells should appear subtly different from **unmarked
applicable** cells.

Recommended states:

-   **N/A:** faint hatch or dash
-   **Applicable but unmarked:** empty neutral cell
-   **Marked:** interactive processed cell

This distinction is essential.

### Intersections without metadata

Only 52 of the 130 intersections get hand-authored metadata at
first (§26). An intersection with no entry in `intersections.json` is
treated as **applicable, with provisional default coefficients**:

``` json
{
  "durationSensitivity": 0.40,
  "populationSensitivity": 0.40,
  "interactionSensitivity": 0.30,
  "baseDemand": 0.00,
  "provisional": true
}
```

Defaults live in config, not code. Provisional cells process normally
when marked, but carry a subtle marker (e.g. a corner tick) and the
inspector states that their sensitivities are defaults and have not
been authored. Gaps in the metadata should stay visible rather than
silently looking authoritative. Only an explicit `"applicable": false`
produces an N/A cell.

------------------------------------------------------------------------

## 22. No aggregate score

Do not calculate:

``` text
Facility score: 67/100
```

Do not calculate:

``` text
Humane: 82%
```

Do not calculate a letter grade.

Do not automatically summarize the form as "good," "bad," "safe," or
"unsafe."

The model's object is the **topology of failure and resilience**.

A form with strong medical access and terrible sleep conditions should
remain visibly contradictory.

Do not collapse contradictions.

------------------------------------------------------------------------

## 23. Optional derived views

After the core matrix works, these are reasonable extensions.

### A. Row profile

For one architectural capacity, show its effects across lived domains.

### B. Column profile

For one lived domain, show all contributing architectural conditions.

### C. Stress trajectory

Animate or plot one cell as:

-   duration increases while population stays fixed;
-   population increases while duration stays fixed.

### D. Failure frontier

Show approximately where a cell crosses from supportive to strained in
duration × population space.

This could eventually become a miniature two-dimensional surface:

``` text
             POPULATION
             low → high
DURATION  ┌──────────────
 short    │ green green amber
   ↓      │ green amber red
 long     │ amber red   red
```

This would make the underlying parametric relationship especially clear.

Do not implement these before the primary grid interaction feels right.

------------------------------------------------------------------------

## 24. Recommended technical architecture

Prefer a lightweight browser implementation.

Acceptable stack:

-   vanilla HTML/CSS/JavaScript; or
-   a small React/Vite app if the coding environment already favors
    React.

Avoid adding a backend for the MVP.

Suggested modules:

``` text
/src
  /data
    rows.json
    columns.json
    intersections.json
    presets.json
    model-config.json      // constants, curves, defaults

  /model
    normalizeDuration.js
    normalizePopulation.js
    processCell.js
    processGrid.js
    explain.js

  /ui
    Grid
    Cell
    StressControls
    CellInspector
    ArchetypePanel
    ScenarioControls

  /storage
    scenarioSchema.js
    localStorage.js
    importExport.js
```

Keep:

**model logic ≠ rendering logic ≠ preset data ≠ user scenario state**

This separation is important because the research model will change.

------------------------------------------------------------------------

## 25. Determinism

Given identical:

-   cell inputs;
-   duration;
-   population load;
-   metadata version;

the grid must produce identical output.

No random variation.

No AI inference.

No hidden state.

Include the model/config version in exported JSON so old scenarios can
be reproduced.

------------------------------------------------------------------------

## 26. Suggested initial intersection sensitivities

Do not manually define all 130 intersections (13 × 10) before the prototype works.

The data now authors 52 intersections: 24 from the original seed list, plus 28 added after a full review of all 130 pairs (see `intersection_review.md`). The rest are N/A (16) or left on provisional defaults.

Examples:

| Architectural capacity | Lived domain | Duration | Population | Interaction | Base demand |
|---|---|--:|--:|--:|--:|
| Spatial granularity | Sleep | .55 | .75 | .75 | .05 |
| Spatial granularity | Hygiene/privacy | .40 | .75 | .65 | .10 |
| Spatial granularity | Sensory regulation | .55 | .75 | .70 | .05 |
| Spatial granularity | Medical access | .45 | .85 | .75 | .05 |
| Spatial granularity | Safety/conflict | .45 | .85 | .80 | .05 |
| Sensory compartmentalization | Sleep | .65 | .70 | .80 | .05 |
| Sensory compartmentalization | Hygiene/privacy | .45 | .60 | .55 | .10 |
| Sensory compartmentalization | Sensory regulation | .60 | .70 | .75 | .05 |
| Sensory compartmentalization | Legal/social communication | .30 | .55 | .45 | .10 |
| Sensory compartmentalization | Safety/conflict | .40 | .75 | .70 | .05 |
| Wet-core design | Hygiene/privacy | .55 | .90 | .75 | .25 |
| Wet-core design | Food/water | .30 | .70 | .55 | .20 |
| Wet-core design | Medical access | .45 | .80 | .70 | .05 |
| Wet-core design | Safety/conflict | .30 | .60 | .55 | .05 |
| Wet-core design | Agency/dignity | .55 | .60 | .55 | .10 |
| Daylight/orientation | Sleep | .70 | .10 | .10 | .00 |
| Daylight/orientation | Sensory regulation | .65 | .10 | .10 | .00 |
| Daylight/orientation | Temporal orientation | .90 | .10 | .10 | .00 |
| Exterior permeability | Sensory regulation | .60 | .35 | .35 | .00 |
| Exterior permeability | Movement/recreation | .70 | .40 | .35 | .00 |
| Exterior permeability | Temporal orientation | .70 | .10 | .10 | .00 |
| Acoustic refuge | Sleep | .70 | .75 | .85 | .05 |
| Acoustic refuge | Sensory regulation | .65 | .75 | .80 | .05 |
| Acoustic refuge | Legal/social communication | .35 | .55 | .45 | .10 |
| Functional adjacency | Sleep | .50 | .60 | .55 | .05 |
| Functional adjacency | Hygiene/privacy | .45 | .60 | .55 | .20 |
| Functional adjacency | Food/water | .30 | .55 | .45 | .15 |
| Functional adjacency | Movement/recreation | .45 | .55 | .45 | .00 |
| Functional adjacency | Medical access | .40 | .70 | .60 | .10 |
| Functional adjacency | Legal/social communication | .40 | .55 | .45 | .10 |
| Circulation autonomy | Hygiene/privacy | .45 | .55 | .50 | .15 |
| Circulation autonomy | Movement/recreation | .60 | .65 | .60 | .00 |
| Circulation autonomy | Medical access | .35 | .55 | .45 | .05 |
| Circulation autonomy | Legal/social communication | .40 | .55 | .45 | .10 |
| Circulation autonomy | Agency/dignity | .70 | .40 | .40 | .05 |
| HVAC resilience | Sleep | .60 | .70 | .70 | .10 |
| HVAC resilience | Sensory regulation | .55 | .75 | .70 | .10 |
| HVAC resilience | Medical access | .45 | .80 | .70 | .10 |
| Horizontal space | Sleep | .70 | .95 | .90 | .10 |
| Horizontal space | Sensory regulation | .50 | .75 | .65 | .05 |
| Horizontal space | Safety/conflict | .40 | .80 | .70 | .05 |
| Horizontal space | Agency/dignity | .60 | .70 | .60 | .05 |
| Territorial connectivity | Medical access | .30 | .45 | .30 | .10 |
| Territorial connectivity | Legal/social communication | .40 | .30 | .25 | .10 |
| Inspectability | Legal/social communication | .35 | .30 | .25 | .15 |
| Inspectability | Safety/conflict | .40 | .30 | .25 | .05 |
| Inspectability | Agency/dignity | .50 | .30 | .30 | .00 |
| Spatial differentiation | Sleep | .60 | .55 | .55 | .00 |
| Spatial differentiation | Sensory regulation | .65 | .40 | .40 | .00 |
| Spatial differentiation | Movement/recreation | .60 | .40 | .40 | .00 |
| Spatial differentiation | Temporal orientation | .60 | .20 | .20 | .00 |
| Spatial differentiation | Agency/dignity | .75 | .45 | .45 | .00 |

`baseDemand` is nonzero where a relationship matters from the first
hour regardless of duration or crowding: toilets, drinking water,
access to urgent medical care, a first phone call. It is zero where
need genuinely accrues with exposure (daylight, recreation, spatial
variety).

These numbers are **design hypotheses** for making the instrument behave
coherently. They are not research findings.

Keep them visibly editable in the data files.

------------------------------------------------------------------------

## 27. Test scenarios

Use these to validate behavior.

### Test A --- short-term holding used as intended

-   archetype: short-term holding
-   duration: 6 hours
-   population: 70% capacity

Expected:

-   sparse architecture does not automatically become red;
-   cells sensitive to long exposure remain relatively stable;
-   absence of elaborate recreation/sleep infrastructure is not heavily
    penalized at very short duration.

Measurable check: weak-but-present cells (baseline 1) in
duration-driven relationships read neutral or better (`E ≥ 0.45`).
Cells with high `baseDemand` and a low baseline (e.g. wet-core ×
hygiene at baseline 1) may already show strain. That is intended, since
a toilet matters in the first hour. The holding-space preset should
mark benches as baseline 1 for horizontal space × sleep, not 0.

### Test B --- same room becomes long-term holding

Keep architecture unchanged.

-   duration: 72 hours
-   population: 70%

Expected:

-   sleep;
-   hygiene;
-   daylight/temporal orientation;
-   spatial differentiation;
-   exterior access

move substantially toward strain.

Measurable check: with the architecture unchanged from Test A, these
cells drop by at least 0.10 in `E` (most by about 0.20), and the drop
comes almost entirely from the duration term. Hygiene moves least,
because its sensitivity is driven mainly by population.

### Test C --- occupancy shock

Start with a purpose-built form:

-   duration: 1 week
-   population: 80%

Then move population to 180%.

Expected:

-   wet-core;
-   horizontal space;
-   acoustic refuge;
-   medical access;
-   circulation;
-   safety/conflict

change more strongly than daylight/temporal orientation.

Measurable check: the listed cells drop by at least 0.25 in `E`, and
daylight × temporal orientation drops by less than 0.10.

### Test D --- soft-sided high-capacity form

Use:

-   low sensory compartmentalization;
-   weak acoustic refuge;
-   weak spatial granularity;
-   strong horizontal-space provision;
-   adequate wet-core;
-   moderate exterior access.

At low occupancy it should look contradictory rather than uniformly bad.

At high occupancy and long duration, acoustic/sensory/sleep cells should
deteriorate much faster than unrelated cells.

### Test E --- resilient form under stress

Construct a hypothetical form with:

-   small residential units;
-   excellent plumbing;
-   strong HVAC;
-   good outdoor access;
-   good daylight;
-   strong spatial differentiation.

Increase duration and population.

Expected:

-   some degradation occurs;
-   the whole grid does **not** automatically turn red;
-   strong architecture visibly buys resilience.

Measurable checks, all cells at baseline 4:

-   at 1 month / 150%, every cell stays supportive (`E ≥ 0.60`);
-   at 6 months / 200%, no cell falls below 0.45;
-   at 6 months / 300%, the most crowding-sensitive cells (horizontal
    space × sleep, wet-core × hygiene) cross into mild strain (`E <
    0.50`), while daylight × temporal orientation stays supportive.
    Strong architecture is resilient, not immune.

This test is essential. The model must be capable of representing
architectural success, not merely generating failure.

------------------------------------------------------------------------

## 28. Acceptance criteria for MVP

The first prototype is successful when:

1.  The full matrix renders from configuration data.
2.  Applicable, non-applicable, unmarked, and marked cells are visually
    distinct.
3.  A user can assign baseline support to a cell.
4.  Duration can be adjusted interactively.
5.  Population/capacity load can be adjusted interactively.
6.  Cells respond immediately and deterministically.
7.  Different cells respond differently to the same global stress.
7a. The processing module reproduces the §9.4 reference values and the
    measurable checks in §27 as automated unit tests.
8.  Duration-only-sensitive cells behave differently from
    population-sensitive cells.
9.  Long duration + high population can create nonlinear-looking
    deterioration through the interaction coefficient.
10. Strong cells can remain resilient.
11. Unmarked cells never silently become red.
12. No aggregate score is displayed.
13. Clicking a cell explains its current behavior.
14. A blank scenario can be saved/exported/imported.
15. At least three abstract archetype presets can be loaded and edited.
16. The same architecture visibly changes when only load parameters
    change.
17. The interface remains usable without relying solely on red/green
    color perception.

------------------------------------------------------------------------

## 29. What to build first

Implementation order:

1.  Define row, column, and intersection schemas.
2.  Render static matrix.
3.  Implement cell marking and baseline support.
4.  Implement duration normalization.
5.  Implement population-load normalization.
6.  Implement deterministic cell-processing function.
7.  Connect processed values to color/state rendering.
8.  Add cell inspector.
9.  Add three rough archetype presets.
10. Add local save/export/import.
11. Test the five scenarios above.
12. Only then refine visual design and add more intersections.

Do **not** spend early development time on animation, charts, facility
data, maps, citations, or elaborate presets.

The proof of concept is the transformation of the matrix under load.

------------------------------------------------------------------------

## 30. The conceptual test

When the prototype is working, it should make the following proposition
visible without requiring explanatory prose:

> The moral and experiential character of an institutional interior is
> not located in a single object such as a bunk, toilet, window, door,
> or thermostat. It emerges from relationships among those objects, the
> organization of space, the duration of exposure, the number of people
> the architecture must absorb, and the degree of control inhabitants
> possess over their environment.

More specifically, the user should be able to discover:

> A form that is tolerable for six hours may become intolerable after
> three days.

and:

> A form that works at 70% occupancy may fail at 170%.

and:

> Those failures do not occur everywhere at once.

The resulting **pattern of changing cells** is the artifact.

That pattern---not a final score---is the model.
