# Load-Shedding Window Planner — LSH26-T033 / P01

- **Team ID:** `LSH26-T033` (Logarithm)
- **Problem ID:** `P01` — Tier 01, Load-Shedding Window Planner
- **Live URL:** <!-- TODO: paste deployed URL before submitting -->
- **Repository:** `lsh26-t033-p01`

## Setup and run

<!-- TODO: fill in once the stack is committed -->

```bash
npm install
npm run dev      # local development
npm run build    # production build
```

Requires Node 20+. No API keys or environment variables are needed for this project.

## Proof that each required item is met

| # | Required item | Where it lives | How to verify |
|---|---|---|---|
| 1 | User enters today's power cut times as start/end and sees them on a 24-hour timeline | TODO | TODO |
| 2 | User adds jobs with a name, a duration in minutes, and a power need (`grid` / `generator` / `none`) | TODO | TODO |
| 3 | Jobs are placed automatically so `grid` jobs never fall inside a power cut, shown next to the cut bars | TODO | TODO |
| 4 | Total generator minutes is shown and updates immediately when a job is added or removed | TODO | TODO |

## Sample data

`sample-data/P01_load_shedding_public.json` — 25 public cases (`PUB-01` … `PUB-25`), schema 2.1.
Each case has `shop_open`, `shop_close`, `cuts[]` (`start`/`end`) and `jobs[]` (`name`, `minutes`,
`power` ∈ `grid|generator|none`). All times are 24-hour `HH:MM` on 15-minute boundaries.

## Major decisions

<!-- TODO: scheduling strategy, how generator minutes are counted, what happens when a job does not fit -->

## Known limitations

<!-- TODO -->

## Approach

<!-- TODO: a short statement of how the team approached the problem -->

## Team contributions

| Member | GitHub username | Major contribution |
|---|---|---|
| Oitijya Islam Auvro (lead) | TODO | TODO |
| TODO | TODO | TODO |

## Disclosures

- **Pre-event material:** none. See [EVENT.md](EVENT.md).
- **Third-party material:** see [LICENSES.md](LICENSES.md).
- **AI assistant use:** Claude (Anthropic) was used during the event for scaffolding, implementation
  and review. All work was directed, reviewed and accepted by the team.
