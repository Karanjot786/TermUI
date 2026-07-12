# Environment Variables

TermUI supports several environment variables that control rendering, accessibility, keyboard navigation, and terminal behavior. These variables allow developers to customize the framework for different environments such as development, CI pipelines, and accessibility-focused applications.

---

## Rendering

### `NO_COLOR`

**Default**

Disabled

**Description**

Disables ANSI color output throughout the application.

**Example**

```bash
NO_COLOR=1 bun run dev
```

**Behavior**

- Disables ANSI color sequences.
- Produces plain-text output.
- Useful for CI environments, logging, and terminals that do not support colors.

---

### `NO_UNICODE`

**Default**

Disabled

**Description**

Disables Unicode rendering and uses ASCII-compatible alternatives instead.

**Example**

```bash
NO_UNICODE=1 bun run dev
```

**Behavior**

- Replaces Unicode characters with ASCII equivalents.
- Improves compatibility with older terminals.
- Recommended for environments with limited Unicode support.

---

### `NO_MOTION`

**Default**

Disabled

**Description**

Disables animations and motion effects.

**Example**

```bash
NO_MOTION=1 bun run dev
```

**Behavior**

- Skips animation rendering.
- Produces static UI updates.
- Useful for accessibility and low-performance environments.

---

### `TERMUI_KEYBINDINGS`

**Default**

`default`

**Description**

Configures the global keyboard navigation mode.

**Supported values**

- `default`
- `vim`
- `emacs`

**Example**

```bash
TERMUI_KEYBINDINGS=vim bun run dev
```

**Behavior**

- Changes default keyboard shortcuts.
- Allows applications to use familiar navigation schemes.

---

## Accessibility

### `HIGH_CONTRAST`

**Default**

Disabled

**Description**

Enables high-contrast rendering for improved readability.

**Example**

```bash
HIGH_CONTRAST=1 bun run dev
```

**Behavior**

- Increases UI contrast.
- Improves visibility for users with visual impairments.

---

### `TERMUI_ACCESSIBILITY_STRICT`

**Default**

Disabled

**Description**

Enables stricter accessibility behavior and validation.

**Example**

```bash
TERMUI_ACCESSIBILITY_STRICT=1 bun run dev
```

**Behavior**

- Applies stricter accessibility rules.
- Helps developers identify accessibility issues during development.

---

## Terminal Environment

### `CI`

**Description**

Automatically detected in Continuous Integration environments.

**Behavior**

- Disables interactive behavior where appropriate.
- Disables animations.
- Optimizes output for automated environments.

---

### `TERM_BACKGROUND`

**Description**

Overrides automatic terminal background detection.

**Supported values**

- `light`
- `dark`

**Example**

```bash
TERM_BACKGROUND=dark bun run dev
```

**Behavior**

- Forces the terminal theme.
- Useful when automatic detection is inaccurate.

---

## Automatically Detected Environment Variables

The following variables are detected automatically by TermUI. They are standard terminal environment variables and generally do not need to be configured manually.

| Variable | Purpose |
|----------|---------|
| `TERM` | Detect terminal capabilities |
| `COLORTERM` | Detect color support |
| `COLORFGBG` | Detect terminal background colors |
| `FORCE_COLOR` | Force ANSI color support |
| `TERM_PROGRAM` | Identify the terminal application |
| `VTE_VERSION` | Detect VTE-compatible terminals |

---

## Notes

- Most environment variables are optional and only need to be configured for specific use cases.
- `caps.unicode` and `caps.motion` are evaluated when `env-caps.ts` is initialized.
- Color support, terminal background detection, and keyboard binding mode read environment variables when accessed.
- Terminal-specific variables are automatically detected whenever possible.
- If you change environment variables while developing, restart the application to ensure all settings are applied consistently.