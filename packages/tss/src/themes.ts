// ─────────────────────────────────────────────────────
// Built-in Themes — 10 curated terminal color palettes
// ─────────────────────────────────────────────────────

export const BUILTIN_THEMES: Record<string, string> = {

    default: `
@theme default {
    --primary: cyan;
    --secondary: blue;
    --bg: black;
    --surface: brightBlack;
    --text: white;
    --text-muted: brightBlack;
    --accent: green;
    --error: red;
    --warning: yellow;
    --success: green;
    --border: single;
    --border-color: brightBlack;
    --border-focus: cyan;
}
`,

    cyberpunk: `
@theme cyberpunk {
    --primary: #ff00ff;
    --secondary: #00ffff;
    --bg: #0a0a2e;
    --surface: #1a1a4e;
    --text: #e0e0ff;
    --text-muted: #6060a0;
    --accent: #ff6b6b;
    --error: #ff4444;
    --warning: #ffaa00;
    --success: #00ff88;
    --border: single;
    --border-color: #00ffff;
    --border-focus: #ff00ff;
}

Gauge {
    color: var(--primary);
    bar-filled: "█";
    bar-empty: "░";
}

Table {
    border: var(--border);
    border-color: var(--border-color);
}

Box:focused {
    border-color: var(--border-focus);
}
`,

    nord: `
@theme nord {
    --primary: #88c0d0;
    --secondary: #81a1c1;
    --bg: #2e3440;
    --surface: #3b4252;
    --text: #eceff4;
    --text-muted: #4c566a;
    --accent: #a3be8c;
    --error: #bf616a;
    --warning: #ebcb8b;
    --success: #a3be8c;
    --border: round;
    --border-color: #4c566a;
    --border-focus: #88c0d0;
}

Gauge {
    color: var(--primary);
}

Table {
    border: var(--border);
    header-color: var(--primary);
}
`,

    dracula: `
@theme dracula {
    --primary: #bd93f9;
    --secondary: #ff79c6;
    --bg: #282a36;
    --surface: #44475a;
    --text: #f8f8f2;
    --text-muted: #6272a4;
    --accent: #50fa7b;
    --error: #ff5555;
    --warning: #f1fa8c;
    --success: #50fa7b;
    --border: round;
    --border-color: #6272a4;
    --border-focus: #bd93f9;
}

Gauge {
    color: var(--primary);
}

Text:focused {
    color: var(--secondary);
    bold: true;
}
`,

    gruvbox: `
@theme gruvbox {
    --primary: #458588;
    --secondary: #b16286;
    --bg: #282828;
    --surface: #3c3836;
    --text: #ebdbb2;
    --text-muted: #928374;
    --accent: #98971a;
    --error: #cc241d;
    --warning: #d79921;
    --success: #98971a;
    --border: round;
    --border-color: #504945;
    --border-focus: #458588;
}

Gauge {
    color: var(--primary);
}

Table {
    border: var(--border);
    header-color: var(--secondary);
}
`,

    catppuccin: `
@theme catppuccin {
    --primary: #cba6f7;
    --secondary: #f5c2e7;
    --bg: #1e1e2e;
    --surface: #313244;
    --text: #cdd6f4;
    --text-muted: #585b70;
    --accent: #a6e3a1;
    --error: #f38ba8;
    --warning: #f9e2af;
    --success: #a6e3a1;
    --border: round;
    --border-color: #585b70;
    --border-focus: #cba6f7;
}

Gauge {
    color: var(--primary);
}

Table {
    border: var(--border);
    header-color: var(--secondary);
}
`,

    solarized: `
@theme solarized {
    --primary: #268bd2;
    --secondary: #2aa198;
    --bg: #002b36;
    --surface: #073642;
    --text: #839496;
    --text-muted: #586e75;
    --accent: #859900;
    --error: #dc322f;
    --warning: #b58900;
    --success: #859900;
    --border: single;
    --border-color: #586e75;
    --border-focus: #268bd2;
}

Gauge {
    color: var(--primary);
}

Table {
    border: var(--border);
    header-color: var(--secondary);
}
`,

    "tokyo-night": `
@theme tokyo-night {
    --primary: #7aa2f7;
    --secondary: #bb9af7;
    --bg: #1a1b26;
    --surface: #1f2335;
    --text: #a9b1d6;
    --text-muted: #565f89;
    --accent: #9ece6a;
    --error: #f7768e;
    --warning: #e0af68;
    --success: #9ece6a;
    --border: round;
    --border-color: #3b3d57;
    --border-focus: #7aa2f7;
}

Gauge {
    color: var(--primary);
}

Table {
    border: var(--border);
    header-color: var(--secondary);
}
`,

    solarizedLight: `
@theme solarizedLight {
    --primary: #268bd2;
    --secondary: #2aa198;
    --bg: #fdf6e3;
    --surface: #eee8d5;
    --text: #657b83;
    --text-muted: #93a1a1;
    --accent: #859900;
    --error: #dc322f;
    --warning: #b58900;
    --success: #859900;
    --border: single;
    --border-color: #93a1a1;
    --border-focus: #268bd2;
}

Gauge {
    color: var(--primary);
}

Table {
    border: var(--border);
    header-color: var(--secondary);
}
`,

    highContrast: `
@theme highContrast {
    --primary: #00ffff;
    --secondary: #ff00ff;
    --bg: #000000;
    --surface: #1a1a1a;
    --text: #ffffff;
    --text-muted: #b3b3b3;
    --accent: #00ffff;
    --error: #ff5555;
    --warning: #ffff00;
    --success: #00ff00;
    --border: double;
    --border-color: #ffffff;
    --border-focus: #00ffff;
}

Gauge {
    color: var(--primary);
}

Table {
    border: var(--border);
    border-color: var(--border-color);
    header-color: var(--primary);
}

Box:focused {
    border-color: var(--border-focus);
}
`,

    everforest: `
@theme everforest {
    --primary: #a7c080;
    --secondary: #7fbbb3;
    --bg: #2d353b;
    --surface: #343f44;
    --text: #d3c6aa;
    --text-muted: #859289;
    --accent: #7fbbb3;
    --error: #e67e80;
    --warning: #dbbc7f;
    --success: #a7c080;
    --border: round;
    --border-color: #859289;
    --border-focus: #a7c080;
}

Gauge {
    color: var(--primary);
}

Table {
    border: var(--border);
    header-color: var(--primary);
}
`,
};

/** Get all built-in theme names */
export function getBuiltinThemeNames(): string[] {
    return Object.keys(BUILTIN_THEMES);
}

/** Get a built-in theme source by name */
export function getBuiltinTheme(name: string): string | undefined {
    return BUILTIN_THEMES[name];
}

/** Get all built-in themes combined as a single source */
export function getAllBuiltinThemes(): string {
    return Object.values(BUILTIN_THEMES).join('\n');
}
