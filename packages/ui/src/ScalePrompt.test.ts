import { describe, it, expect, vi } from 'vitest';
import { Screen, createKeyEvent, stringWidth } from '@termuijs/core';
import { ScalePrompt } from './ScalePrompt.js';

function renderScalePrompt(prompt: ScalePrompt, width = 40, height = 3): Screen {
    const screen = new Screen(width, height);

    prompt.updateRect({
        x: 0,
        y: 0,
        width,
        height,
    });

    prompt.render(screen);

    return screen;
}

describe('ScalePrompt', () => {
    it('renders default 5 numbers', () => {
        const prompt = new ScalePrompt();
        const screen = renderScalePrompt(prompt);

        const rendered = screen.back[0].map((cell) => cell.char).join('');

        expect(rendered).toContain('[1]');
        expect(rendered).toContain('2');
        expect(rendered).toContain('3');
        expect(rendered).toContain('4');
        expect(rendered).toContain('5');
    });

    it('right key moves active right', () => {
        const prompt = new ScalePrompt();

        prompt.handleKey(createKeyEvent({
            key: 'right',
            ctrl: false,
            alt: false,
            shift: false,
            raw: Buffer.from('right'),
        }));

        expect(prompt.getValue()).toBe(2);

        const screen = renderScalePrompt(prompt);
        const rendered = screen.back[0].map((cell) => cell.char).join('');

        expect(rendered).toContain('1 [2] 3 4 5');
    });

    it('left key does not go below 1', () => {
        const prompt = new ScalePrompt();

        prompt.handleKey(createKeyEvent({
            key: 'left',
            ctrl: false,
            alt: false,
            shift: false,
            raw: Buffer.from('left'),
        }));

        expect(prompt.getValue()).toBe(1);

        const screen = renderScalePrompt(prompt);
        const rendered = screen.back[0].map((cell) => cell.char).join('');

        expect(rendered).toContain('[1]');
    });

    it('enter fires onSelect with current value', () => {
        const onSelect = vi.fn();
        const prompt = new ScalePrompt(undefined, { onSelect, max: 5 });

        prompt.handleKey(createKeyEvent({
            key: 'right',
            ctrl: false,
            alt: false,
            shift: false,
            raw: Buffer.from('right'),
        }));
        prompt.handleKey(createKeyEvent({
            key: 'right',
            ctrl: false,
            alt: false,
            shift: false,
            raw: Buffer.from('right'),
        }));
        prompt.handleKey(createKeyEvent({
            key: 'enter',
            ctrl: false,
            alt: false,
            shift: false,
            raw: Buffer.from('enter'),
        }));

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(3);
    });

    it('falls back to a finite max when max is NaN', () => {
        const prompt = new ScalePrompt(undefined, { max: NaN });

        prompt.handleKey(createKeyEvent({
            key: 'right',
            ctrl: false,
            alt: false,
            shift: false,
            raw: Buffer.from('right'),
        }));

        expect(prompt.getValue()).toBe(2);
        const screen = renderScalePrompt(prompt);
        const rendered = screen.back[0].map((cell) => cell.char).join('');
        expect(rendered).toContain('5');
    });

    it('falls back to a finite max when max is infinite', () => {
        const prompt = new ScalePrompt(undefined, { max: Infinity });
        const screen = renderScalePrompt(prompt);
        const rendered = screen.back[0].map((cell) => cell.char).join('');

        expect(prompt.getValue()).toBe(1);
        expect(rendered).toContain('[1]');
        expect(rendered).toContain('5');
    });

    it('clips and aligns end labels by cell width', () => {
        const prompt = new ScalePrompt(undefined, {
            endLabels: ['你好', '世界'],
        });
        const screen = new Screen(5, 3);
        const writeSpy = vi.spyOn(screen, 'writeString');
        prompt.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        prompt.render(screen);

        for (const [x, , text] of writeSpy.mock.calls) {
            expect(x + stringWidth(text)).toBeLessThanOrEqual(5);
        }
    });
});
