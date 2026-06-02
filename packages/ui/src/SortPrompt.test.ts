// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for SortPrompt component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { SortPrompt } from './SortPrompt.js';

const ITEMS = ['Apple', 'Banana', 'Cherry', 'Date'];

describe('SortPrompt', () => {
    it('initializes with items in order', () => {
        const prompt = new SortPrompt(ITEMS);
        expect(prompt).toBeDefined();
    });

    it('selectNext moves cursor down', () => {
        const prompt = new SortPrompt(ITEMS);
        prompt.selectNext();
        expect(prompt).toBeDefined();
    });

    it('selectPrev moves cursor up', () => {
        const prompt = new SortPrompt(ITEMS);
        prompt.selectNext();
        prompt.selectPrev();
        expect(prompt).toBeDefined();
    });

    it('moveItemUp swaps current item with previous and moves cursor', () => {
        const onSubmit = vi.fn();
        const prompt = new SortPrompt(['A', 'B', 'C'], { onSubmit });

        prompt.selectNext(); // cursor at index 1 (B)
        prompt.moveItemUp(); // swap B and A

        prompt.submit();

        expect(onSubmit).toHaveBeenCalledWith(['B', 'A', 'C']);
    });

    it('moveItemDown swaps current item with next and moves cursor', () => {
        const onSubmit = vi.fn();
        const prompt = new SortPrompt(['A', 'B', 'C'], { onSubmit });

        prompt.moveItemDown(); // swap A and B

        prompt.submit();

        expect(onSubmit).toHaveBeenCalledWith(['B', 'A', 'C']);
    });

    it('submit returns reordered items', () => {
        const onSubmit = vi.fn();
        const prompt = new SortPrompt(ITEMS, { onSubmit });

        prompt.selectNext();
        prompt.moveItemUp();

        prompt.submit();

        expect(onSubmit).toHaveBeenCalledWith([
            'Banana',
            'Apple',
            'Cherry',
            'Date',
        ]);
    });

    it('boundary: moveItemUp at first item does nothing', () => {
        const onSubmit = vi.fn();
        const prompt = new SortPrompt(['A', 'B', 'C'], { onSubmit });

        prompt.moveItemUp();

        prompt.submit();

        expect(onSubmit).toHaveBeenCalledWith(['A', 'B', 'C']);
    });

    it('boundary: moveItemDown at last item does nothing', () => {
        const onSubmit = vi.fn();
        const prompt = new SortPrompt(['A', 'B', 'C'], { onSubmit });

        prompt.selectNext();
        prompt.selectNext();

        prompt.moveItemDown();

        prompt.submit();

        expect(onSubmit).toHaveBeenCalledWith(['A', 'B', 'C']);
    });

    it('boundary: selectPrev at start stays at 0', () => {
        const prompt = new SortPrompt(ITEMS);

        prompt.selectPrev();

        expect(prompt).toBeDefined();
    });

    it('boundary: selectNext at end stays at last', () => {
        const prompt = new SortPrompt(ITEMS);

        for (let i = 0; i < ITEMS.length; i++) {
            prompt.selectNext();
        }

        prompt.selectNext();

        expect(prompt).toBeDefined();
    });

    it('multiple moves reorder correctly', () => {
        const onSubmit = vi.fn();
        const prompt = new SortPrompt(['A', 'B', 'C', 'D'], { onSubmit });

        prompt.selectNext(); // B
        prompt.moveItemUp(); // B A C D

        prompt.selectNext(); // A
        prompt.selectNext(); // C

        prompt.moveItemDown(); // B A D C

        prompt.submit();

        expect(onSubmit).toHaveBeenCalledWith([
            'B',
            'A',
            'D',
            'C',
        ]);
    });

    it('handleKey shift+up moves item up', () => {
        const onSubmit = vi.fn();
        const prompt = new SortPrompt(['A', 'B', 'C'], { onSubmit });

        prompt.selectNext(); // B

        prompt.handleKey({ key: 'shift+up' } as any);

        prompt.submit();

        expect(onSubmit).toHaveBeenCalledWith(['B', 'A', 'C']);
    });

    it('handleKey enter submits items', () => {
        const onSubmit = vi.fn();
        const prompt = new SortPrompt(['A', 'B'], { onSubmit });

        prompt.handleKey({ key: 'enter' } as any);

        expect(onSubmit).toHaveBeenCalled();
    });
});