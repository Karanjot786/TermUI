# TermUI Component Registry

This directory contains the component registry for TermUI. It defines metadata for reusable registry components and the index used by the registry implementation.

## Structure

```
registry/
├── schema.json          # Registry index (all components)
└── components/          # Registered components
    ├── badge/
    │   ├── index.ts
    │   ├── badge.test.ts
    │   ├── meta.json
    │   └── README.md
    ├── alert/
    ├── markdown/
    ├── chat-thread/
    └── progress/
```

## Component metadata format

Each component is described by a `meta.json` file and an entry in `registry/schema.json`.

The `registry/schema.json` format includes:

- `$schema` — schema identifier
- `version` — registry version
- `components` — array of component entries

Each component entry includes:

- `name` — unique kebab-case identifier
- `category` — one of: `input`, `feedback`, `layout`, `navigation`, `data`, `utility`
- `description` — one-line description
- `files` — paths to component files copied into user projects
- `deps` — npm dependencies required by the component
- `peerDeps` — peer dependencies expected in the user project
- `version` — component version

Example component metadata:

```json
{
  "name": "badge",
  "category": "utility",
  "description": "Short inline label with colored background for status indicators.",
  "files": ["registry/components/badge/index.ts"],
  "deps": ["@termuijs/core", "@termuijs/widgets"],
  "peerDeps": [],
  "version": "0.1.0"
}
```

## Adding a component

To add a registry component:

1. Create a new directory under `registry/components/<name>/`
2. Add the component source in `index.ts`
3. Add tests in `<name>.test.ts`
4. Add `meta.json` with the component metadata
5. Add a short `README.md` describing the component
6. Update `registry/schema.json` to include the new component entry

## Updating schema.json

When adding or changing components, update `registry/schema.json` by adding or editing the matching component entry in the `components` array.

The registry index must remain a valid JSON file with all required fields for each component.
