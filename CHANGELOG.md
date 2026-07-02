# Changelog

All notable changes to TermUI are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

---

## [0.1.7] - 2026-06-29

A CLI for copy-paste component installs, a real component registry, live previews for all 230 components, and an SEO/GEO pass on the docs. 253 commits from 35 contributors. No breaking changes.

### Added

#### @termuijs/cli (new package)
- `termuijs list` command with an interactive picker (dogfoods the `@termuijs/widgets` List).
- `termuijs add <component>` copies real source into your project, with path-safety, a registry resolver, package-manager detection, and dependency install.
- Argument parser and command router scaffold.

#### Component registry
- `build-registry` extracts each component's real constructor signature and options props (resolves `extends`, union params, inline object-literal options, `*Props` types, multiline-comment args, per-field descriptions).
- Emits per-component files plus their dependencies for copy-source installs, and a committed slim registry deduped by slug.
- Published to `/r/<slug>.json` so `termui.io` serves the registry.

#### @termuijs/jsx
- Publish the feedback API to npm: `useFeedback`, `triggerFeedback`, `AUDIBLE_FEEDBACK_TYPES`, and the `FeedbackType` type.
- Publish the package-manager helpers: `usePackageManager`, `detectPackageManager`, `getPackageManagerCommands`.

### Fixed

- Docs site (`termui.io`) builds standalone against the published packages instead of only resolving via the workspace.
- JSX live demos rendered blank: give the reconciled root `flexGrow` and width so it fills the wrapper.
- `empty.js` browser stub converted to ESM (the site is `type: module`, so the CJS `module.exports` failed under Turbopack).

### Internal

- Re-publish all 14 library packages in lockstep at `0.1.7`. The published `0.1.6` predated the new `@termuijs/jsx` exports, which broke the docs build against the registry.
- Split the documentation site into its own repository (`TermUI_Docs`); untracked `website/` from the main repo.

### Contributors

35 contributors made commits in this release. Thank you to:

@Karanjot786 @jainiksha @srushti-panara @ionfwsrijan @Harshithk951 @realtushartyagi @ZainabTravadi @pradeep0153 @anshika1179 @pranvxag @knoxiboy @RosheshChaware @atul-upadhyay-7 @RitikOnWork @KrutagyaKaneria @riddhima25bet10005-a11y @pixeltannu @hrx01-dev @Vartika-l7 @Akshith-cdr @theblag @prasannaPratapSingh @palak170306-design @nidhib08 @namrarafique93-del @kotebhakti30 @i-OmSharma @harsh0028-boop @divyanshisrivastava395 @bhumindeshpande8-spec @VirenSumbly @Vaibhavi-1107 @Satvik-art-creator @DivyanshSaharan @Aryan-Agarwal-creator

---

## [0.1.6] - 2026-06-15

72 new widgets, 35 new hooks, fixes across 14 packages, contributed by 162 developers.

### Added

#### @termuijs/core
- Add visible focus ring support
- Add setCursorShape via DECSCUSR
- Add horizontal scroll-wheel events
- Add mouse modifier keys to MouseEvent
- Add mouse double-click and drag synthesis
- Add mouse hit-grid and target dispatch
- Wire bracketed-paste into Terminal
- Add terminal bell and OSC notification API
- Add OSC 8 hyperlink cell support
- Add directional 2D spatial focus navigation
- Add keychord and sequence binding
- Add render profiling hooks
- Add cursor position request parser to input parser
- Add incremental diff renderer
- Add RenderHook to buffer stdout during active rendering
- Add render-loop benchmark and CI regression check
- Add wide-character and emoji fallback in the renderer
- Add layout cache dirty-flag system
- Add debounce utility
- Add prefersReducedMotion() helper, honours NO_MOTION/CI in animated widgets
- Add screenMode support for alternate, main, and inline rendering
- Add clipboard read/paste support and wide-char fallback
- Add LiveRender cursor positioning
- Implement constraint-based layout engine with Pos and Dim algebra
- Add shouldUseColor/prefersHighContrast helpers, update motion widgets to use prefersReducedMotion

#### @termuijs/widgets
- Add Pty terminal multiplexer widget
- Add Stepper widget for sequential step progress display
- Add Accordion widget for grouped collapsible sections
- Add Avatar widget
- Add Watermark widget
- Add Placeholder widget
- Add Canvas 2D drawing widget
- Add StackedBarChart widget
- Add Histogram widget
- Add BrailleCanvas
- Add PinInput widget for capturing discrete code sequences
- Add Highlight component
- Add Carousel display widget
- Add GanttChart widget for displaying timelines
- Add RangeInput widget
- Add Knob widget for circular value input
- Add Breadcrumbs widget
- Add BulletChart widget
- Add LoadingDots widget
- Add ShortcutBar widget
- Add PieChart widget
- Add DataGrid component with 2D virtualization and sorting
- Add sort and filter to DataGrid
- Add scroll acceleration support
- Add Hexdump widget
- Add advanced form controls for user input
- Add Dock widget
- Add Rule widget
- Add Fill widget
- Add Meter widget
- Add TaskList widget
- Add OrderedList widget
- Add Timer and Stopwatch display widgets
- Add Stack widget
- Add Marquee widget
- Add Timeline widget
- Add Code widget
- Add Callout widget
- Add Stat widget
- Add Kbd widget
- Add EmptyState widget
- Add Masonry widget
- Add CandlestickChart widget
- Add AreaChart widget
- Add ScatterPlot widget
- Add RadarChart widget
- Add SplitPane widget
- Add Divider widget for horizontal and vertical section separation
- Add NotificationBadge widget
- Add Badge and Tag widgets
- Add Markdown widget
- Add Tooltip widget
- Add ProgressString widget
- Add ProgressCircle widget
- Add BigText unicode support
- Add Form component
- Add useListState and useTableState hooks
- Add Digits widget with ASCII art rendering
- Add TreeTable widget
- Add DirectoryTree widget
- Add Collapsible widget
- Add AspectRatio widget
- Add Typewriter widget
- Add Skeleton widget (refactored)
- Add Calendar widget
- Add Clock widget
- Add ScrollView widget
- Add maxLines option to LogView to prevent unbounded memory growth
- Add multi-line rich text editor widget

#### @termuijs/ui
- Add TagInput widget
- Add Popover widget
- Add Combobox widget
- Add Listbar widget
- Add Menu widget
- Add Breadcrumb component
- Add Slider and RangeInput widget
- Add Switch widget
- Add DateRangePicker widget
- Add Transfer widget
- Add EmailInput widget
- Add RadioGroup widget with keyboard navigation and disabled option support
- Add TreeSelect widget with single and multi selection
- Add TextArea widget
- Add ButtonGroup widget
- Add AppShell component
- Add file-manager template
- Add FilePicker widget
- Add Drawer widget with focus trap and edge positioning
- Add Pages and ContentSwitcher widgets
- Add SegmentedControl widget
- Add Wizard widget
- Add MaskedInput widget
- Add Disclosure widget with unicode fallback
- Add BasicAuthPrompt widget
- Add keyboard shortcut help overlay
- Add accessible linear prompt rendering
- Add SortPrompt component
- Add Checkbox and CheckboxGroup widgets
- Add ScalePrompt widget
- Add MenuBar widget with dropdown and key navigation
- Add SnippetPrompt component
- Add QuizPrompt widget
- Add ThemeSwitcher widget
- Add SearchInput component
- Add Rating widget
- Add screen reader announcement to Toast
- Export external stylesheet engine globally
- Add standard schema validation helper and form support
- Add Escape key support to ConfirmDialog
- Improve Todo CLI layout and UX

#### @termuijs/jsx
- Add useWorker hook with exclusive group cancellation
- Add useEventListener hook
- Add useTimeout and useInterval hooks
- Add useMediaQuery hook
- Add useFocusWithin hook
- Add useClipboard hook
- Add useCountdown hook with start, pause, and reset controls
- Add useStopwatch hook with start, pause, and reset controls
- Add useThrottle hook
- Add useDebounce hook
- Add useMount hook
- Add useLatest hook
- Add useBoolean hook
- Add useMap hook
- Add useList hook
- Add useSet hook
- Add useToggle hook with tests and docs
- Add useUpdateEffect hook
- Add useUnmount hook
- Add useIsMounted hook
- Add useDefault hook
- Add useForceUpdate hook
- Add useFirstRender hook
- Add useTransition hook
- Add Suspense and lazy support
- Add useSubprocess hook
- Add useSyncExternalStore hook
- Add useDeferredValue hook
- Add useId hook
- Add useImperativeHandle hook
- Add createPortal helper
- Add useLayoutEffect hook
- Add useTerminalSize hook
- Add useEventCallback hook
- Add style prop to text intrinsic element type and extractStyle
- Support event delegation with from prop

#### @termuijs/store
- Add mutate() helper for in-place signal mutations
- Add slices helper for composing store from named slice definitions
- Add createLogger middleware
- Add computed selectors to store
- Add middleware support for createStore
- Add store reset to initial state
- Add temporal history middleware to store
- Add store persist plugin

#### @termuijs/testing
- Add snapshot diff reporter
- Add pressKey, pressKeys, and getOutput helpers
- Add getByRole and getByLabelText queries
- Add queryAllByText/queryAllByType
- Add frameSerializer, queryByText, and queryByType
- Add createFixture helper
- Add createVirtualClock() for synchronous timer tests
- Add fireResize helper

#### @termuijs/tss
- Add ThemeProvider singleton for runtime theme switching
- Add :hover, :focus, :disabled pseudo-classes
- Add semantic theme derivation from Normal color pair
- Add calc expression parser
- Add lighten, darken, alpha color functions
- Add mixin support with @mixin and @include directives
- Add size media queries
- Add @import support
- Add adaptive() helper and caps.background
- Add runtime CSS variable overrides
- Support loading themes from JSON and YAML files
- Add nested rule support to parser and compiler
- Add high contrast theme
- Add Rosé Pine built-in theme
- Add Tokyo Night built-in theme
- Add gruvbox built-in theme
- Add Solarized built-in light and dark colour themes
- Add dracula theme

#### @termuijs/motion
- Add animated layout transitions
- Add interpolate and mapRange helper
- Add spring presets
- Add path animation helper
- Add 2D vector helper utilities for position animations
- Add keyframe animations
- Add chained and parallel animation sequencing
- Add stagger helper
- Add cubicBezier easing function
- Add repeat and yoyo animation modes

#### @termuijs/router
- Add notFound route handler
- Add declarative redirect rules
- Add query string parsing to router
- Add forward navigation and multi-step go history tracking
- Add lazy route options and guard hooks
- Add route meta fields
- Add param validation
- Add useParams and useNavigate hooks
- Add Router.isActive() method

#### @termuijs/data
- Add Docker monitoring provider and useDocker hook
- Add database connection pool monitoring provider
- Add systemd service and process supervisor monitoring provider
- Add pause/resume/refresh to usePolling
- Add PATCH, reset(), mutationCount to useMutation
- Add key parameter to useFetch options to trigger refetches
- Add useInfiniteQuery hook
- Add useSSE hook
- Add useGpu hook
- Add useBattery hook
- Add useFileWatch hook
- Add useTemperature hook
- Add useWebSocket hook
- Add useMutation hook
- Add response caching with invalidation for useFetch
- Add retry with exponential backoff to useFetch

#### @termuijs/dev-server
- Add ThemeWatcher for .tss file changes
- Add error overlay
- Add reload notification banner

#### @termuijs/quick
- Add modifier-aware keybindings
- Add tabs and select interactive shorthands
- Add stack and spacer layout builders
- Re-export batch() from @termuijs/store

#### @termuijs/adapters
- Add useExeca and useShell hooks
- Add localStorage adapter
- Add useConf adapter
- Add useCommander adapter hook
- Bootstrap @termuijs/adapters package
- Add useKeychain adapter
- Add Git adapter
- Add GitHub adapter using Octokit REST API
- Add useDotenv adapter implementation
- Add chalk adapter
- Add zod validator adapter
- Add local RAG vector store and interactive RAGChat widget

#### @termuijs/create-termui-app
- Non-interactive mode with --yes flag
- Add component registry command
- Add ai-assistant template
- Add minimal cli-tool template
- Add dashboard template
- Add rest-client template
- Add forms-and-validation example template

### Fixed

#### @termuijs/core
- Fix FocusManager orphan focus events on unregister and deferred subscription
- Eliminate render pipeline race condition: move dirty check inside deferred callback, add epoch guarding and mutual exclusion to swap
- Adjust wide-character continuation cells in differential renderer
- Replace stdout hijack with console wrapping, add writeSync, remove suspend/resume race condition
- Re-schedule render if widget becomes dirty during render cycle
- Re-layout grandchildren when non-dirty node dimensions change
- Log swallowed exceptions in EventEmitter and recover Renderer flush failures
- Fix multi-byte UTF-8 input corruption by using code point iteration and raw Buffer for escape buffer
- Remove isDirty early return in requestRender to prevent state change drops
- Fix Terminal restore re-entrancy guard
- Add ANSI escape injection sanitization to Screen and Renderer
- Correct border offset in LayoutEngine: use 1 not 2 for innerX/innerY
- Advance cursor by stringWidth in LayerManager.writeString for wide char support
- Defer SIGINT and SIGTERM cleanup until write queue drains
- Normalize hex color case in colorsEqual and style fingerprint
- Skip wide-char continuation cells in _renderDiffLine dirty detection
- Handle bracketed paste in clipboard read
- Detect style-only line changes in diff renderer
- Resolve mount() promise when unmount() is called directly
- Reject and clear pending cursor requests on InputParser.stop()
- Use full border width for inner content offset in LayoutEngine to prevent child widgets overlapping border
- Reset _previousLines on Screen.resize() to prevent stale diff renderer state after terminal resize
- Preserve ANSI codes in truncate
- Remove duplicate stripAnsiControl export
- Correctly parse split CSI escape sequences

#### @termuijs/widgets
- Export ContextMenu, Fill, SplitPane, ThinkingBlock, Collapsible, Digits, DirectoryTree, UnorderedList, Rule
- Replace .slice with truncate in Banner, Alert, Breadcrumbs
- Replace .length/.slice with stringWidth/truncate for unicode correctness in ProgressBar, Callout, Spinner
- Use lowercase key names in ToolCall and remove dead arrowup/arrowdown branches in KeyValue
- Handle keyboard input when focused in TextInput
- Handle ProgressBar edge cases at 0% and beyond bounds
- Fix CandlestickChart runtime crash from incorrect setCell API usage
- Align Tree handleKey with core KeyMap canonical key names
- Align ScrollView key names with core KeyMap canonical names
- Mark TextInput dirty after state mutations
- Add Widget.destroy() lifecycle and fix reconciler fiber cleanup
- Remove duplicate RangeInput export from index
- Use stringWidth for icon column offset in Alert
- Fix TypeScript Color type error in TreeTable
- Standardize constructor signatures: Badge/Tag overloads, Modal/Select style param
- Support custom Banner padding
- Mark LogView dirty on scroll
- Remove duplicate Meter class declaration and add missing setLabel
- Align Table.handleKey signature with KeyEvent API
- Remove duplicate and non-existent TextInputProps export
- Export useListState and ListState from index

#### @termuijs/ui
- Rewrite Disclosure._renderSelf using screen.writeString, truncate, and null-rect guard
- Wire form keyboard input to event system
- Guard tab navigation when tabs array is empty
- Use _getContentRect and remove stale exports
- Fix prompts.test.ts isTTY spy in non-TTY env and Gradient alignment in no-color path
- Resolve CodeRabbit issues in EditablePrompt

#### @termuijs/jsx
- Fix reconciler memory leak: add destroyFiber in error paths, reverse fiber-to-widget map, portal staleness guard
- Remove console.error/warn from reconciler and hooks
- Add .js extension to hook imports for ESM resolution
- Export missing hooks from package entry point
- Fix vnode.key for fiber identity to prevent state reuse
- Clear global _instanceMap on resetHooksGlobals
- Trigger re-renders on context consumers when Provider value changes
- Restore parent fiber context before reconcile in reRenderComponent
- Reconcile Suspense fallback VNode into Widget
- Re-queue pending fibers when _requestRender is unset during flush
- Clean up fiber state when error boundary catches render error
- Route Suspense through renderComponent for correct fiber context
- Render portal children in correct fiber context during render phase
- Prevent null dereference in _pruneInstancesForWidget and add dirty propagation tests
- Scope memo() cache per fiber instance to prevent shared cache bug
- Move setIsRunning out of setCount updater in useCountdown to prevent re-entrant scheduleRender

#### @termuijs/store
- Memoize useStore selector: skip re-render when selected value unchanged
- Export real logger from logger.ts instead of no-op stub in store.ts
- Support asynchronous batch functions and fix early rendering
- batch() rollback on throw
- Add dispose() to Computed to prevent subscription memory leak

#### @termuijs/testing
- Fix fireResize stale screen closure using mutable screenRef
- Flush state synchronously in fireKey and fix rerender props

#### @termuijs/tss
- Map border-color to borderColor, add recursive var resolution, preserve overrides on load
- Prevent path traversal in resolveImports

#### @termuijs/motion
- Import VirtualClock from virtual-clock.ts, guard layout-transition onComplete docs
- Change .ts import extensions to .js in path.test.ts for ESM
- Preserve timer subscriptions across VirtualClock inject/detach cycle

#### @termuijs/router
- Fix _applyInitialPathIfPending: push unconditionally so notFound fires
- Apply beforeEnter guards, afterEnter hooks, and redirect resolution to back() and forward()
- Resolve initialPath on startup via deferred _navigateTo

#### @termuijs/data
- Remove console.warn from WebSocket hook
- Buffer partial lines across chunk boundaries in tail()
- Replace shell exec with execFile/readFileSync to prevent shell injection

#### @termuijs/dev-server
- Replace console.log with process.stdout.write via log() helper
- Correct FileChange.type in tests and await child exit before HMR respawn
- Avoid debounce collisions across watched directories
- Fix mock leakage in watcher.test.ts for vitest 4.x

#### @termuijs/quick
- Expose onError callback, fix flexGrow test assertion

#### @termuijs/charts
- Use dts.resolve to emit type declarations for re-exported widgets

#### @termuijs/adapters
- Set _loading=true before first await in RAGChat to prevent re-entrant queries
- Correct Anthropic model ID from claude-haiku-4-5-20251001 to claude-haiku-4-5
- Use require() instead of createRequire for dotenv resolution

#### @termuijs/create-termui-app
- Replace import.meta.main with process.argv check
- Use ReturnType<typeof spawn> instead of any in procRef template
- Replace startsWith path check with relative() to prevent path traversal
- Validate project name to prevent path traversal
- Remove dead rest-client code and fix uppercase key names in templates
- Resolve Windows path validation failure

### Performance

#### @termuijs/core
- Optimize render pipeline: in-place cell mutation, style tracking, cell-level diffing, transparent run skipping
- Add layout caching with dirty-flag and resize awareness

#### @termuijs/widgets
- Avoid redundant markDirty calls in EmptyState, Callout, and StatusMessage
- Avoid redundant markDirty calls in Gradient, Digits, Tooltip, Badge, Rule, BigText, and NotificationBadge

#### @termuijs/ui
- Avoid redundant Combobox invalidation

### Tests

- 28+ new test files added across all packages; overall test count grew substantially from the 600 baseline
- Core: resize redraw regression, ConstraintLayout, render-loop benchmark, KeyMap, ANSI utility, and symbol unit tests
- Widgets: comprehensive TextInput, Skeleton, BigText, Gradient, Banner, Scrollbar, ScrollView, BarChart, ProgressBar, and Gauge coverage; placeholder assertions strengthened across charts and layout widgets
- JSX: createPortal, ErrorBoundary, useFocusTrap, useFocus, useKeyboardNavigation, and lazy loader tests
- Router, motion, adapters, ui, testing harness, and create-termui-app all received new or expanded test suites

### Documentation

- Add CONTRIBUTING.md with setup and PR guidelines, beginner setup guide, common errors, and PR checklist
- Add architecture overview, data-fetching guide, and "Choosing your API" guide
- Add ROADMAP.md and expand roadmap with waves 5-10 plus a v2 plan
- Expand router, motion, store, and dev-server READMEs with options tables, performance notes, and troubleshooting guides
- Add descriptive JSDoc comments to core terminal layout utilities
- Add table of contents to main README and a contributors section with contrib.rocks grid
- Add Bun installation instructions and TermUI code snippets for VSCode
- Add animation guide for @termuijs/motion
- Draft mouse support design RFC

### Internal

- Remove console.log statements from all source files
- Add format script for codebase styling consistency
- Explicitly define module distribution type in root package.json
- Expand cross-platform rules in .gitignore
- Improve type safety across store, layout widgets, and Progress widgets
- Replace deprecated constructor signatures in Badge and Tag
- Replace default export with named export in ShortcutHelpOverlay
- Remove deprecated security analysis and vulnerability demonstration documents
- Use node:fs and node:path imports in @termuijs/ui
- Move any[] and as-any cast comments inline across packages

### Contributors

162 contributors made commits in this release. Thank you to:

ANSHIKA, ARPANPATRA111, Aaditya Saraswat, Aaditya Yadav, Aanya, Aavishkar Chaudhari, Abhijnyan Saikia, Abhik Mudi, Abhishek Awasthi, Adila Jaleel, Aditya, Aditya A, Akanksha Thakur, Akshita, Althafdudekula, Anant Tirupati, Anchalll_02, Anirudh Agarwal, Anjali Kumari, Anmol Patel, Anshul Saxena, Anunay Anumasa, Anushkaaa-09, Arpan Patra, Arsalaan, Aryan Agarwal, Aryan-Agarwal-creator, Astha Singh, Ayush Aryan, Ayush2006385, B RAVI CHANDRA, BHANU PRATAP SINGH, Biswajit Nayak, Chakshu Bamotra, CoderPrateek971, DIPIKA VAMAN KANTAPPA POOJARI, Debangana Dutta, DivyaShreeS09, Divyansh Saharan, Durgaprasad M L, GAURI NANDANA M, Harsh, Harshit Maurya, Harshith Kumar Mannepalli, Ishika Varshney, J. Ida Jemi, JIGHNESH, Jagnyaseni Panda, Jainiksha patel, Jatin, JenisishxCode, KRUTAGYA HIRENBHAI KANERIA, Kajal Pandey, Kanan, Kanchan Waldia, Karanjot786, Khushiii008, Kokila-chandrakar, Komal Pandey, Komal2008, Krishnavamsi-codes, Krushnakant Patil, Kunal Keshari Pattanaik, Kunam Day Harika, Lakshay Kumar, Lalit-mahajan-1, MAYUR AJIT SAHARE, Mahesh Shinde, Manasvi Sahare, Manish Kumar, Mohit Kumar Mina, Mᴇɢʜ Pᴀᴛᴇʟ, NAMRA RAFIQUE, Nachiket Patil, Navika Kapoor, Nikita_Pawar, Nishchay Agrawal, Nishtha Sharma, Onkar Jondhale, OnkarJondhale, PALAK, Palash Shivnani, Paridhi Jain, Patel Bhavika, Pranav Agarkar, Pranay Kumar Karvi, Prateek Lohiya, Pratishtha Yadav, Prem Sahith Jangam, Pushti Kansara, RAJAN JAISWAL, Rakesh Manthri, Rashi1404, Riddhima, Rishit Dev O, Ritik Raj, Riyanshi Gupta, Rohan, Rohan Abhinav, Roshesh Chaware, SAFIYA, SANDEEP KUMAR SIDAR, Sairaj Tripathy, Saksham Agarwal, Sameer Prajapati, Saptarshi Chatterjee, Satvik Rastogi, Satyajeet, Saurabh Kumar Bajpai, Shakti Vardhan Singh, Shan Usmani, Shinee tejol patro, Shiva Jyoti, Shivansho, Shri-Ananth, ShubhamSawant726, Siddh Sharma, Sneha Sharma, Soham Gangopadhyay, Sonal Mittal, Srijan Jaiswal, SrijanCodes, Srishti Suman Gupta, Srushti Panara, Srushti Thombre, Sujeet Kumar, TanCodeX, Tanmay Patwary, Tejas Karpe, Tushar Tyagi, VaibhavNexus, Vaibhavi Kariya, Vidula Kshirsagar, Vinayak Singh, Vishnu Sri Priya Kala, Vishvadharman Saminathan, Voidra, Yashi Singhal, Yashwant Singh, Yazhini Bala, Zainab Travadi, Zeltarox, akshayad2006-cmd, anjali1521, arpita-pa, disha, dolly, karthik, karthik jadhav, khushi, kotebhakti30, leVir, madhuri-perumalla, mahakagarwal7, nandani-singh15, nidhib08, prernaajaypatil-oss, rpoojaa06-git, saamya, srushti panara, unnati jadon, vidushi1129

---

## [0.1.5] - 2026-05-26

Full migration from Node.js + pnpm to Bun. Bun 1.3+ is now the sole development runtime. Published packages still ship Node-compatible ESM/CJS so npm consumers on Node 18+ remain unaffected. 600 tests still pass; build, dev-server, and all 6 examples verified end-to-end under Bun.

### Changed

#### Runtime and package manager

- **Bun replaces Node + pnpm** for development, builds, tests, dev-server, examples, scaffolding, and CI. Node is no longer required for any dev workflow.
- **`bun install` replaces `pnpm install`.** Lockfile changed from `pnpm-lock.yaml` to `bun.lock` (text format, diff-friendly).
- **Workspace declaration** moved from `pnpm-workspace.yaml` to the root `package.json` `workspaces` field.
- **Root `package.json`** sets `packageManager: bun@1.3.14` and `engines: { bun: ">=1.3.0" }`.
- **`bunfig.toml`** added for install + lockfile configuration.

#### @termuijs/dev-server

- **`Bun.spawn()` replaces `child_process.fork()`.** The `--loader tsx` flag is gone since Bun runs `.ts`/`.tsx` natively.
- **IPC wiring** moved from `child.on('message')` to the `ipc:` callback at spawn time.
- **Exit handling** moved from `child.on('exit')` to the `child.exited` Promise.
- **Alive check** uses `!child.killed && child.exitCode === null` instead of `child.connected`.
- **`DevServerOptions.nodeFlags` renamed to `bunFlags`.** Flags are prepended to the entry file in the `cmd` array.
- **`cli.ts` shebang** changed to `#!/usr/bin/env bun`.

#### create-termui-app

- **Generated `package.json` scripts** switched to Bun: `dev: bun --watch ...`, `start: bun dist/index.js`.
- **`tsx` removed from template `devDependencies`.** Replaced with `@types/bun`.
- **Generated `engines`** field set to `{ bun: ">=1.3.0" }`.
- **Scaffolding output** now prints `bun install` and `bun run dev` as the next-step hints.

#### Examples

- All 6 examples (`dashboard`, `jsx-dashboard`, `showcase`, `system-monitor`, `todo-app`, `widget-gallery`) switched from `tsx`/`npx tsx` to Bun.
- New `dev` script in each example using `bun --watch src/index.*`.
- `tsx` removed from each example's devDependencies.

#### Website

- `prebuild` and `build` scripts switched from `node` to `bun`.
- `scripts/generate-llm-docs.mjs` shebang changed to `#!/usr/bin/env bun`.

#### Per-package configuration

- All 11 library packages (core, data, jsx, motion, quick, router, store, testing, tss, ui, widgets) now declare `engines: { bun: ">=1.3.0", node: ">=18.0.0" }`. The Node entry remains because published `dist/` artifacts still target Node 18+ ESM/CJS for npm consumers.
- `dev-server` and `create-termui-app` are Bun-only at runtime (`engines: { bun: ">=1.3.0" }` with no `node` field).

#### CI

- **GitHub Actions workflow** replaced `pnpm/action-setup` + `actions/setup-node` with `oven-sh/setup-bun@v2`.
- Pipeline: `bun install --frozen-lockfile` → `bun run build` → `bun vitest run` → `bun run typecheck`.

#### Testing

- Test runner stays at **Vitest** (preserves `vi.stubEnv`, `vi.mock`, `vi.resetModules` APIs used by `Spinner.test.ts` and `Sparkline.test.ts`).
- Root scripts use `bun vitest run` (Bun as script runner, vitest's standard worker pool).
- The `--bun` flag is intentionally NOT used; the worker pool hangs on this suite size. Documented in `CLAUDE.md` for future contributors.

### Removed

- `pnpm-workspace.yaml` and `pnpm-lock.yaml` deleted.
- `tsx` dependency removed from root, dev-server, all 6 examples, and scaffolded project templates.
- `packageManager: pnpm@9.15.0` removed from root `package.json`.

### Fixed

- `_killChild()` now guards `kill('SIGTERM')` in a try/catch in case the child already exited.
- `_handleChange()` now checks `child.exitCode === null` (not only `!killed`) before sending IPC reload, avoiding a send on a naturally-exited child.

### Verification

- Build: **20/20 packages successful** (13.9s clean, 67ms cached).
- Tests: **600/600 passing across 58 files in 3.54s**.
- Typecheck: **14/14 packages successful**.
- All 6 examples boot under Bun with clean SIGWINCH + SIGTERM handling.
- Caps fallback paths (NO_UNICODE / NO_MOTION / NO_COLOR) confirmed working in CI mode.
- Dev-server end-to-end: file change → IPC reload signal → child exit code 0 → respawn confirmed.
- Real-pty test (via `script` + `expect`): alt-screen enter/exit, cursor hide/show, sync-output (CSI 2026), SIGWINCH delivery, raw byte input (including `0x03`) all confirmed working under Bun.
- Manual interactive verification: tab switching (1-5), theme cycle (t), and quit (q) all work in a real terminal under Bun.

---

## [0.1.4] - 2026-05-09

This release adds the focus system, 24 new widgets, 4 new UI inputs, 7 data hooks, imperative prompts, a notification center, motion-preference support, WCAG color utilities, and testing improvements. Total tests: 598.

### Added

#### @termuijs/core

- **Timer pool** - `timerPoolSubscribe(ms, fn)` lets animations and intervals share one underlying `setInterval`. Reduces CPU usage when multiple timers run at the same frame rate.
- **Capability flags** - `caps` object with `caps.unicode`, `caps.motion`, and `caps.color`. Evaluated once at module load from `NO_UNICODE`, `NO_MOTION`, and `NO_COLOR` environment variables.
- **WCAG color utilities** - `contrastRatio(fg, bg)`, `meetsAA(fg, bg)`, `meetsAAA(fg, bg)`. Use them to verify accessible color combinations.
- **String utilities** - `stringWidth`, `truncate`, `wordWrap`, `stripAnsi`. CJK-aware; handles ANSI escape sequences in width calculations.

#### @termuijs/jsx

- **`useKeymap(bindings)`** - Declarative key binding hook. Cleaner than chained `useInput` checks. Multiple calls in one component are additive. Cleanup runs on unmount.
- **`useMotion()`** - Returns `{ prefersReducedMotion }`. Reads `caps.motion` so components skip timer-based animations when `NO_MOTION=1`.
- **`ErrorBoundary`** - Wraps any subtree. Caught errors render a fallback instead of crashing the app. `boundary.reset()` clears error state and re-renders children.
- **Focus system** - Four hooks for keyboard-accessible interfaces:
  - `useFocusManager()` - Owns the global focus state. Mount at the app root.
  - `useFocus({ id, autoFocus? })` - Reads and sets focus per widget.
  - `useFocusTrap(ids[])` - Traps Tab and Shift+Tab within an array of IDs. Use inside modals and dialogs.
  - `useKeyboardNavigation({ items, loop?, pageSize? })` - Standard arrow key list navigation with Home, End, PgUp, PgDn.
- **Fiber identity reuse** - The reconciler reuses existing fiber instances when component type and tree position both match. `useState` and `useRef` values survive parent re-renders. Animated components no longer reset on sibling updates.

#### @termuijs/widgets

New display widgets:

- `StreamingText` - Typewriter effect. Respects `caps.motion`; outputs instantly when `NO_MOTION=1`.
- `ChatMessage` - Chat bubble with role-aware styling for `user`, `assistant`, and `system` roles.
- `ToolCall` - AI tool call display with status indicator and collapsible args and result.
- `JSONView` - Collapsible, keyboard-navigable JSON tree viewer.
- `DiffView` - Unified diff viewer with colored add and remove lines.
- `BigText` - Large ASCII art banner text. Built-in 5x3 character map; no external dependencies.
- `Gradient` - Text with per-character 256-color gradient between two colors.

New layout widgets:

- `Card` - Bordered container with optional title in the border.
- `ScrollView` - Height-bounded scrollable container. Arrow keys, PgUp, PgDn to scroll.
- `Center` - Centers a single child horizontally, vertically, or both.
- `Columns` - Evenly-split column layout from an array of widgets.
- `Sidebar` - Navigable sidebar with items, badges, and active highlight.
- `KeyValue` - Aligned key: value pairs with configurable separator and colors.
- `Definition` - Term (bold) and definition (normal) stacked pairs.
- `Banner` - Full-width alert with title, body, and variant color.
- `StatusMessage` - Compact icon and message. Icons respect `caps.unicode` (uses ASCII fallbacks when `NO_UNICODE=1`).
- `Grid` - CSS-grid-style layout. Items flow left-to-right and wrap every N columns.

New chart widgets:

- `LineChart` - ASCII line plot with labeled X/Y axes and multi-series support. Uses unicode plot characters with ASCII fallbacks.
- `HeatMap` - 2D matrix with color-scale shading and row and column labels. Unicode shading with ASCII fallbacks.

New feedback widgets:

- `Skeleton` - Animated loading placeholder. `pulse` and `shimmer` variants. Respects `caps.motion`.
- `MultiProgress` - Multiple labeled progress bars in one widget.
- `CommandPalette` - Searchable, filterable command menu.

Earlier additions:

- `Tree` - Collapsible tree for hierarchical data.
- `BarChart` - Horizontal or vertical bar chart with grouping support.

#### @termuijs/ui

- **`NotificationCenter`** - Floating notification stack. Mount once at the app root.
- **`useNotifications()`** - `notify(message, { type, duration })` and `dismiss(id)`. Returns notification IDs. Pass `duration: 0` for persistent notifications.
- **Imperative prompts** - `prompt.text()`, `prompt.confirm()`, `prompt.select()`, `prompt.multiSelect()`. All return Promises. A focus trap is applied automatically while the prompt is open.
- **`PasswordInput`** - Text input with character masking. Alt+V toggles visibility.
- **`NumberInput`** - Digits and decimal only. Arrow keys step by configurable amount. Rejects non-numeric input.
- **`PathInput`** - Text input with Tab-completion from the file system via `fs.readdirSync`.
- **`KeyboardShortcuts`** - Renders a grouped grid of `KeyBinding[]` entries with labeled key boxes.

#### @termuijs/store

- **`batch(fn)`** - Groups multiple `setState` calls into one reconciler pass. Flushes all queued updates in a single microtask.

#### @termuijs/tss

- **`ThemeTokens` type** - `Record<string, string>` keyed by CSS variable names.
- **Named token exports** - `draculaTheme`, `nordTheme`, `catppuccinTheme`, `monokaiTheme`, `solarizedTheme`, `tokyoNightTheme`, `oneDarkTheme`. Use these directly without the TSS engine.
- **`tokensToTSS(name, tokens)`** - Converts a token object to a TSS `@theme` block string. Bridge between the token format and the engine format.
- **`AutoThemeProvider`** - Detects terminal background color via OSC query and selects the closest theme. Accepts a `fallback` prop. Skips detection when `caps.color` is false.
- **`useTheme()`** - `{ theme, setTheme, availableThemes }`. Switch themes at runtime from any component.

#### @termuijs/data

- **Reactive hooks** - `useCpu(ms?)`, `useMemory(ms?)`, `useDisk(ms?)`, `useNetwork(ms?)`, `useTopProcesses(n, ms?)`, `useSystemInfo()`, `useHttpHealth(urls, ms?)`. All hooks register interval cleanup on unmount.

#### @termuijs/motion

- **`caps.motion` guard** - `animateSpring` and `transition` skip to their final value immediately when `NO_MOTION=1`. No animation loop runs.
- **Timer pool** - Animations now use `timerPoolSubscribe` instead of raw `setTimeout`. Multiple simultaneous animations share one underlying timer.

#### @termuijs/testing

- **`waitFor(fn, opts?)`** - Polls `fn()` until it does not throw. Default `{ timeout: 1000, interval: 10 }`. Use for async state assertions.
- **`renderToString()`** - Returns an ANSI-free flat string snapshot of the current widget state.

#### @termuijs/quick

- New builders: `jsonView`, `diffView`, `streamingText`, `chatMessage`, `toolCall`, `commandPalette`, `multiProgress`, `grid`.
- Re-exports: `useKeymap`, `useMotion`, `useTheme`, `useNotifications`, `useAsync`, `useCpu`, `useMemory`, `useDisk`, `useNetwork`, `useTopProcesses`, `useSystemInfo`, `useHttpHealth`.
- App root now wraps in `AutoThemeProvider` and `ErrorBoundary` automatically.

#### @termuijs/router

- Route components are now wrapped in `ErrorBoundary`. A screen crash shows an error UI instead of killing the app.
- `push()`, `replace()`, and `back()` call `unmountAll()` before mounting the new screen. No stale fibers remain after navigation.

#### @termuijs/dev-server

- Graceful reload: sends a `reload` IPC message to the child process before killing it. The child calls `unmountAll()` and exits cleanly within a 200ms grace period.
- Devtools inspector now supports all new widget types: Grid, Skeleton, JSONView, DiffView, CommandPalette, NotificationCenter, StreamingText, ChatMessage, ToolCall.

#### create-termui-app

- All four templates updated to use `useKeymap`, `AutoThemeProvider`, and `ErrorBoundary`.
- Dashboard template uses Grid layout and `useNotifications`.
- Interactive tool template uses `prompt.confirm` for destructive actions and `useMotion` guards around animations.

### Fixed

- **`@termuijs/core` App.ts** - `requestRender()` now checks `isDirty` before running the full layout pass. Frames with no state changes no longer trigger layout computation.
- **`@termuijs/core` Terminal.ts** - Changed `process.once('uncaughtException', ...)` to `process.on(...)`. The terminal now restores correctly after any uncaught exception, not only the first one.
- **`@termuijs/widgets` Spinner** - No longer uses a manual `tick` interval. Uses `timerPoolSubscribe` and checks `caps.motion`. Static character output when `NO_MOTION=1`.
- **`@termuijs/widgets` Sparkline** - Falls back to numeric ASCII characters (`1`-`8`) when `NO_UNICODE=1`. Previously output garbled unicode block elements in non-unicode terminals.
- **`@termuijs/widgets` List, VirtualList** - Selection prefix `'▸ '` now falls back to `'> '` when `NO_UNICODE=1`.
- **`@termuijs/widgets` Gauge** - Fill and empty characters fall back to ASCII when `NO_UNICODE=1`.
- **`@termuijs/widgets` StreamingText** - Guards `timerPoolSubscribe` call with `caps.motion` check.
- **`@termuijs/ui` Select, Tabs, Modal, Toast, MultiSelect, Tree, CommandPalette** - All unicode and emoji characters now have `caps.unicode` guards with ASCII fallbacks. Previously output garbled characters in CI environments and non-unicode terminals.
- **`@termuijs/data` http.ts** - `_latencyHistory` now capped at 100 entries per URL. Previously grew without bound.
- **`@termuijs/testing` `rerender()`** - Now uses `reRenderComponent()` internally to preserve fiber state. Previously discarded hook state on every re-render call.
- **`@termuijs/testing` `fireKey()`** - Now uses `collectInputHandlers()` to walk the full fiber tree. Previously only dispatched to the root component's handlers.

### Changed

- **`@termuijs/tss`** - Documentation updated from "five built-in themes" to six (Solarized was present but unlisted).
- **All packages** - README files updated to document new features.
- **Website** - 15 new documentation pages added. 9 existing pages updated. All new features are now documented.
- **Tests** - 242 new tests across all packages. Total: 598 tests, all passing.

---

## [0.1.3] - 2026-04-07

### Added

- **`homepage` field** added to all 13 package `package.json` files, pointing to the relevant docs page on `termui.io`.
- **`repository` field** added to all 13 package `package.json` files, linking to the GitHub monorepo.
- **Root `package.json`** — added `homepage` (`https://www.termui.io`) and `repository` fields.

### Changed

- **`@termuijs/store` and `@termuijs/testing`** version aligned with the rest of the monorepo (`0.1.0` → `0.1.3`).

### Documentation

- **All package READMEs** — added `## Documentation` section before `## License` with a direct link to the relevant docs page on `termui.io`.
- **Root README** — added docs badge to the header; fixed relative Quick Start link to absolute `https://www.termui.io/docs/getting-started/quick-start`.
- **`packages/core` README** — fixed wrong docs domain (`termuijs.dev` → `termui.io`).

---

## [0.1.2] — 2026-04-02

### Fixed

- **JSX `useInterval`** no longer creates duplicate timers on re-render. Re-renders update the callback ref instead of spawning a new `setInterval`.
- **JSX `useEffect`** cleanup tracking rewritten. Effects update existing records in-place on re-render. Cleanups run before the effect re-executes.
- **JSX reconciler** memory leak fixed. Old widgets are deleted from `_instanceMap` when a component re-renders, preventing the map from growing forever.
- **`@termuijs/data` `tail.ts`** file descriptor leak fixed. `fs.closeSync(fd)` now runs inside a `try/finally` block.
- **`@termuijs/data` `tail.ts`** watcher cleanup fixed. `stop()` now calls `fs.unwatchFile()` immediately instead of waiting for the next change event.
- **`@termuijs/data` `cpu.ts`** double-call inconsistency fixed. Added a cached delta with a short TTL so `cpu.percent` and `cpu.perCore` return data from the same sample.
- **`@termuijs/data` `disk.ts`** macOS percent column detection fixed. Column index is now `7` on macOS and `4` on Linux (was `4` for both).
- **`@termuijs/data` `http.ts`** response body now consumed with `await res.text()` to prevent connection leaks.
- **`@termuijs/router`** history no longer grows unbounded. Added `maxHistory` option (defaults to 100). The array is trimmed with `slice()` on each push.
- **`@termuijs/tss` watcher** no longer uses `require()` in ESM. `readdirSync` is imported at the top of the file alongside other `node:fs` imports.
- **`@termuijs/tss` watcher** `_reload` now calls `loadAll()` to re-merge all `.tss` sources instead of replacing the stylesheet with a single file.
- **`@termuijs/tss` engine** `_parseColor` now delegates to `parseColor()` from `@termuijs/core` instead of duplicating a limited subset of color parsing.
- **`@termuijs/ui`** all 9 compound widgets (Select, MultiSelect, Tabs, Modal, Toast, Tree, Form, CommandPalette, ConfirmDialog) now call `markDirty()` in every state-mutating method.
- **`@termuijs/ui` Form** submit button navigation separated from field navigation. `markDirty()` added to `nextField()` and `prevField()`.
- **`@termuijs/ui` Modal** no longer accesses private `_rect` and `_renderSelf` on content widgets.

### Changed

- **Documentation overhaul.** 15 doc pages rewritten to match actual APIs. Removed wrong constructors (`new Style()`, `new Layout()`, `new App()`), phantom methods (`beforeEach`, `onRoute`, `parse`), and incorrect theme names.
- **`@termuijs/data` description** corrected across README, `package.json`, website, and docs — from "reactive data sources" to "system monitoring: CPU, memory, disk, network, processes."
- **`@termuijs/tss` `package.json`** and README updated from "five built-in themes" to "six" (Solarized was missing from the list).
- **Router README** fixed dynamic route syntax from `:id` to `[id]`.
- **Root README** test badge updated from 307 to 356. Removed `**NEW**` and `← NEW` badges. Fixed `app.onKey()` → `app.events.on('key')`.
- **Website navigation** rewritten. Removed 9 dead sidebar links. Added missing sections for Store, Testing, JSX, Quick, Unicode.
- **Website package cards** added `@termuijs/store` and `@termuijs/testing`. Fixed `@termuijs/data` description.

### Added

- **`@termuijs/quick` documentation** — new page covering reactive values, widget shorthands, layout helpers, and the fluent `AppBuilder`.
- **String utilities documentation** — new page covering `stringWidth`, `truncate`, `wordWrap`, `stripAnsi`.
- **Tests** — 49 new tests across store, data, quick, jsx (hooks, context, memo), and create-termui-app. Total: 356 tests, 44 test files, all packages building.

---

## [0.1.1] — 2026-02-14

### Added

- **13 packages** published to npm for the first time under the `@termuijs` scope.
- **`@termuijs/core`** — screen buffer, flexbox layout engine, input parser, event emitter, focus manager, ANSI rendering, CJK-aware string utilities.
- **`@termuijs/widgets`** — Box, Text, Table, ProgressBar, Spinner, Gauge, TextInput, VirtualList.
- **`@termuijs/ui`** — Select, MultiSelect, Tabs, Modal, Toast, Tree, Form, CommandPalette, ConfirmDialog, Divider.
- **`@termuijs/jsx`** — TSX runtime with `useState`, `useEffect`, `useRef`, `useContext`, `useAsync`, `useInput`, `useInterval`, `useMemo`, and `memo()`.
- **`@termuijs/store`** — Zustand-style global state with `createStore`, selectors, `subscribe`, `destroy`.
- **`@termuijs/tss`** — Terminal Style Sheets with variables, selectors, pseudo-classes, and 6 built-in themes (default, cyberpunk, nord, dracula, catppuccin, solarized).
- **`@termuijs/router`** — screen routing with `[id]` dynamic params, history stack, navigation events, file-based route scanning.
- **`@termuijs/motion`** — `stepSpring()`, `animateSpring()`, spring presets (default, stiff, gentle, wobbly, slow, molasses), easing functions, transitions.
- **`@termuijs/data`** — CPU, memory, disk, network, process monitoring. File tailing. HTTP ping.
- **`@termuijs/testing`** — in-memory test renderer with `render()`, `getByText()`, `getAllByType()`, `fireKey()`, `typeText()`, `lastFrame()`, `toString()`.
- **`@termuijs/dev-server`** — file-watching hot-reload via `child_process.fork()`.
- **`@termuijs/quick`** — fluent builder API for rapid prototyping. `app()`, `gauge()`, `table()`, `text()`, `sparkline()`.
- **`create-termui-app`** — project scaffolding CLI with template selection.
- **5 examples** — dashboard, jsx-dashboard, showcase, system-monitor, todo-app.
- **6 built-in themes** — default, cyberpunk, nord, dracula, catppuccin, solarized.
- **Documentation website** — built with Vite + TanStack Router.

---

## [0.1.0] — 2026-02-10

### Added

- Initial framework scaffold with core architecture.
- Scope renamed from `@termui` to `@termuijs`.
