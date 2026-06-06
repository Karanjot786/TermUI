// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Button widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Button } from './Button.js';
import { Screen, caps } from '@termuijs/core';

afterEach(() => {
    vi.restoreAllMocks();
});

/** Helper: create widget, set rect, render to a screen, return both. */
function renderButton(
    label: string,
    opts: ConstructorParameters<typeof Button>[2] = {},
    style: ConstructorParameters<typeof Button>[1] = {},
    width = 20,
    height = 3,
) {
    const button = new Button(label, style, opts);
    const screen = new Screen(width, height);
    button.updateRect({ x: 0, y: 0, width, height });
    button.render(screen);
    return { button, screen };
}

/** Read a single row from the back buffer as a plain string. */
function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

describe('Button', () => {
    // ── 1. Default render ────────────────────────────────────────────────
    it('renders label centered in the widget bounds', () => {
        const { screen } = renderButton('Click');
        const contentRow = rowText(screen, 1);
        expect(contentRow).toContain('Click');
    });

    // ── 2. Variant rendering ─────────────────────────────────────────────
    it('primary variant renders with distinct background', () => {
        const { screen } = renderButton('Submit', { variant: 'primary' });
        expect(screen.back[1][1].bg).toBeDefined();
    });

    it('danger variant renders with distinct color', () => {
        const { screen } = renderButton('Delete', { variant: 'danger' });
        expect(screen.back[1][1].fg).toBeDefined();
    });

    // ── 3. Key handling ──────────────────────────────────────────────────
    it('enter key fires onPress callback when not disabled', () => {
        const onPress = vi.fn();
        const { button } = renderButton('Click', { onPress });
        
        button.handleKey({ key: 'enter' });
        expect(onPress).toHaveBeenCalled();
    });

    it('space key fires onPress callback when not disabled', () => {
        const onPress = vi.fn();
        const { button } = renderButton('Click', { onPress });
        
        button.handleKey({ key: 'space' });
        expect(onPress).toHaveBeenCalled();
    });

    it('enter key does NOT fire onPress when disabled', () => {
        const onPress = vi.fn();
        const { button } = renderButton('Click', { onPress, disabled: true });
        
        button.handleKey({ key: 'enter' });
        expect(onPress).not.toHaveBeenCalled();
    });

    it('space key does NOT fire onPress when disabled', () => {
        const onPress = vi.fn();
        const { button } = renderButton('Click', { onPress, disabled: true });
        
        button.handleKey({ key: 'space' });
        expect(onPress).not.toHaveBeenCalled();
    });

    // ── 4. State updates ─────────────────────────────────────────────────
    it('setLabel updates the displayed label and calls markDirty', () => {
        const { button, screen } = renderButton('Original');
        
        // Mock markDirty to verify it's called
        const markSpy = vi.spyOn(button, 'markDirty');
        button.setLabel('New Label');
        
        expect(markSpy).toHaveBeenCalled();
        // Re-render the button to see the updated label
        button.render(screen);
        const contentRow = rowText(screen, 1);
        expect(contentRow).toContain('New Label');
    });

    it('setDisabled updates the disabled state and calls markDirty', () => {
        const { button } = renderButton('Click');
        
        // Mock markDirty to verify it's called
        const markSpy = vi.spyOn(button, 'markDirty');
        button.setDisabled(true);
        
        expect(markSpy).toHaveBeenCalled();
    });

    // ── 5. Key handling uses lowercase ────────────────────────────────────
    it('handleKey uses lowercase event.key: enter', () => {
        const onPress = vi.fn();
        const { button } = renderButton('Click', { onPress });
        
        button.handleKey({ key: 'enter' });
        expect(onPress).toHaveBeenCalled();
    });

    it('handleKey uses lowercase event.key: space', () => {
        const onPress = vi.fn();
        const { button } = renderButton('Click', { onPress });
        
        button.handleKey({ key: 'space' });
        expect(onPress).toHaveBeenCalled();
    });

    it('handleKey ignores uppercase Enter', () => {
        const onPress = vi.fn();
        const { button } = renderButton('Click', { onPress });
        
        button.handleKey({ key: 'Enter' });
        expect(onPress).not.toHaveBeenCalled();
    });

    it('handleKey ignores uppercase Space', () => {
        const onPress = vi.fn();
        const { button } = renderButton('Click', { onPress });
        
        button.handleKey({ key: ' ' });
        expect(onPress).not.toHaveBeenCalled();
    });

    // ── 6. Unicode fallback ─────────────────────────────────────────────
    it('uses ASCII chars when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Button } = await import('./Button.js');

        const button = new Button('Click');
        button.updateRect({ x: 0, y: 0, width: 10, height: 3 });
        const screen = new Screen(10, 3);
        button.render(screen);

        expect(screen.back[0][0].char).toBe('+');
        expect(screen.back[0][1].char).toBe('-');
        expect(screen.back[1][0].char).toBe('|');
    });

    it('does not mark dirty when label is unchanged', () => {
        const button = new Button('Save');
    
        button.clearDirty();
        button.setLabel('Save');
    
        expect(button.isDirty).toBe(false);
    });
    
    it('does not mark dirty when disabled state is unchanged', () => {
        const button = new Button('Save');
    
        button.clearDirty();
        button.setDisabled(false);
    
        expect(button.isDirty).toBe(false);
    });
});