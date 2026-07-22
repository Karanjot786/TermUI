import { ColorDepth } from '../style/Color.js';

export type TerminalColorLevel = 'none' | 'basic' | 'ansi256' | 'truecolor';
export type TerminalBackground = 'light' | 'dark';
export type TerminalKeybindingMode = 'default' | 'vim' | 'emacs';

export interface TerminalCapabilityEnv {
    [key: string]: string | undefined;
}

export interface TerminalCapabilities {
    color: {
        enabled: boolean;
        depth: ColorDepth;
        level: TerminalColorLevel;
        ansi256: boolean;
        truecolor: boolean;
    };
    unicode: {
        enabled: boolean;
        ambiguousWidth: 1 | 2;
    };
    mouse: {
        supported: boolean;
        sgr: boolean;
    };
    screen: {
        alternateBuffer: boolean;
    };
    escapeSequences: {
        csi: boolean;
        osc: boolean;
    };
    motion: boolean;
    ci: boolean;
    background: TerminalBackground;
    keybindingMode: TerminalKeybindingMode;
}

export interface TerminalCapabilityOptions {
    env?: TerminalCapabilityEnv;
    isTTY?: boolean;
    platform?: NodeJS.Platform | string;
}

let overrideCapabilities: TerminalCapabilities | null = null;

function parseColorDepth(env: TerminalCapabilityEnv, isTTY: boolean): ColorDepth {
    if (env.NO_COLOR !== undefined || env.TERM === 'dumb') {
        return ColorDepth.None;
    }

    if (env.FORCE_COLOR !== undefined) {
        const level = Number.parseInt(env.FORCE_COLOR, 10);
        if (level === 0) return ColorDepth.None;
        if (level === 1) return ColorDepth.Basic;
        if (level === 2) return ColorDepth.Ansi256;
        if (level >= 3) return ColorDepth.TrueColor;
        return ColorDepth.Basic;
    }

    const colorterm = env.COLORTERM?.toLowerCase();
    if (colorterm === 'truecolor' || colorterm === '24bit') {
        return ColorDepth.TrueColor;
    }

    const term = env.TERM ?? '';
    if (term.includes('256color') || term.includes('256')) {
        return ColorDepth.Ansi256;
    }

    if (env.TERM_PROGRAM === 'iTerm.app' || env.TERM_PROGRAM === 'Hyper') {
        return ColorDepth.TrueColor;
    }

    return isTTY ? ColorDepth.Basic : ColorDepth.None;
}

function colorLevel(depth: ColorDepth): TerminalColorLevel {
    if (depth >= ColorDepth.TrueColor) return 'truecolor';
    if (depth >= ColorDepth.Ansi256) return 'ansi256';
    if (depth >= ColorDepth.Basic) return 'basic';
    return 'none';
}

function detectBackground(env: TerminalCapabilityEnv): TerminalBackground {
    if (env.TERM_BACKGROUND === 'light') return 'light';
    if (env.TERM_BACKGROUND === 'dark') return 'dark';

    const colorfgbg = env.COLORFGBG;
    if (colorfgbg) {
        const parts = colorfgbg.split(';');
        const bg = Number.parseInt(parts[parts.length - 1], 10);
        if (!Number.isNaN(bg)) return bg < 8 ? 'dark' : 'light';
    }

    return 'dark';
}

function keybindingMode(env: TerminalCapabilityEnv): TerminalKeybindingMode {
    const mode = env.TERMUI_KEYBINDINGS;
    return mode === 'vim' || mode === 'emacs' ? mode : 'default';
}

function supportsMouse(env: TerminalCapabilityEnv): boolean {
    if (env.TERM === 'dumb' || env.TERMUI_MOUSE === '0' || env.NO_MOUSE === '1') {
        return false;
    }
    if (env.TERMUI_MOUSE === '1') return true;

    const term = env.TERM ?? '';
    return /xterm|screen|tmux|rxvt|kitty|wezterm|alacritty|foot/i.test(term);
}

function supportsOsc(env: TerminalCapabilityEnv): boolean {
    if (env.TERM === 'dumb') return false;
    if (env.TERMUI_OSC === '0') return false;
    return true;
}

export function detectTerminalCapabilities(options: TerminalCapabilityOptions = {}): TerminalCapabilities {
    const env = options.env ?? process.env;
    const isTTY = options.isTTY ?? !!process.stdout?.isTTY;
    const platform = options.platform ?? process.platform;
    const depth = parseColorDepth(env, isTTY);
    const level = colorLevel(depth);
    const dumb = env.TERM === 'dumb';
    const unicodeEnabled = !dumb && !env.NO_UNICODE && platform !== 'win32';

    return {
        color: {
            enabled: depth !== ColorDepth.None,
            depth,
            level,
            ansi256: depth >= ColorDepth.Ansi256,
            truecolor: depth >= ColorDepth.TrueColor,
        },
        unicode: {
            enabled: unicodeEnabled,
            ambiguousWidth: env.TERMUI_AMBIGUOUS_WIDTH === '2' ? 2 : 1,
        },
        mouse: {
            supported: supportsMouse(env),
            sgr: supportsMouse(env) && !dumb,
        },
        screen: {
            alternateBuffer: !dumb && env.TERMUI_ALT_SCREEN !== '0',
        },
        escapeSequences: {
            csi: !dumb,
            osc: supportsOsc(env),
        },
        motion: !env.NO_MOTION && !env.CI,
        ci: !!env.CI,
        background: detectBackground(env),
        keybindingMode: keybindingMode(env),
    };
}

export function getTerminalCapabilities(): TerminalCapabilities {
    return overrideCapabilities ?? detectTerminalCapabilities();
}

export function setTerminalCapabilitiesForTests(capabilities: TerminalCapabilities | null): void {
    overrideCapabilities = capabilities;
}
