# create-termui-app — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds scaffolding-specific rules.

## What lives here

The project scaffolding CLI. `index.ts` (the command, template registry), `prompts.ts` (interactive setup), `templates.ts` (generated project files as code), `templates.test.ts`.

## Adding a template

1. Templates are generated in code, not stored as a `templates/` directory. Add a `generate<Name>Template(config)` function in `templates.ts`, following the existing `generate*Template` functions.
2. Register the template key in both the `TEMPLATES` list and `TEMPLATE_KEYS` in `index.ts`.
3. Generated `package.json` scripts use Bun: `"dev": "bun --watch src/index.tsx"`, `"start": "bun dist/index.js"`. Never `node` or `tsx`.

## Rules specific to create-termui-app

- Generated projects target Bun. The generated `package.json` sets `engines.bun`.
- A template must boot on its own. If it references a widget or adapter that does not exist yet, give it a self-contained mock so the scaffold runs without that dependency.
- Do not hardcode absolute paths. Use the config object for the project name and directory.

## Test command

```bash
bun vitest run packages/create-termui-app
```
