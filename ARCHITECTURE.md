
# Architecture

## Overview

TermUI is a high-performance TypeScript framework designed for constructing rich terminal applications.

It operates strictly as a CLI library rather than a web application. Because there is no DOM, browser environment, or React runtime, applications render efficiently through a terminal cell grid using ANSI escape codes.


The repository is a Bun workspace monorepo containing 14 packages under `packages/`. Each package is published as `@termuijs/<name>`.

---

## Package Map

| Package                       | Responsibility                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `@termuijs/core`              | Screen buffer, layout engine, input, events, capabilities, and `KeyEvent`.           |
| `@termuijs/widgets`           | Box, Text, Table, Gauge, Sparkline, Tree, and other display widgets.                 |
| `@termuijs/ui`                | Select, Tabs, Modal, Toggle, Wizard, prompts, and compound widgets.                  |
| `@termuijs/jsx`               | JSX runtime and React-style hooks such as `useState`, `useEffect`, and `useReducer`. |
| `@termuijs/store`             | Global state management with selectors and subscriptions.                            |
| `@termuijs/tss`               | Terminal Style Sheets including variables, selectors, and themes.                    |
| `@termuijs/motion`            | Spring and easing animations that respect `NO_MOTION`.                               |
| `@termuijs/router`            | Screen routing with typed parameters and guards.                                     |
| `@termuijs/data`              | System data providers for CPU, memory, disk, processes, and network.                 |
| `@termuijs/testing`           | In-memory test renderer for automated testing.                                       |
| `@termuijs/dev-server`        | Bun-native hot reload development server.                                            |
| `@termuijs/quick`             | Fluent builder API.                                                                  |
| `@termuijs/create-termui-app` | Project scaffolding CLI.                                                             |
| `@termuijs/adapters`          | Adapters for external CLI libraries.                                                 |

---

## Dependency Flow

Core forms the foundation of the workspace.

```text
create-termui-app
        │
   quick
        │
router  motion  data  store  tss  adapters
        │
       jsx
        │
        ui
        │
     widgets
        │
     testing
        │
       core
```

Dependency direction:

```text
core <- everything

widgets <- ui

core
 ├─ widgets
 │   └─ ui
 ├─ jsx
 ├─ store
 ├─ tss
 ├─ motion
 ├─ router
 ├─ data
 ├─ testing
 ├─ dev-server
 ├─ quick
 ├─ create-termui-app
 └─ adapters
```

`core` provides the foundational terminal primitives used throughout the workspace. Higher-level packages build on top of those primitives.

---

## Render Pipeline

A TermUI application reaches the terminal through the following pipeline:

1. Application code creates a widget tree.
2. Layout is calculated using the core layout engine.
3. Widgets render into the screen buffer.
4. The screen buffer is represented as a cell grid.
5. Cell changes are converted into ANSI escape sequences.
6. ANSI output is written to the terminal.
7. The terminal displays the resulting interface.

```text
Widget Tree
     ↓
Layout Engine
     ↓
Screen Buffer
     ↓
Cell Grid
     ↓
ANSI Output
     ↓
Terminal
```

---

## Where Code Belongs

Use these rules when deciding where a change belongs:

* Core terminal primitives, layout, input, events, and screen handling belong in `core`.
* Reusable display components belong in `widgets`.
* Interactive controls and compound interfaces belong in `ui`.
* JSX runtime functionality and hooks belong in `jsx`.
* Shared application state belongs in `store`.
* Styling, themes, selectors, and variables belong in `tss`.
* Animation functionality belongs in `motion`.
* Navigation and routing belong in `router`.
* System information providers belong in `data`.
* Test rendering infrastructure belongs in `testing`.
* Development tooling belongs in `dev-server`.
* Fluent APIs belong in `quick`.
* Project generation belongs in `create-termui-app`.
* Third-party integrations belong in `adapters`.

When in doubt, prefer the lowest-level package that owns the responsibility and avoid moving functionality across package boundaries without a documented reason.
