# TermUI Component Registry — Design Document

> RFC for the shadcn-style component registry. Comment on this issue before implementation starts.

---

## 1. Directory Structure

```
registry/
├── DESIGN.md                  # this file
├── schema.json                # registry index (all components)
└── components/
    ├── spinner/
    │   ├── index.ts           # component source
    │   ├── spinner.test.ts    # tests
    │   └── meta.json          # component metadata
    ├── file-picker/
    │   ├── index.ts
    │   ├── file-picker.test.ts
    │   └── meta.json
    └── ...
```

Each component lives in its own directory under `registry/components/<name>/`.
The directory name is the canonical component identifier used in CLI commands.

---

## 2. `registry/schema.json` Format

The registry index is a single JSON file listing all available components.

```json
{
  "$schema": "https://termui.io/registry/schema.json",
  "version": "1.0.0",
  "components": [
    {
      "name": "spinner",
      "category": "feedback",
      "description": "Animated spinner for indicating loading state in terminal UIs.",
      "files": [
        "registry/components/spinner/index.ts"
      ],
      "deps": [
        "@termuijs/core"
      ],
      "peerDeps": [
        "@termuijs/widgets"
      ],
      "version": "0.1.0"
    },
    {
      "name": "file-picker",
      "category": "input",
      "description": "Interactive file system navigator with keyboard navigation.",
      "files": [
        "registry/components/file-picker/index.ts"
      ],
      "deps": [
        "@termuijs/core",
        "@termuijs/widgets"
      ],
      "peerDeps": [],
      "version": "0.2.1"
    }
  ]
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Unique kebab-case identifier |
| `category` | `string` | ✅ | One of: `input`, `feedback`, `layout`, `navigation`, `data`, `utility` |
| `description` | `string` | ✅ | One-line description |
| `files` | `string[]` | ✅ | Paths to all files copied into user project |
| `deps` | `string[]` | ✅ | npm dependencies to install |
| `peerDeps` | `string[]` | ✅ | Peer dependencies (already expected in user project) |
| `version` | `string` | ✅ | SemVer version of the component |

---

## 3. CLI `add` Subcommand Behavior

### Usage

```bash
bunx create-termui-app add <component>
bunx create-termui-app add spinner
bunx create-termui-app add file-picker
```

### Behavior Steps

1. **Fetch registry** — download or read `registry/schema.json`, find the component by name.
2. **Not found** — print available components and exit with error.
3. **Already exists** — prompt user to confirm overwrite.
4. **Copy files** — copy component files into `src/components/<name>/` in the user's project.
5. **Install deps** — run `bun add <deps>` for any missing dependencies.
6. **Done** — print success message with import path.

### Example Output

```
  Adding spinner...
    ✓ src/components/spinner/index.ts
    ✓ Installing @termuijs/core

  ┌─────────────────────────────────┐
  │  ✅ spinner added successfully! │
  └─────────────────────────────────┘

  Import it with:
    import { Spinner } from './components/spinner'
```

### Implementation Notes

- Add `add` subcommand detection in `packages/create-termui-app/src/index.ts` via `process.argv[2] === 'add'`
- Component destination directory configurable via `--dir` flag (default: `src/components/`)
- Dry run support via `--dry-run` flag

---

## 4. Community Contribution Process

Contributors add components via PRs following these steps:

1. **Fork** the TermUI repository.
2. **Create** a new directory at `registry/components/<name>/`.
3. **Add** the component source in `index.ts` and tests in `<name>.test.ts`.
4. **Add** a `meta.json` with the component metadata matching the schema.
5. **Update** `registry/schema.json` to include the new component entry.
6. **Open a PR** with title: `registry: add <name> component`.
7. **Checklist** (enforced via PR template):
   - Component has tests with >80% coverage
   - `meta.json` is valid against schema
   - No breaking changes to existing components
   - Example usage included in component file as JSDoc

### Review Criteria

- Maintainer reviews for API consistency, test quality, and naming conventions.
- Community can comment on the schema or API in the tracking issue before implementation.
- Two approvals required for new components (one maintainer + one community reviewer).

---

## 5. Versioning Strategy

### Component Versions

- Each component is versioned independently in its `meta.json`.
- Follows **SemVer**: `MAJOR.MINOR.PATCH`
  - `PATCH` — bug fixes, no API change
  - `MINOR` — new props or features, backward compatible
  - `MAJOR` — breaking API changes

### Registry Version

- `registry/schema.json` has its own top-level `version` field.
- Bumped on every merge that adds or modifies components.

### Compatibility

- Each component declares the minimum `@termuijs/core` version it requires via `deps`.
- The CLI `add` command warns if the user's installed core version is below the requirement.

### Changelog

- Each component directory may include a `CHANGELOG.md` for detailed history.
- Breaking changes must be documented before the PR is merged.