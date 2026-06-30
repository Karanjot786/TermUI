# termuijs

Copy TermUI components into your project. No install, no wrapper package — you get the actual source files in your repo, and you own them from there.

```bash
npx termuijs add spinner
```

That writes the Spinner source into `src/components/spinner/` and installs whatever `@termuijs/*` packages it needs, using the package manager your project already uses.

## Commands

### `add`

```bash
npx termuijs add <name...>
```

Pass one or more component names. Each one's files land under `src/components/<name>/`, and any dependencies they pull in get installed in a single pass.

```bash
npx termuijs add spinner table progress-bar
```

Run it with no name to pick from a list:

```bash
npx termuijs add
```

### `list`

```bash
npx termuijs list
```

Prints every component the registry knows about.

## Flags

| Flag | Default | What it does |
|------|---------|--------------|
| `--dir <path>` | `src/components` | Where to write the files. |
| `--dry-run` | off | Print what would be written and installed, change nothing. |
| `--yes`, `-y` | off | Overwrite an existing component folder instead of stopping. |

A dry run is the quickest way to see what `add` will touch before it touches it:

```bash
npx termuijs add data-grid --dry-run
```

If a component folder already exists, `add` stops and tells you. Re-run with `--yes` to overwrite it.

## How it works

Components live as JSON in the registry at `https://termui.io/r/`. `add` fetches `r/<name>.json`, writes the files it lists, gathers their `dependencies`, and installs them. `list` reads `r/registry.json` for the full index.

Files are always written inside the destination folder. A component that tries to write outside it is rejected, so a bad registry entry can't escape `src/components`.

Your package manager is detected from the lockfile in the current directory (`bun.lock`, `pnpm-lock.yaml`, `yarn.lock`, or `package-lock.json`), falling back to npm.

To point at a different registry — a local mirror, say, or a preview deploy — set `TERMUI_REGISTRY_URL`:

```bash
TERMUI_REGISTRY_URL=http://localhost:3000 npx termuijs add spinner
```

## Links

- Docs: https://www.termui.io
- Source: https://github.com/Karanjot786/TermUI

MIT
