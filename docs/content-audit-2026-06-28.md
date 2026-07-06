# Content Audit: Remaining Work

Date: 2026-06-28. Branch: feature/nextjs-migration.

This file tracks what the website content audit found and what is still open. Pattern 1 (site-copy facts) is fixed in commit c0fcf5c. Patterns 2 and 3 remain.

Ground truth used for all checks:
- 15 published packages (14 `@termuijs/*` + `create-termui-app`). Confirmed from `packages/*/package.json`.
- 230 components in the registry. Confirmed from `website/src/data/registry.json`.
- Framework: Next.js 16. No TanStack.
- Version: 0.1.6.

---

## DONE: Pattern 1, site-copy facts (commit c0fcf5c)

- Component count reads 230 everywhere (was 16+, 80+, 230).
- Package count reads 15 everywhere (was 13, 15).
- Footer credits Next.js (was TanStack Start).
- Version reads v0.1.6 (removed v1.0 claims).
- Removed `@termuijs/charts` from the feature list (package does not exist).
- Added `adapters` and `cli` package cards in `src/data/packages.ts`.
- Wrote `content/docs/cli/overview.mdx` + `meta.json` + `src/lib/source.ts` entry.
- Cut filler ("Ready to use", "watch it run").
Files: layout.tsx, page.tsx, Hero.tsx, FeatureGrid.tsx, PackageCards.tsx, InstallBanner.tsx, CtaSection.tsx, Footer.tsx, packages.ts, source.ts, cli docs.

---

## OPEN: Pattern 3, component-page content (highest value, plan-sized)

The component detail pages render wrong data for nearly every component.

### 3a. Registry descriptions: 119 of 230 are empty stubs

- 119 descriptions read "Name component" with zero behavioral info. The source comments exist; the extractor drops them.
- Root cause in `scripts/build-registry.ts`, function `extractDescription`:
  1. The JSDoc regex requires the comment to sit directly above the export. Files with a blank line or a statement between the doc and the export fall through. Example: `Markdown.ts` has a full JSDoc (lines 14-25) but a `const segmenter` sits between it and `export class Markdown`.
  2. JSDoc binds to the wrong symbol. `QRCode.ts` JSDoc documents `QRCodePattern`; the real `QRCode` export is undocumented. `DataGrid.ts` only has member-level comments on interface fields.
  3. The 5-line fallback lookback is too small. `Carousel.ts` line 1 has a good `// Carousel — ...` comment but the export is on line 10.
- 10 worst (have usable source docs that the extractor missed): Markdown, Carousel, QRCode, DataGrid, Hexdump, ProgressCircle, Knob, Marquee, FPSCounter, DirectoryTree.
- A few files have no source JSDoc at all and need one added: FPSCounter, Clock, Code, Marquee.
- Durable fix: repair `extractDescription` (allow statements between doc and export, bind to the nearest following named export, widen the fallback). This recovers most of the 119 from existing comments. Editing `registry.json` directly is not durable for the root copy (regenerated), though the website copy is committed.

### 3b. API tables and usage snippets are fabricated

- `src/app/components/[slug]/page.tsx` has three category-generic generators: `PREVIEW`, `getUsageSnippet`, `API_PROPS`. They key only on `comp.category`, so every component in a category shows identical content.
- The API model is wrong for the whole library. The page renders a React prop API (`children`, `value`, `onChange`). The library is imperative: 114 `class X extends Widget` with `constructor(style, options)`. Zero React functional components.
- Real-vs-shown examples:
  - Badge: shown `children/style/width/height`. Real: `new Badge(text: string, style?, { variant })`.
  - Spinner: shown `message/variant/onDismiss/duration`. Real: `new Spinner(style?, { preset, label, color, active, doneText, interval })`.
  - Table: shown `items/columns/onSelect/loading`. Real: `new Table(columns | TableProps, rows?, opts?)`. No `items`, no `loading`.
  - TextInput: shown `value/onChange/placeholder/isDisabled/autoFocus`. Real: `new TextInput(style?, { placeholder, mask, maxLength, suggestions, onChange, onSubmit })`.
- Durable fix: parse each component's constructor + its `*Options` interface in `build-registry.ts`, emit `options`/signature into each registry entry, and render that instead of `API_PROPS[category]`. Category-generic data cannot be made correct.

### Priority for Pattern 3
1. Per-component API/options data (highest value, most-viewed, most wrong).
2. `extractDescription` fix to recover the 119 stub descriptions.

---

## OPEN: Pattern 2, API drift in docs (~40 findings, ~25 MDX files)

Docs reference symbols the code never exports. A reader who copies them hits errors. Verify every symbol against `packages/*/src` before editing. Run as a parallel-fix wave, one agent per package-docs group.

### widgets
- `widgets/charts-package.mdx` | HIGH | documents a `@termuijs/charts` package that does not exist. Remove the doc, or build the package. Constructors `AreaChart`/`PieChart` signatures also wrong.
- `widgets/charts.mdx` | HIGH | `LineChart`/`AreaChart`/`PieChart` constructors and option shapes do not match source. Real `LineChart(data: number[], style, opts)`; options have no `series`/`xLabels`. Whole chart sections wrong.
- `widgets/overview.mdx` | HIGH | `ProgressString` listed but not exported. Form and Calendar listed as widgets Input widgets but Form is only in `@termuijs/ui`; contradicts `inputs.mdx`. Wrong constructors: Spinner `type`/`fg`, ProgressBar `fg` (real `fillColor`), StatusIndicator `status` (real binary up/down), Gauge.
- `widgets/inputs.mdx` | HIGH | line 181 says "TermUI does not ship a Form or Calendar widget" but Calendar IS exported from `@termuijs/widgets`. Contradicts overview.mdx.
- display/feedback/layout/virtual-list: symbols verified present, no errors.

### ui
- `ui/prompts.mdx` | HIGH | `prompt.text/confirm/select` called positionally; real API takes an options object. `confirm` opt is `default` not `defaultYes`. `prompt.multiSelect` does not exist. `prompt.sort/.scale/.snippet/.quiz/.dateRange/.transfer/.email` (lines 142,158,173,194,208,224,242) none exist. Remove or implement.
- ui/overview, inputs, notifications: verified correct.

### data
- `data/overview.mdx` | HIGH | `cpu.metrics()/memory.metrics()/disk.metrics()/network.metrics()` do not exist; raw API uses getters (`cpu.percent`, `memory.raw`). Metric type shapes wrong: CpuMetrics fields are percent/perCore not usage/cores; MemoryMetrics used/total/free are formatted strings with bytes under `.raw`; NetworkMetrics fields are interfaces/ip/hostname not rx/tx.
- `data/docker.mdx` | HIGH | `docker.stats(id)` + `DockerContainerStats` do not exist. docker only exports `list()`. Remove the section.
- database/hooks/system-monitoring: verified accurate.

### jsx
- `jsx/hooks-overview.mdx` | HIGH | ~20 hooks listed but not exported: useShortcuts, useWorker, useLayoutEffect, useMount, useUnmount, useUpdateEffect, useFirstRender, useIsMounted, useDefault, useLatest, usePrevious, useEventCallback, useForceUpdate, useMediaQuery, useHover, useTransition, useDeferredValue, useI18n, useEventListener, useSyncExternalStore. The "every hook exported" claim is false. `useFocusManager` shape wrong.
- `jsx/use-motion.mdx` | HIGH | `useMotion` returns `{ reduced }` not `{ prefersReducedMotion }`. Every reference wrong.
- `jsx/focus.mdx` | HIGH | `useKeyboardNavigation` options/returns wrong. Real options `{ itemCount, loop, pageSize, onSelect }`, returns `{ selectedIndex, setSelectedIndex }`.
- `jsx/use-input.mdx` | MED | example uses `useUpdateEffect` (not exported). Use `useEffect`.
- context/error-boundary/memo/use-async/use-keymap: verified correct.

### store
- `store/api.mdx` | HIGH | `createPersistentStore`, `slices`/`SliceDef`, `createHistoryStore`/`TemporalStoreActions`, `signal`/`mutate`/`Signal`, `createLogger`/`logger` not exported. Type table lists nonexistent types. Real exports: only `createStore`, `batch`, `shallow`.
- `store/middleware.mdx` | HIGH | `createLogger`, `logger`, `createPersistentStore` sections fabricated. Custom-middleware `Middleware<T>` and `persist` option are real.
- overview/selectors: verified correct.

### tss
- `tss/overview.mdx` | HIGH | `resolveStyle('.btn', { focused: true })` wrong; real signature `resolveStyle(widgetType, className?, pseudo?: string)` (pseudo is a string, not a state object). `adaptive()` not exported. "Six themes" wrong; BUILTIN_THEMES has 12.
- `tss/themes.mdx` | HIGH | `loadThemeFromFile` not exported. "ten built-in themes" wrong; 12 exist.
- tss/tokens: verified correct.

### motion
- `motion/transitions.mdx` | HIGH | `keyframes()`, 2D vector helpers (`add/scale/lerp/distance`, `Vec2`), `pathAnimation()` not exported. Remove those sections. transition/easings/sequence/parallel/stagger verified.
- motion/springs: verified (minor filler at line 716).

### router
- `router/overview.mdx` | MED | `events.on('navigate', ...)` payload is `NavigateEvent { match, screen, direction }`, not the match. Use `event.match.route.path`. addRoute arity note.
- guards/hooks/query-strings: verified correct.

### adapters
- `adapters/overview.mdx` | HIGH | lists `RAGChat`, `useCommander` (not exported), `useShell` (only `useExeca` exists). Description also lists these.
- `adapters/ai.mdx` | HIGH | entire `RAGChat` section fabricated. useAI/LocalVectorStore/indexDirectory/chunkText verified.
- `adapters/cli-tools.mdx` | HIGH | `useCommander`/`CommanderResult` and `ensureChalkInstalled` not exported; `useShell` alias not exported. useGit/useExeca verified.
- integrations/storage: verified correct.

### testing
- `testing/overview.mdx` | MED | `getByRole`/`getByLabelText` documented as "throws if nothing matches" but implementations return `Widget | null`. Fix to "returns null".

### core
- `core/layout.mdx` | HIGH | "Constraint layout" section: `splitRect`, `length()`, `fill()`, `percentage()`, `ratio()`, `min()`, `max()` not exported. Real API is `resolveConstraints` + Constraint classes.
- `core/overview.mdx` | HIGH | lists `splitRect` as a core export; does not exist.
- screen/event-emitter/input-parser/style/unicode: verified correct.

### getting-started + guides (onboarding, accuracy critical)
- package count "15 packages" stated as 15 in some files, 13 in others. Standardize on 15. Files: installation.mdx, quick-start.mdx, architecture.mdx, termui-vs-ink.mdx, what-is-a-tui.mdx.
- `architecture.mdx` | HIGH | references `@termuijs/charts` (does not exist). Says dev-server uses `child_process.fork()`; real is `Bun.spawn`.
- `guides/dev-server.mdx` | HIGH | run command `npx termui-dev --entry` wrong; real bin is `termui dev`. `--watch <glob>` and `--debounce <ms>` are not CLI flags. "child_process.fork() via --loader tsx" wrong; uses Bun.spawn natively.
- `guides/accessibility.mdx` | HIGH | imports `meetsAA`/`meetsAAA` (not exported; use `wcagLevel`). `contrastRatio('#fff', ...)` passes plain hex but param is a Color union. `nordTheme['--text']`/`['--bg']` wrong; real keys `fg`/`bg`.
- `guides/termui-vs-ink.mdx`, `what-is-a-tui.mdx` | MED | "v1.0 ships with 5018 passing tests across 15 packages"; version is 0.1.6, count claims unverified. `fireEvent.keyPress()` should be `t.fireKey()`. `new App(Counter)` passing a component vs widget tree; verify.
- Many install snippets use `npm`; repo is bun-first. Some `ts` code fences wrap shell commands. Normalize to bun + bash.
- `guides/quick.mdx` | "Sprint 3 additions" / "v0.1.6 additions" internal headers leak into user docs. Remove.

### Writing style (low priority, prose is already clean)
- Em dashes appear mostly as table placeholder cells ("—" for "no default") and a source JSDoc house style. Not slop. Replace prose em dashes only.
- Banned marketing words are near zero across all docs.

---

## OPEN: small fixes

- `src/app/layout.tsx`: OG and Twitter `images: []` are empty. Shared links render no preview. Needs a 1200x630 og-image.
- `dev-server` package card links to `/docs/dev-server/overview` which does not exist. Pre-existing 404. Either create the doc or point the card at `guides/dev-server`.
- `adapters/overview.mdx` description string lists RAGChat/commander (part of Pattern 2).

---

## Suggested order

1. Pattern 3a + 3b: per-component API/options data + extractDescription fix. Most-viewed, most-wrong content.
2. Pattern 2: doc API-drift rewrite wave, one agent per package group, verify every symbol against source.
3. Small fixes: og-image, dev-server card link.
