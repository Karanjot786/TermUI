# @termuijs/ui — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds ui-specific rules.

## What lives here

Compound and interactive widgets: Select, Tabs, Modal, Toggle, Wizard, Drawer, MultilineTextInput, ColorPicker, DatePicker, prompts, NotificationCenter. These build on top of `@termuijs/widgets`.

## Adding a component

1. Create `packages/ui/src/<Name>.ts` and `<Name>.test.ts` at the package src root.
2. Extend `Widget` from `@termuijs/widgets` (not from a relative path; ui depends on widgets).
3. Export from `packages/ui/src/index.ts`.

## Imports

```ts
import { Widget } from '@termuijs/widgets';
import { type Screen, type KeyEvent, type Style, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';
```

## Rules specific to ui

- Interactive components implement `handleKey(event: KeyEvent)`. Key names are lowercase: `enter`, `left`, `right`, `up`, `down`, `space`, `escape`, `tab`. Never `Enter` or `ArrowUp`.
- Build the base style with `mergeStyles(defaultStyle(), { ... })`, not a raw object.
- Set `focusable = true` on components that take keyboard focus.
- Reference `src/Toggle.ts` for a small component and `src/Wizard.ts` for a multi-step one.

## Test command

```bash
bun vitest run packages/ui
```
