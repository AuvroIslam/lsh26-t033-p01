# Third-Party Material and AI Disclosure

List material frameworks, libraries, starters, templates, UI kits, fonts, icons and assets used in this repository.

| Name | Version or source URL | Licence | Used for |
|---|---|---|---|
| React | 19.x — https://react.dev | MIT | User interface |
| React DOM | 19.x — https://react.dev | MIT | Rendering React to the browser |
| TypeScript | 5.9.x — https://www.typescriptlang.org | Apache-2.0 | Language and type checking |
| Vite | 7.x — https://vite.dev | MIT | Development server and production build |
| @vitejs/plugin-react | 5.x — https://github.com/vitejs/vite-plugin-react | MIT | React support in Vite |
| Tailwind CSS | 4.x — https://tailwindcss.com | MIT | Styling |
| @tailwindcss/vite | 4.x — https://tailwindcss.com | MIT | Tailwind integration with Vite |
| Vitest | 3.x — https://vitest.dev | MIT | Test runner |
| Testing Library (React, DOM) | https://testing-library.com | MIT | Interface tests |
| jsdom | https://github.com/jsdom/jsdom | MIT | Browser environment for tests |
| @types/node, @types/react, @types/react-dom | DefinitelyTyped | MIT | Type definitions |

No starter, template or UI kit was used. The layout, the timeline and the scheduling engine were
written by the team during the event. No third-party fonts, icons or image assets are used; the
interface uses the system font stack and CSS shapes only.

The published sample data in `sample-data/` and `public/` was supplied by the organisers as part of
the LofiStack Hackathon 2026 problem set.

## AI tools

- **Claude (Anthropic), via Claude Code** — used during the event window for the repository
  scaffolding, the scheduling engine in `src/domain/`, the interface in `src/components/`, the test
  suites and this documentation. The team verified the output by reading the code, running the full
  test suite including all 25 published fixture cases, and checking each of the four required items
  by hand in the running application. Also recorded in `evaluation-manifest.json`.

## Original-work statement

Everything not declared in this file or `EVENT.md` was created by the registered team during the event window.
