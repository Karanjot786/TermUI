// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for AutoThemeProvider component
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@termuijs/jsx', async () => {
    const actual = await vi.importActual<any>('../../jsx/src/index.js');
    const hooks = await vi.importActual<any>('../../jsx/src/hooks.js');
    return { ...actual, ...hooks };
});

import { AutoThemeProvider, useTheme, ThemeContext } from './AutoThemeProvider.js';
import { defaultDark, defaultLight } from './tokens.js';
import * as jsxRuntime from '@termuijs/jsx';
import { caps } from '@termuijs/core';

const {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    runEffects,
    destroyFiber,
} = jsxRuntime as any;

describe('AutoThemeProvider', () => {
    let originalEnv: typeof process.env;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
        clearCurrentFiber();
    });

    it('selects dark theme by default when detectDark() is true', () => {
        process.env.TERM_BACKGROUND = 'dark';
        delete process.env.COLORFGBG;

        const fiber = createFiber();
        setCurrentFiber(fiber);
        const vnode = AutoThemeProvider({});
        clearCurrentFiber();

        expect(vnode.props.value).toMatchObject({ Normal: { fg: defaultDark.fg, bg: defaultDark.bg } });
        destroyFiber(fiber);
    });

    it('selects light theme by default when detectDark() is false', () => {
        process.env.TERM_BACKGROUND = 'light';
        delete process.env.COLORFGBG;

        const fiber = createFiber();
        setCurrentFiber(fiber);
        const vnode = AutoThemeProvider({});
        clearCurrentFiber();

        expect(vnode.props.value).toMatchObject({ Normal: { fg: defaultLight.fg, bg: defaultLight.bg } });
        destroyFiber(fiber);
    });

    it('respects custom dark and light theme overrides', () => {
        const customDark = { ...defaultDark, bg: '#111111' };
        const customLight = { ...defaultLight, bg: '#eeeeee' };

        // Dark mode
        process.env.TERM_BACKGROUND = 'dark';
        let fiber = createFiber();
        setCurrentFiber(fiber);
        let vnode = AutoThemeProvider({ darkTheme: customDark, lightTheme: customLight });
        clearCurrentFiber();
        expect(vnode.props.value).toMatchObject({ Normal: { fg: customDark.fg, bg: customDark.bg } });
        destroyFiber(fiber);

        // Light mode
        process.env.TERM_BACKGROUND = 'light';
        fiber = createFiber();
        setCurrentFiber(fiber);
        vnode = AutoThemeProvider({ darkTheme: customDark, lightTheme: customLight });
        clearCurrentFiber();
        expect(vnode.props.value).toMatchObject({ Normal: { fg: customLight.fg, bg: customLight.bg } });
        destroyFiber(fiber);
    });

    it('adds SIGWINCH listener if caps.color is true', () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(true);
        const onSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
        const offSpy = vi.spyOn(process, 'off').mockImplementation(() => process);

        const fiber = createFiber();
        setCurrentFiber(fiber);
        AutoThemeProvider({});
        clearCurrentFiber();
        runEffects(fiber);

        expect(onSpy).toHaveBeenCalledWith('SIGWINCH', expect.any(Function));

        destroyFiber(fiber);
        expect(offSpy).toHaveBeenCalledWith('SIGWINCH', expect.any(Function));
    });

    it('does not add SIGWINCH listener if caps.color is false', () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(false);
        const onSpy = vi.spyOn(process, 'on').mockImplementation(() => process);

        const fiber = createFiber();
        setCurrentFiber(fiber);
        AutoThemeProvider({});
        clearCurrentFiber();
        runEffects(fiber);

        expect(onSpy).not.toHaveBeenCalled();
        destroyFiber(fiber);
    });

    it('useTheme returns context value when inside provider', () => {
        const fiber = createFiber();
        const customTheme = { ...defaultDark, bg: '#123456' };
        fiber.contextValues.set(ThemeContext._id, customTheme);

        setCurrentFiber(fiber);
        const theme = useTheme();
        clearCurrentFiber();

        expect(theme).toBe(customTheme);
        destroyFiber(fiber);
    });

    it('useTheme returns systemTheme when outside provider', () => {
        const fiber = createFiber();
        setCurrentFiber(fiber);
        const theme = useTheme();
        clearCurrentFiber();

        expect(theme).toBeDefined();
        destroyFiber(fiber);
    });
});
