import { afterEach, describe, expect, it } from 'vitest';
import { ColorDepth } from '../style/Color.js';
import {
    detectTerminalCapabilities,
    getTerminalCapabilities,
    setTerminalCapabilitiesForTests,
    type TerminalCapabilities,
} from './capabilities.js';

describe('detectTerminalCapabilities', () => {
    it('honors NO_COLOR and TERM=dumb as hard fallbacks', () => {
        const capabilities = detectTerminalCapabilities({
            env: { NO_COLOR: '1', FORCE_COLOR: '3', TERM: 'xterm-256color' },
            isTTY: true,
            platform: 'linux',
        });

        expect(capabilities.color).toMatchObject({
            enabled: false,
            depth: ColorDepth.None,
            level: 'none',
            ansi256: false,
            truecolor: false,
        });

        const dumb = detectTerminalCapabilities({ env: { TERM: 'dumb' }, isTTY: true, platform: 'linux' });
        expect(dumb.escapeSequences).toEqual({ csi: false, osc: false });
        expect(dumb.screen.alternateBuffer).toBe(false);
        expect(dumb.mouse.supported).toBe(false);
    });

    it('negotiates color levels from FORCE_COLOR, COLORTERM, and TERM', () => {
        expect(detectTerminalCapabilities({ env: { FORCE_COLOR: '1' }, platform: 'linux' }).color.level).toBe('basic');
        expect(detectTerminalCapabilities({ env: { FORCE_COLOR: '2' }, platform: 'linux' }).color.level).toBe('ansi256');
        expect(detectTerminalCapabilities({ env: { FORCE_COLOR: '3' }, platform: 'linux' }).color.level).toBe('truecolor');
        expect(detectTerminalCapabilities({ env: { COLORTERM: '24bit' }, platform: 'linux' }).color.truecolor).toBe(true);
        expect(detectTerminalCapabilities({ env: { TERM: 'screen-256color' }, platform: 'linux' }).color.ansi256).toBe(true);
    });

    it('tracks unicode width, mouse support, background, and keybinding fallbacks', () => {
        const capabilities = detectTerminalCapabilities({
            env: {
                TERM: 'xterm-256color',
                TERMUI_AMBIGUOUS_WIDTH: '2',
                COLORFGBG: '0;15',
                TERMUI_KEYBINDINGS: 'vim',
            },
            platform: 'linux',
        });

        expect(capabilities.unicode).toEqual({ enabled: true, ambiguousWidth: 2 });
        expect(capabilities.mouse).toEqual({ supported: true, sgr: true });
        expect(capabilities.background).toBe('light');
        expect(capabilities.keybindingMode).toBe('vim');
    });

    it('disables unicode on Windows unless explicitly handled by callers', () => {
        const capabilities = detectTerminalCapabilities({
            env: { TERM: 'xterm-256color' },
            platform: 'win32',
        });

        expect(capabilities.unicode.enabled).toBe(false);
    });
});

describe('getTerminalCapabilities', () => {
    afterEach(() => {
        setTerminalCapabilitiesForTests(null);
    });

    it('allows tests to install a deterministic negotiated profile', () => {
        const profile: TerminalCapabilities = detectTerminalCapabilities({
            env: { FORCE_COLOR: '3', TERMUI_MOUSE: '1' },
            platform: 'linux',
        });

        setTerminalCapabilitiesForTests(profile);

        expect(getTerminalCapabilities()).toBe(profile);
    });
});
