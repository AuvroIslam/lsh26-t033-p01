# Load-Shedding Window Planner

Solution for **LofiStack Hackathon 2026 — P01**

## Project information

- **Team:** `Logarithm`
- **Team ID:** `LSH26-T033`
- **Problem:** `P01 — Load-Shedding Window Planner`
- **Live application:** <!-- TODO: deployed URL -->
- **Demo video:** Optional link, maximum three minutes

> Judges will evaluate only the exact commit SHA entered in the Final Submission Form.

## Solution summary

<!-- TODO: 2-4 sentences on what the app does and who it helps. -->

## Requirements

| Requirement | Status | Where to verify |
| --- | --- | --- |
| R1 — Enter today's power cut times as start/end and see them on a 24-hour timeline | Not attempted | <!-- TODO --> |
| R2 — Add jobs with a name, duration in minutes and a power need (grid / generator / none) | Not attempted | <!-- TODO --> |
| R3 — Place jobs automatically so grid jobs never fall inside a cut; show the plan beside the cut bars | Not attempted | <!-- TODO --> |
| R4 — Show total generator minutes, updating as soon as a job is added or removed | Not attempted | <!-- TODO --> |

## How to test the application

1. Open the live application.
2. <!-- TODO -->

### Test or sample data

The published fixture is committed at [`sample-data/P01_load_shedding_public.json`](sample-data/P01_load_shedding_public.json)
(25 cases, `PUB-01`–`PUB-25`, schema 2.1). A case supplies `shop_open`, `shop_close`, `cuts[]`
(`start`/`end`) and `jobs[]` (`name`, `minutes`, `power` ∈ `grid|generator|none`). Times are 24-hour
`HH:MM` on 15-minute boundaries.

<!-- TODO: how to load a case, how to enter data by hand, how to reset. -->

## Run locally

### Requirements

- <!-- TODO: runtime and version -->

### Setup

```bash
git clone https://github.com/AuvroIslam/lsh26-t033-p01.git
cd lsh26-t033-p01
# TODO: install command
# TODO: run command
```

No API keys or environment variables are required for this project.

## Problem-solving approach

<!-- TODO: how the team understood the problem; the chosen solution; the most important
     technical decision; how the solution was tested. -->

## Technology used

- **Frontend:** <!-- TODO -->
- **Backend:** <!-- TODO -->
- **Database:** <!-- TODO -->
- **Deployment:** <!-- TODO -->
- **Other material tools:** <!-- TODO -->

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence |
| --- | --- | --- | --- |
| Oitijya Islam Auvro | `AuvroIslam` | <!-- TODO --> | <!-- TODO --> |
| Md. Nafiz Ahmed | `Nafiz001` | <!-- TODO --> | <!-- TODO --> |
| Dewan Salman Rahman Zisan | `ripWr3ncH` | <!-- TODO --> | <!-- TODO --> |

Commit count alone does not represent contribution.

## AI usage

- **Claude (Anthropic), via Claude Code** — used for repository scaffolding, implementation and
  review during the event window. Output was read, tested against the published fixture and accepted
  by the team.

## Major design decisions

- **Decision:** <!-- TODO: scheduling strategy and why -->
- **Decision:** <!-- TODO: how generator minutes are counted -->

## Known limitations

- <!-- TODO -->

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
