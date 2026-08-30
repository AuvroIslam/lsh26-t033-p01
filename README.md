# Load-Shedding Window Planner

Solution for **LofiStack Hackathon 2026 — P01**

## Project information

- **Team:** `Logarithm`
- **Team ID:** `LSH26-T033`
- **Problem:** `P01 — Load-Shedding Window Planner`
- **Live application:** <!-- TODO: paste the deployed URL here before submitting -->
- **Demo video:** not supplied

> Judges will evaluate only the exact commit SHA entered in the Final Submission Form.

## Solution summary

A print shop plans its day around announced load-shedding. You enter the shop's opening hours and
today's power cuts, then add the jobs waiting to be done. The planner lays every job out on a
24-hour timeline so that no job needing grid power ever lands inside a cut, and reports how many
generator minutes the resulting plan costs. Everything runs in the browser with no account, no
server and no key.

## Requirements

| Requirement | Status | Where to verify |
| --- | --- | --- |
| R1 — Enter today's power cuts as a start and end time, shown on a 24-hour timeline | Complete | **Today's power cuts** panel; bars appear on the **Power cuts** row of the timeline. [`src/components/Inputs.tsx`](src/components/Inputs.tsx) → `CutsPanel`, [`src/components/Timeline.tsx`](src/components/Timeline.tsx) |
| R2 — Add jobs with a name, a duration in minutes and a power need | Complete | **Jobs** panel, with the three power needs in the dropdown. [`src/components/Inputs.tsx`](src/components/Inputs.tsx) → `JobsPanel` |
| R3 — Jobs placed automatically so grid jobs never fall inside a cut, plan shown next to the cut bars | Complete | **Planned jobs** row sits directly under the **Power cuts** row on the same scale; written plan in **The plan** panel. [`src/domain/schedule.ts`](src/domain/schedule.ts) |
| R4 — Total generator minutes shown, updating as soon as a job is added or removed | Complete | **Total generator minutes** card, top right. Recomputed from state on every change. [`src/App.tsx`](src/App.tsx), [`src/components/Timeline.tsx`](src/components/Timeline.tsx) → `GeneratorSummary` |

Each requirement also has automated tests. `npm test` runs 50 of them, including every one of the
25 published fixture cases:

```
src/domain/schedule.test.ts   R1–R4 rules, edge cases, all 25 published cases
src/App.test.tsx              the same four requirements driven through the interface
```

## How to test the application

1. Open the live application.
2. Click **Load published sample data**. The 25 published cases load and `PUB-01` is applied; pick
   any other case from the **Case** dropdown.
3. Look at the timeline. Red bars are power cuts. Directly beneath, blue bars are grid jobs — none
   of them overlaps a red bar. Amber marks the stretch of a job running on the generator.
4. Read **Total generator minutes** at the top right.
5. Remove a job in the **Jobs** panel and watch that number change immediately.
6. To check R3 by hand: add a cut of `09:00`–`11:00`, then a grid job of 60 minutes. It is placed at
   `11:00`, not inside the cut.

### Test or sample data

The published fixture is committed twice on purpose: at
[`sample-data/P01_load_shedding_public.json`](sample-data/P01_load_shedding_public.json) as the
record of what was supplied, and at `public/` so the deployed app can load it with one click.

**Judges' own cases:** use **Upload JSON** and pick any file in the published `P01` shape. Unknown
extra keys are ignored, and a case that cannot be read is skipped with a warning rather than
failing the whole file, so a file with 25 good cases and one broken one still loads.

**Reset:** the **Reset** button in the **Sample data** panel clears everything back to an empty
planner with `09:00`–`21:00` working hours. State is kept in `localStorage` under
`lsh26-t033-p01/state/v1`; clearing site data has the same effect.

## Run locally

### Requirements

- Node.js 20.19+ or 22.12+ (built on Node 24)
- No database, no API key, no environment variables, no paid account

### Setup

```bash
git clone https://github.com/AuvroIslam/lsh26-t033-p01.git
cd lsh26-t033-p01
npm install
npm run dev        # http://localhost:5173
```

```bash
npm test           # 50 tests
npm run build      # type-check and produce dist/
npm run preview    # serve the production build
```

## Problem-solving approach

**Understanding the problem.** The four items are really one scheduling rule plus a number derived
from it. The rule is a hard constraint — a grid job must not touch a cut — and the number, total
generator minutes, is the cost of the plan. Everything else is presentation.

**The chosen solution.** All scheduling lives in [`src/domain/`](src/domain/) as plain TypeScript
functions with no React in them, so the rules can be tested directly and read by a judge without
running anything. The interface holds only the cuts, the jobs and the working hours; the plan is
derived from that on every render and never stored. That is why the generator total in R4 cannot
drift out of step with what is on screen — there is no second copy of it to go stale.

**The most important decision.** Jobs are placed most-constrained first: grid jobs, then
generator-capable jobs, then jobs needing no power. Grid jobs have the least freedom, so they get
first choice of cut-free time. Jobs needing no power are deliberately parked *inside* cuts, because
a cut costs them nothing and it keeps scarce cut-free time available for jobs that need it. A
generator job takes the slot that overlaps the cuts by the least, rather than simply the earliest
slot, since that overlap is exactly the number R4 reports.

**Testing.** The rules a plan must always obey — no grid job inside a cut, no two jobs overlapping,
every placement the length its job asked for, generator minutes equal to time actually spent inside
a cut — are asserted as one shared check, then run against hand-written cases and against all 25
published cases. The interface is tested separately through the DOM. Writing the tests first found
a real defect: the planner had been giving a generator job the earliest slot instead of the
cheapest, inflating the R4 total.

## Technology used

- **Frontend:** React 19, TypeScript 5.9
- **Backend:** none — the app is entirely client-side
- **Database:** none — state is held in the browser's `localStorage`
- **Build and test:** Vite 7, Vitest 3, Testing Library, jsdom
- **Styling:** Tailwind CSS v4
- **Deployment:** <!-- TODO: name the host once deployed -->

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

<!-- TODO: replace each contribution with what that member actually did. -->

| Registered member | GitHub username | Major contribution | Evidence |
| --- | --- | --- | --- |
| Oitijya Islam Auvro | `AuvroIslam` | <!-- TODO --> | <!-- TODO --> |
| Md. Nafiz Ahmed | `Nafiz001` | <!-- TODO --> | <!-- TODO --> |
| Dewan Salman Rahman Zisan | `ripWr3ncH` | <!-- TODO --> | <!-- TODO --> |

Commit count alone does not represent contribution.

## AI usage

- **Claude (Anthropic), via Claude Code** — used during the event window for the repository
  scaffolding, the scheduling engine, the interface and the tests. Verified by the team by reading
  the code, running `npm test` against all 25 published cases, and checking the four requirements by
  hand in the running application.

## Major design decisions

- **One worktop.** Jobs run one at a time and never overlap. The problem gives a single timeline and
  no count of machines or staff, so assuming parallel capacity would invent a resource that was
  never specified.
- **Jobs are not split.** A 90-minute job needs 90 uninterrupted minutes. Splitting a print run
  around a power cut is not something a shop can generally do, and nothing in the problem permits it.
- **Generator minutes are the minutes actually spent inside a cut.** A generator-capable job on
  mains costs nothing; it only draws on the generator while the grid is down. Counting its whole
  duration would overstate fuel and make R4 meaningless as a cost.
- **An unplaceable job is reported, not hidden and not placed illegally.** The published data
  contains jobs that genuinely cannot fit — `PUB-01` has a 270-minute grid job whose longest
  cut-free gap is 255 minutes. Such a job is listed under **Could not be scheduled** with the reason
  and the size of the largest gap that was available.
- **The plan is derived, never stored.** R4 asks for a number that updates as soon as a job changes;
  deriving it removes any chance of it lagging behind.
- **Cuts are merged and clamped.** Overlapping or touching cuts become one outage, and the parts of
  a cut falling outside opening hours are dropped, so they cannot distort the plan.

## Known limitations

- **The scheduler is greedy, not exhaustive.** It places jobs in a fixed, well-argued order rather
  than searching every arrangement. On the published cases it places everything that can fit, but on
  an adversarial input a different order could in principle fit one more job or shave a few
  generator minutes. An exact search is exponential and was not worth the event time.
- **No drag to reposition.** The plan is computed; a user cannot nudge a job by hand.
- **One day at a time.** A cut entered as overnight (`22:00`–`02:00`) is split correctly, but the
  planner models a single day and does not carry work into tomorrow.
- **No printing or export.** The plan is on screen only.
- **State is per browser.** `localStorage` is not shared between devices, and a private window
  starts empty.

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
