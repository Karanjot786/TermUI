# TermUI Roadmap

This file shows where TermUI is, what is in progress, and what comes next. Use it to find work that fits your skill level.

Full version with details: [Roadmap wiki page](https://github.com/Karanjot786/TermUI/wiki/Roadmap).

## Current state (v0.1.x)

TermUI ships a working core today:

- Layout engine with flexbox and constraint rules
- Differential renderer. Only changed cells redraw.
- JSX runtime and React-style hooks
- 14 packages, 600+ tests passing
- Theming, animations, routing, hot-reload dev server
- 40+ widgets and a headless test harness

## Where work stands

| Wave | Focus | Status |
|---|---|---|
| Wave 1 | Core widgets | Merging now |
| Waves 2 to 4 | Capabilities, adapters, prompts, registry, templates | All assigned |
| Wave 5 | Coverage and polish | Open and claimable |
| Wave 6 | New widgets | Open and claimable |
| Wave 7 | Hooks and core depth | Open and claimable |
| Wave 8 | Subsystem depth | Open and claimable |
| Waves 9 to 10 | DX and differentiators | Planned |

Waves 5 to 8 are open right now with 55 unassigned issues across all skill levels. Browse [open good first issues](https://github.com/Karanjot786/TermUI/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee) or the [project board](https://github.com/users/Karanjot786/projects/2). Comment "I would like to work on this" to claim one. You hold at most 2 open issues at a time.

## Wave 5: Coverage and polish (beginner, no feature code)

- Tests for untested code: `dev-server` and `testing` have zero tests; `ui` has 9 untested components; `widgets` has 12.
- Examples not built yet: forms-and-validation, multi-screen-router, ai-streaming, auth-flow, cli-wrapper-live.
- Docs: "Choosing your API" guide, `DEVELOPMENT.md`, expanded thin READMEs.

## Wave 6: New widgets (beginner to intermediate)

DatePicker, TimePicker, ColorPicker, Slider, RangeInput, Autocomplete, SearchableSelect, TreeTable, MultilineTextInput, SegmentedControl, Carousel, ContextMenu.

## Wave 7: Hooks and core depth (intermediate)

useReducer, useLayoutEffect, useId, useImperativeHandle, Suspense, lazy(), Portal, clipboard read and paste, wide-character fallback.

## Wave 8: Subsystem depth (intermediate to advanced)

- Store: middleware, persist, computed selectors, immutable helpers
- Motion: keyframes, custom easing, chained sequences, 2D vectors
- Router: lazy routes, guards, nested routes, query strings, param validation
- TSS: nesting, mixins, color functions, pseudo-class states, imports
- Data: WebSocket, REST client, caching, time-series history

## Wave 9: Developer experience (intermediate to advanced)

Error overlay, theme hot reload, devtools inspector UI, snapshot testing, accessibility test queries, VS Code snippets, scaffold improvements.

## Wave 10: Strategic differentiators (advanced, mentor-led)

Command palette v2, web serving, plugin architecture, full styling system, demo recording tool, interactive playground and gallery. Each starts as an RFC.

## How to pick work

1. Open the [project board](https://github.com/users/Karanjot786/projects/2).
2. Filter by difficulty label.
3. Read the issue. Comment "I would like to work on this".
4. Wait for assignment, then open your PR within 7 days.

You hold at most 2 open issues at a time. Open and merge a PR from one before you claim a third.

Found a gap not on this roadmap? Open a new issue. New ideas are welcome.

## Open RFCs

- [Adapters package bootstrap](https://github.com/Karanjot786/TermUI/issues/58)
- [Component registry design](https://github.com/Karanjot786/TermUI/issues/59)
- [Mouse support architecture](https://github.com/Karanjot786/TermUI/issues/60)
