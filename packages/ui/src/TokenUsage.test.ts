import { describe, it, expect } from 'vitest';
import { TokenUsage } from './TokenUsage.js';
import { Screen } from '@termuijs/core';

describe('TokenUsage', () => {
    it('initializes with default options', () => {
        const widget = new TokenUsage();
        expect(widget.inputTokens).toBe(0);
        expect(widget.outputTokens).toBe(0);
    });

    it('updates usage values', () => {
        const widget = new TokenUsage();
        widget.setUsage(100, 200);
        expect(widget.inputTokens).toBe(100);
        expect(widget.outputTokens).toBe(200);

        widget.setInputTokens(150);
        expect(widget.inputTokens).toBe(150);

        widget.setOutputTokens(250);
        expect(widget.outputTokens).toBe(250);
    });

    it('renders token string to screen', () => {
        const screen = new Screen(40, 5);
        const widget = new TokenUsage({ inputTokens: 50, outputTokens: 100 });
        widget.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        widget.render(screen);

        const row0 = screen.back[0].map((cell) => cell.char).join('');
        expect(row0).toContain('Tokens: in: 50 | out: 100');
    });
});
