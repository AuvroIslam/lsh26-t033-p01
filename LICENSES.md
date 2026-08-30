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
| Plus Jakarta Sans | https://fonts.google.com/specimen/Plus+Jakarta+Sans | SIL Open Font License 1.1 | Typeface, loaded from Google Fonts |

### Icons and illustration

The twelve icon tiles in `public/icons/` and the mascot in `public/mascot.png` were supplied by the
team for this project. They were cut from the team's own source artwork during the event: each icon
was sliced from a single sheet, its background keyed out and composited onto a rounded tile, and the
mascot's white ground was made transparent. No third-party icon set, icon font or stock illustration
is used.

No starter, template or UI kit was used. The layout, the timeline and the scheduling engine were
written by the team during the event. No icon set or image asset is used; every mark on screen is a
CSS shape. The visual direction — a single floating card on a tinted ground, one amber accent
against near-navy text, and wide soft shadows — was taken as inspiration from a publicly published
dashboard concept shot; no code, asset or component from it was copied.

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
