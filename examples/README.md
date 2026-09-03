# Examples

Every folder in this directory is a standalone, runnable TermUI app with its own `package.json`. To run one:

```bash
cd examples/<name>
bun install
bun run dev     # watch mode, or:
bun run start   # single run
```

Looking for full API docs (props, constructor options) instead of example code? See [termui.io](https://www.termui.io) / [TermUI_Docs](https://github.com/Karanjot786/TermUI_Docs).

## Getting started

The tutorial ladder — start here if you're new to TermUI.

| Example | Purpose |
|---------|---------|
| [`01-hello-world`](./01-hello-world) | Beginner example: basic text display |
| [`02-simple-button`](./02-simple-button) | Beginner example: button with click |
| [`03-form-inputs`](./03-form-inputs) | Beginner example: text input with live display |

## Dashboards & data

| Example | Purpose |
|---------|---------|
| [`dashboard`](./dashboard) | Example dashboard app using TermUI |
| [`jsx-dashboard`](./jsx-dashboard) | JSX-based system dashboard — React-like components for the terminal |
| [`system-monitor`](./system-monitor) | System monitor — built with `@termuijs/quick` in ~25 lines |
| [`process-monitor`](./process-monitor) | Process monitor using chart widgets and `@termuijs/data` hooks |
| [`data-grid`](./data-grid) | Sortable, navigable data grid built with the `DataGrid` widget |
| [`weather`](./weather) | Weather dashboard for a given lat/lon, built with the `@termuijs/quick` fluent API |
| [`widget-gallery`](./widget-gallery) | TermUI Widget Gallery — themes, grid, skeleton, notifications |
| [`showcase`](./showcase) / [`ai-streaming`](./ai-streaming) | Showcase apps demonstrating all framework packages |

## AI & real-time

| Example | Purpose |
|---------|---------|
| [`ai-assistant`](./ai-assistant) | AI assistant with mock and real modes — `ChatMessage`, `StreamingText`, `ToolCall`, `ToolApproval` |
| [`chat-app`](./chat-app) | Streaming chat UI |
| [`rss-reader`](./rss-reader) | RSS/Atom feed reader that fetches and parses a live feed |
| [`cli-wrapper-live`](./cli-wrapper-live) | Live log streaming from a wrapped CLI subprocess |

## Productivity & tools

| Example | Purpose |
|---------|---------|
| [`todo-app`](./todo-app) | Todo app — built with `@termuijs/quick` in ~20 lines |
| [`forms-and-validation`](./forms-and-validation) | Forms and validation example app |
| [`auth-flow`](./auth-flow) | Auth flow example using `@termuijs/store` and TermUI widgets |
| [`kanban-board`](./kanban-board) | Kanban board example app |
| [`pomodoro-timer`](./pomodoro-timer) | Pomodoro timer example app |
| [`flashcard-app`](./flashcard-app) | Flashcard study app — built with `@termuijs/widgets` |
| [`quiz-app`](./quiz-app) | Multiple-choice quiz app — built with `@termuijs/widgets` |
| [`markdown-editor`](./markdown-editor) | Live markdown editor with a side-by-side preview pane |
| [`markdown-viewer`](./markdown-viewer) | Scrollable terminal markdown reader |
| [`json-explorer`](./json-explorer) | Interactive JSON file explorer — file picker plus a collapsible, scrollable JSON tree view |
| [`file-manager`](./file-manager) | File manager example app |
| [`db-browser`](./db-browser) | SQLite database browser |
| [`git-client`](./git-client) | Git client example app |
| [`rest-client`](./rest-client) | Postman-style REST client |
| [`log-viewer`](./log-viewer) | Log viewer with realtime logs and filtering |
| [`calculator`](./calculator) | Calculator example app |

## Games

| Example | Purpose |
|---------|---------|
| [`snake-game`](./snake-game) | Classic Snake game rendered in the terminal |

## Architecture

| Example | Purpose |
|---------|---------|
| [`multi-screen-router`](./multi-screen-router) | Multi-screen routing with `@termuijs/router` |

## Standalone demo scripts

A few single-file demos live at the top level of `examples/` (no `package.json`, no per-demo install step). They import `@termuijs/core`, `@termuijs/widgets`, and `@termuijs/ui` directly, so run the root [`bun install` / `bun run build`](../README.md#running-the-examples) steps first, then run them directly from the repo root:

```bash
bun examples/braille-chart.ts    # LineChart + BrailleCanvas rendering
bun examples/demo-animations.ts  # Checkbox / Switch animation demo
bun examples/menubar-demo.ts     # MenuBar widget demo
```
