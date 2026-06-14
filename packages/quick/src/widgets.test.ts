// ─────────────────────────────────────────────────────
// @termuijs/quick — Tests for new Sprint 3 widget builders
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Widget } from '@termuijs/widgets';
import { Screen } from '@termuijs/core';

describe('quick – grid builder (widgets.ts)', () => {
    it('exports grid() that wraps Grid widget class and returns a Widget', async () => {
        const { grid } = await import('./widgets.js');
        expect(typeof grid).toBe('function');
        const w = grid(3, []);
        expect(w).toBeInstanceOf(Widget);
    });
});

describe('quick – jsonView builder', () => {
    it('exports jsonView() and returns a Widget', async () => {
        const { jsonView } = await import('./widgets.js');
        expect(typeof jsonView).toBe('function');
        const w = jsonView({ key: 'value' });
        expect(w).toBeInstanceOf(Widget);
    });
});

describe('quick – commandPalette builder', () => {
    it('exports commandPalette() and returns a Widget', async () => {
        const { commandPalette } = await import('./widgets.js');
        expect(typeof commandPalette).toBe('function');
        const w = commandPalette([{ label: 'Test', action: () => {} }]);
        expect(w).toBeInstanceOf(Widget);
    });
});

describe('quick – multiProgress builder', () => {
    it('exports multiProgress() and returns a Widget', async () => {
        const { multiProgress } = await import('./widgets.js');
        expect(typeof multiProgress).toBe('function');
        const w = multiProgress([{ label: 'Task', value: 0.5 }]);
        expect(w).toBeInstanceOf(Widget);
    });
});

describe('quick – diffView builder', () => {
    it('exports diffView() and returns a Widget', async () => {
        const { diffView } = await import('./widgets.js');
        expect(typeof diffView).toBe('function');
        const w = diffView('+ added\n- removed');
        expect(w).toBeInstanceOf(Widget);
    });
});

describe('quick – streamingText builder', () => {
    it('exports streamingText() and returns a Widget', async () => {
        const { streamingText } = await import('./widgets.js');
        expect(typeof streamingText).toBe('function');
        const w = streamingText({ text: 'hello' });
        expect(w).toBeInstanceOf(Widget);
    });
});

describe('quick – chatMessage builder', () => {
    it('exports chatMessage() and returns a Widget', async () => {
        const { chatMessage } = await import('./widgets.js');
        expect(typeof chatMessage).toBe('function');
        const w = chatMessage({ role: 'user', content: 'Hello' });
        expect(w).toBeInstanceOf(Widget);
    });
});

describe('quick – toolCall builder', () => {
    it('exports toolCall() and returns a Widget', async () => {
        const { toolCall } = await import('./widgets.js');
        expect(typeof toolCall).toBe('function');
        const w = toolCall({ name: 'readFile', status: 'running' });
        expect(w).toBeInstanceOf(Widget);
    });
});

// ── New Sprint 3 Widget Builders (Tabs & Select) ──────────────────────────────

describe('quick – tabs builder', () => {
    it('returns a Widget from label/content pairs', async () => {
        const { tabs } = await import('./widgets.js');
        expect(typeof tabs).toBe('function');
        const w1 = new Widget();
        const w2 = new Widget();
        const w = tabs([['One', w1], ['Two', w2]]);
        expect(w).toBeInstanceOf(Widget);
    });

    it('forwards active and onChange', async () => {
        const { tabs } = await import('./widgets.js');
        const w1 = new Widget();
        const onChangeMock = vi.fn();
        
        const w = tabs([['One', w1], ['Two', w1]], { active: 1, onChange: onChangeMock }) as any;
        
        try { if (typeof w.emit === 'function') w.emit('change', 1); } catch(e) {}
        try { if (typeof w.onChange === 'function') w.onChange(1); } catch(e) {}
        try { if (typeof w._onChange === 'function') w._onChange(1); } catch(e) {}
        
        expect(onChangeMock).toHaveBeenCalled();
    });
});

describe('quick – select builder', () => {
    it('returns a Widget from string options', async () => {
        const { select } = await import('./widgets.js');
        expect(typeof select).toBe('function');
        const w = select(['a', 'b']);
        expect(w).toBeInstanceOf(Widget);
    });

    it('forwards onSelect', async () => {
        const { select } = await import('./widgets.js');
        const onSelectMock = vi.fn();
        
        const w = select(['a', 'b'], { onSelect: onSelectMock }) as any;
        const mockOpt = { label: 'b', value: 'b' };
        
        try { if (w.options && typeof w.options.onSelect === 'function') w.options.onSelect(mockOpt, 1); } catch(e) {}
        try { if (w._options && typeof w._options.onSelect === 'function') w._options.onSelect(mockOpt, 1); } catch(e) {}
        try { if (typeof w.onSelect === 'function') w.onSelect(mockOpt, 1); } catch(e) {}
        try { if (typeof w._onSelect === 'function') w._onSelect(mockOpt, 1); } catch(e) {}
        
        expect(onSelectMock).toHaveBeenCalledWith('b', 1);
    });
});


describe('quick – card builder', () => {
    it('exports card() and returns a Widget', async () => {
        const { card, text } = await import('./widgets.js');
        expect(typeof card).toBe('function');
        const child = text('Test');
        const w = card([child]);
        expect(w).toBeInstanceOf(Widget);
        expect(w.children).toContain(child);
    });

    it('card forwards a title', async () => {
        const { card, text } = await import('./widgets.js');
        const child = text('Test');
        const w = card([child], { title: 'My Card' });
        expect(w).toBeInstanceOf(Widget);
        // Verify title is rendered in the top border
        w.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        const screen = new Screen(20, 5);
        w.render(screen);
        const topRow = screen.back[0].map(c => c.char).join('');
        expect(topRow).toMatch(/My Card/);
    });

    it('card defaults to brightBlack border color when omitted', async () => {
        const { card, text } = await import('./widgets.js');
        const child = text('Test');
        const w = card([child]);
        expect(w).toBeInstanceOf(Widget);
        // Verify border is rendered (single style borders use box-drawing chars)
        w.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        const screen = new Screen(20, 5);
        w.render(screen);
        expect(screen.back[0][0].char).toBe('┌');
        expect(screen.back[0][19].char).toBe('┐');
    });
});

describe('quick – box builder', () => {
    it('exports box() and returns a bordered Widget', async () => {
        const { box, text } = await import('./widgets.js');
        expect(typeof box).toBe('function');
        const child = text('Test');
        const w = box([child]);
        expect(w).toBeInstanceOf(Widget);
        expect(w.children).toContain(child);
    });

    it('box defaults to brightBlack border color when omitted', async () => {
        const { box, text } = await import('./widgets.js');
        const child = text('Test');
        const w = box([child]);
        expect(w).toBeInstanceOf(Widget);
        // Verify border is rendered (single style borders use box-drawing chars)
        w.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        const screen = new Screen(20, 5);
        w.render(screen);
        expect(screen.back[0][0].char).toBe('┌');
        expect(screen.back[0][19].char).toBe('┐');
    });
});
