# Development Guide

This guide helps contributors set up the project locally, understand the monorepo structure, and run builds, tests, and examples.

## Prerequisites

Before starting, make sure you have the following installed:

* [Bun](https://bun.sh/)
* Git

You can verify Bun installation with:

```bash
bun --version
```

---

# Clone the Repository

```bash
git clone https://github.com/Karanjot786/TermUI.git
cd TermUI
```

---

# Install Dependencies

Install all workspace dependencies from the repository root:

```bash
bun install
```

---

# Monorepo Structure

This project uses a monorepo layout.

## Root Structure

```text
.
├── packages/
├── examples/
├── package.json
├── bun.lockb
├── README.md
├── CONTRIBUTING.md
└── DEVELOPMENT.md
```

## Packages Folder

The `packages/` directory contains the core libraries and modules used across the project.

Example structure:

```text
packages/
├── motion/
├── router/
├── core/
└── ...
```

Each package contains its own source code, tests, and configuration.

## Examples Folder

The `examples/` directory contains runnable demo applications that showcase how the packages work together.

Example:

```text
examples/dashboard
```

---

# Available Commands

Run all commands from the repository root unless stated otherwise.

## Build

Build all packages:

```bash
bun run build
```

## Test

Run the full test suite:

```bash
bun run test
```

For testing guidelines and recommended practices, see
`docs/TESTING_BEST_PRACTICES.md`.

## Typecheck

Run TypeScript type checking:

```bash
bun run typecheck
```

---

# Running Tests for a Single Package

To run tests for a specific package, navigate into that package directory.

Example:

```bash
cd packages/router
bun test
```

You can replace `router` with any package name inside the `packages/` folder.

---

# Running an Example App

To start the dashboard example:

```bash
cd examples/dashboard
bun run dev
```

This starts the development server for the example application.

---

# Contributor Workflow

Typical workflow for contributors:

1. Fork the repository
2. Clone your fork
3. Create a new branch
4. Make changes
5. Run build, tests, and typecheck
6. Open a Pull Request

Example:

```bash
git checkout -b feat/update-docs
```

---

# Helpful Commands Summary

| Command             | Purpose                       |
| ------------------- | ----------------------------- |
| `bun install`       | Install dependencies          |
| `bun run build`     | Build all packages            |
| `bun run test`      | Run all tests                 |
| `bun run typecheck` | Run type checks               |
| `bun test`          | Run tests for current package |
| `bun run dev`       | Start example app             |

---

# Additional Notes

* Read `CONTRIBUTING.md` before opening a Pull Request.
* Keep changes focused and minimal.
* Ensure tests pass before submitting changes.

Happy contributing!
