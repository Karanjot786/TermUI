// ─────────────────────────────────────────────────────
// @termuijs/quick — Tests for new Sprint 3 widget builders
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Widget } from '@termuijs/widgets';

// ── Missing builders (RED — these should fail until implemented) ──────────────

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
        expect((w as any)._title).toBe('My Card');
    });

    it('card defaults to brightBlack border color when omitted', async () => {
        const { card, text } = await import('./widgets.js');
        const child = text('Test');
        const w = card([child]);
        expect(w).toBeInstanceOf(Widget);
        expect(((w as any)._borderColor as any)?.name).toBe('brightBlack');
        expect(((w as any)._style?.borderColor as any)?.name).toBe('brightBlack');
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
        expect(((w as any)._style?.borderColor as any)?.name).toBe('brightBlack');
    });
});
