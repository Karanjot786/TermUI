import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { caps, Screen } from '@termuijs/core';
import { Callout } from './Callout.js';

describe('Callout', () => {
    beforeEach(() => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function render(widget: Callout, width = 80, height = 1): string {
        const screen = new Screen(width, height);
        (widget as unknown as { _rect: { x: number; y: number; width: number; height: number } })._rect = { x: 0, y: 0, width, height };
        widget.render(screen);
        return screen.getLine(0).trimEnd();
    }

    it('renders info variant with icon and message', () => {
        const callout = new Callout('hello world');
        const output = render(callout);
        expect(output).toBe('\u2139 hello world');
    });

    it('renders title when provided', () => {
        const callout = new Callout('hello world', {}, { title: 'Note' });
        const output = render(callout);
        expect(output).toBe('\u2139 Note hello world');
    });

    it('setMessage updates text', () => {
        const callout = new Callout('hello');
        callout.setMessage('updated');
        const output = render(callout);
        expect(output).toBe('\u2139 updated');
    });

    it('setVariant changes the icon', () => {
        const callout = new Callout('alert', {}, { variant: 'info' });
        callout.setVariant('danger');
        const output = render(callout);
        expect(output).toBe('\u2717 alert');
    });

    it('handles empty message without error', () => {
        const callout = new Callout('');
        const output = render(callout);
        expect(output).toBe('\u2139');
    });

    it('does not mark dirty when message is unchanged', () => {
        const callout = new Callout('hello');
    
        callout.clearDirty();
        callout.setMessage('hello');
    
        expect(callout.isDirty).toBe(false);
    });
    
    it('does not mark dirty when variant is unchanged', () => {
        const callout = new Callout(
            'hello',
            {},
            { variant: 'info' },
        );
    
        callout.clearDirty();
        callout.setVariant('info');
    
        expect(callout.isDirty).toBe(false);
    });

    it('truncates double-width characters properly without overflowing available width', () => {
        const callout = new Callout('🌟🌟🌟🌟🌟');
        const output = render(callout, 6);
        expect(output.length).toBeLessThanOrEqual(6);
    });

    it('returns message via getMessage', () => {
        const callout = new Callout('initial message');
        expect(callout.getMessage()).toBe('initial message');
        callout.setMessage('updated message');
        expect(callout.getMessage()).toBe('updated message');
    });

    it('returns variant via getVariant', () => {
        const callout = new Callout('alert', {}, { variant: 'warn' });
        expect(callout.getVariant()).toBe('warn');
        callout.setVariant('success');
        expect(callout.getVariant()).toBe('success');
    });

    it('gets and sets title via getTitle and setTitle', () => {
        const callout = new Callout('msg', {}, { title: 'Initial Title' });
        expect(callout.getTitle()).toBe('Initial Title');
        callout.setTitle('Updated Title');
        expect(callout.getTitle()).toBe('Updated Title');
        expect(callout.isDirty).toBe(true);
    });

    it('does not mark dirty when title is unchanged', () => {
        const callout = new Callout('msg', {}, { title: 'Same' });
        callout.clearDirty();
        callout.setTitle('Same');
        expect(callout.isDirty).toBe(false);
    });
});
