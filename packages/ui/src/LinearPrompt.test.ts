import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { LinearPrompt, type LinearPromptOption } from './LinearPrompt.js';

describe('LinearPrompt', () => {
    const options: LinearPromptOption[] = [
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' },
        { label: 'Option C', value: 'c' },
    ];

    it('renders question and options sequentially', () => {
        const prompt = new LinearPrompt(options, {
            question: 'Choose one:',
        });

        prompt.updateRect({
            x: 0,
            y: 0,
            width: 40,
            height: 5,
        });

        const screen = new Screen(40, 5);
        prompt.render(screen);

        const row0 = screen.back[0].map((c) => c.char).join('').trim();
        const row1 = screen.back[1].map((c) => c.char).join('').trim();
        const row2 = screen.back[2].map((c) => c.char).join('').trim();

        expect(row0).toContain('Choose one:');
        expect(row1).toContain('Option A');
        expect(row2).toContain('Option B');
    });

    it('marks selected option with ">" marker', () => {
        const prompt = new LinearPrompt(options, {
            question: 'Choose one:',
        });

        prompt.updateRect({
            x: 0,
            y: 0,
            width: 40,
            height: 5,
        });

        const screen = new Screen(40, 5);
        prompt.render(screen);

        const row1 = screen.back[1].map((c) => c.char).join('').trim();
        expect(row1).toMatch(/^>\s/);
    });

    it('moves selection down on down arrow key', () => {
        const prompt = new LinearPrompt(options, {
            question: 'Choose one:',
        });

        expect(prompt.selectedIndex).toBe(0);

        prompt.handleKey({
            key: 'down',
            ctrl: false,
            alt: false,
        } as any);

        expect(prompt.selectedIndex).toBe(1);
    });

    it('moves selection up on up arrow key', () => {
        const prompt = new LinearPrompt(options, {
            question: 'Choose one:',
        });

        prompt.handleKey({
            key: 'down',
            ctrl: false,
            alt: false,
        } as any);

        prompt.handleKey({
            key: 'up',
            ctrl: false,
            alt: false,
        } as any);

        expect(prompt.selectedIndex).toBe(0);
    });

    it('wraps around at boundaries', () => {
        const prompt = new LinearPrompt(options, {
            question: 'Choose one:',
        });

        // Try to go up from first item (should not wrap)
        prompt.handleKey({
            key: 'up',
            ctrl: false,
            alt: false,
        } as any);

        expect(prompt.selectedIndex).toBe(0);

        // Move to last item
        prompt.handleKey({
            key: 'down',
            ctrl: false,
            alt: false,
        } as any);
        prompt.handleKey({
            key: 'down',
            ctrl: false,
            alt: false,
        } as any);

        expect(prompt.selectedIndex).toBe(2);

        // Try to go down from last item (should not wrap)
        prompt.handleKey({
            key: 'down',
            ctrl: false,
            alt: false,
        } as any);

        expect(prompt.selectedIndex).toBe(2);
    });

    it('calls onSelect callback on enter key', () => {
        const onSelect = vi.fn();
        const prompt = new LinearPrompt(options, {
            question: 'Choose one:',
            onSelect,
        });

        prompt.handleKey({
            key: 'down',
            ctrl: false,
            alt: false,
        } as any);

        prompt.handleKey({
            key: 'enter',
            ctrl: false,
            alt: false,
        } as any);

        expect(onSelect).toHaveBeenCalledWith(options[1], 1);
    });

    it('returns selected option', () => {
        const prompt = new LinearPrompt(options, {
            question: 'Choose one:',
        });

        expect(prompt.selectedOption).toEqual(options[0]);

        prompt.handleKey({
            key: 'down',
            ctrl: false,
            alt: false,
        } as any);

        expect(prompt.selectedOption).toEqual(options[1]);
    });

    it('skips disabled options', () => {
        const disabledOptions: LinearPromptOption[] = [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b', disabled: true },
            { label: 'Option C', value: 'c' },
        ];

        const prompt = new LinearPrompt(disabledOptions, {
            question: 'Choose one:',
        });

        prompt.handleKey({
            key: 'down',
            ctrl: false,
            alt: false,
        } as any);

        // Should skip disabled option B and go to C
        expect(prompt.selectedIndex).toBe(2);
    });

    it('handles tab key as down navigation', () => {
        const prompt = new LinearPrompt(options, {
            question: 'Choose one:',
        });

        expect(prompt.selectedIndex).toBe(0);

        prompt.handleKey({
            key: 'tab',
            ctrl: false,
            alt: false,
        } as any);

        expect(prompt.selectedIndex).toBe(1);
    });

    it('does not call onSelect for disabled options', () => {
        const onSelect = vi.fn();
        const disabledOptions: LinearPromptOption[] = [
            { label: 'Option A', value: 'a', disabled: true },
            { label: 'Option B', value: 'b' },
        ];

        const prompt = new LinearPrompt(disabledOptions, {
            question: 'Choose one:',
            onSelect,
        });

        prompt.handleKey({
            key: 'enter',
            ctrl: false,
            alt: false,
        } as any);

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('renders disabled options with dim styling', () => {
        const disabledOptions: LinearPromptOption[] = [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b', disabled: true },
        ];

        const prompt = new LinearPrompt(disabledOptions, {
            question: 'Choose one:',
        });

        prompt.updateRect({
            x: 0,
            y: 0,
            width: 40,
            height: 4,
        });

        const screen = new Screen(40, 4);
        prompt.render(screen);

        // Check that disabled option has dim styling
        const row2 = screen.back[2];
        const hasDim = row2.some((cell) => cell.dim === true);
        expect(hasDim).toBe(true);
    });

    it('handles activeColor option', () => {
        const prompt = new LinearPrompt(options, {
            question: 'Choose one:',
            activeColor: { type: 'named', name: 'green' },
        });

        prompt.updateRect({
            x: 0,
            y: 0,
            width: 40,
            height: 5,
        });

        const screen = new Screen(40, 5);
        prompt.render(screen);

        // Check that active option has the custom color
        const row1 = screen.back[1];
        const activeCell = row1.find((cell) => cell.fg?.type === 'named' && cell.fg?.name === 'green');
        expect(activeCell).toBeDefined();
    });
});
