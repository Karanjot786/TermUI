import { describe, it, expect, vi } from 'vitest';
import { Screen, type KeyEvent, caps } from '@termuijs/core';
import { EditablePrompt } from './EditablePrompt.js';

// Helper to fix repeated KeyEvent type assertions (CodeRabbit requirement)
const makeKeyEvent = (key: string): KeyEvent => 
  ({ key } as Partial<KeyEvent> as KeyEvent);

const MIXED_CHOICES = [
    { type: 'checkbox' as const, name: 'verbose', message: 'Verbose output' },
    { type: 'text' as const, name: 'output', message: 'Output path', initial: './dist' },
    { type: 'checkbox' as const, name: 'minify', message: 'Minify' },
];

describe('EditablePrompt', () => {
    describe('Initialization', () => {
        it('initializes with correct result', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            const result = prompt.result;
            expect(result.selected).toEqual([]);
            expect(result.values.output).toBe('./dist');
        });

        it('initializes with message', () => {
            const prompt = new EditablePrompt({
                message: 'Configure options',
                choices: MIXED_CHOICES,
            });

            const screen = new Screen(40, 10);
            prompt.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            prompt.render(screen);

            const row0 = screen.back[0].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            expect(row0).toContain('Configure options');
        });
    });

    describe('Checkbox Toggle', () => {
        it('toggles checkbox on space key', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            prompt.handleKey(makeKeyEvent('space'));

            expect(prompt.result.selected).toContain('verbose');
        });

        it('toggles multiple checkboxes', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            // Select first checkbox
            prompt.handleKey(makeKeyEvent('space'));
            expect(prompt.result.selected).toEqual(['verbose']);

            // Navigate down to skip text field
            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('down'));

            // Select third checkbox (minify)
            prompt.handleKey(makeKeyEvent('space'));
            expect(prompt.result.selected).toEqual(['verbose', 'minify']);
        });

        it('untoggle checkbox on second space', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            prompt.handleKey(makeKeyEvent('space'));
            expect(prompt.result.selected).toContain('verbose');

            prompt.handleKey(makeKeyEvent('space'));
            expect(prompt.result.selected).toEqual([]);
        });

        it('renders checked checkboxes correctly', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            prompt.handleKey(makeKeyEvent('space'));

            const screen = new Screen(50, 10);
            prompt.updateRect({ x: 0, y: 0, width: 50, height: 10 });
            prompt.render(screen);

            const row0 = screen.back[0].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            expect(row0).toContain('[x]');
        });
    });

    describe('Text Field Editing', () => {
        it('enters edit mode on enter key', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            // Navigate to text field (index 1)
            prompt.handleKey(makeKeyEvent('down'));

            // Enter edit mode
            prompt.handleKey(makeKeyEvent('enter'));

            const screen = new Screen(50, 10);
            prompt.updateRect({ x: 0, y: 0, width: 50, height: 10 });
            prompt.render(screen);

            const row1 = screen.back[1].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            expect(row1).toContain('_'); // Editing cursor
        });

        it('appends characters while editing', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('enter'));

            // Clear existing and add new value
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));

            prompt.handleKey(makeKeyEvent('b'));
            prompt.handleKey(makeKeyEvent('u'));
            prompt.handleKey(makeKeyEvent('i'));
            prompt.handleKey(makeKeyEvent('l'));
            prompt.handleKey(makeKeyEvent('d'));

            // Submit edit
            prompt.handleKey(makeKeyEvent('enter'));

            expect(prompt.result.values.output).toBe('build');
        });

        it('cancels edit on escape key', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            const initialValue = prompt.result.values.output;

            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('enter'));

            // Type something
            prompt.handleKey(makeKeyEvent('x'));
            prompt.handleKey(makeKeyEvent('y'));
            prompt.handleKey(makeKeyEvent('z'));

            // Cancel
            prompt.handleKey(makeKeyEvent('escape'));

            // Value should remain unchanged
            expect(prompt.result.values.output).toBe(initialValue);
        });

        it('handles backspace while editing', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('enter'));

            // Clear initial value
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));

            prompt.handleKey(makeKeyEvent('t'));
            prompt.handleKey(makeKeyEvent('e'));
            prompt.handleKey(makeKeyEvent('s'));
            prompt.handleKey(makeKeyEvent('backspace'));

            prompt.handleKey(makeKeyEvent('enter'));

            expect(prompt.result.values.output).toBe('te');
        });

        it('renders text field with current value', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            const screen = new Screen(50, 10);
            prompt.updateRect({ x: 0, y: 0, width: 50, height: 10 });
            prompt.render(screen);

            const row1 = screen.back[1].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            expect(row1).toContain('Output path');
            expect(row1).toContain('./dist');
        });
    });

    describe('Navigation', () => {
        it('navigates down through items', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            const screen = new Screen(50, 10);
            prompt.updateRect({ x: 0, y: 0, width: 50, height: 10 });

            const focusMarker = caps.unicode ? '❯' : '>';

            // At index 0
            prompt.render(screen);
            let row0 = screen.back[0].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            expect(row0).toContain(focusMarker);

            // Navigate down
            prompt.handleKey(makeKeyEvent('down'));
            prompt.render(screen);
            row0 = screen.back[0].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            const row1 = screen.back[1].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            expect(row0).not.toContain(focusMarker);
            expect(row1).toContain(focusMarker);
        });

        it('navigates up through items', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('down'));

            // Navigate up
            prompt.handleKey(makeKeyEvent('up'));

            const focusMarker = caps.unicode ? '❯' : '>';

            const screen = new Screen(50, 10);
            prompt.updateRect({ x: 0, y: 0, width: 50, height: 10 });
            prompt.render(screen);

            const row1 = screen.back[1].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            expect(row1).toContain(focusMarker);
        });

        it('does not navigate while editing', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('enter')); // Enter edit mode

            const focusMarker = caps.unicode ? '❯' : '>';
            const screen = new Screen(50, 10);
            prompt.updateRect({ x: 0, y: 0, width: 50, height: 10 });

            // Render before navigation attempts
            prompt.render(screen);
            let row1 = screen.back[1].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            expect(row1).toContain('_'); // Verify editing cursor is visible

            // Try to navigate
            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('up'));

            // Verify focus and editing state unchanged
            prompt.render(screen);
            row1 = screen.back[1].map((c: any) => c.char).join('').trim(); // Cell type required for screen back buffer rendering
            expect(row1).toContain(focusMarker); // Still focused on row 1
            expect(row1).toContain('_'); // Still in edit mode
        });
    });

    describe('Mixed List', () => {
        it('handles mixed checkbox and text fields', () => {
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
            });

            // Check first checkbox
            prompt.handleKey(makeKeyEvent('space'));

            // Navigate to text field and edit it
            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('enter'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('backspace'));
            prompt.handleKey(makeKeyEvent('b'));
            prompt.handleKey(makeKeyEvent('u'));
            prompt.handleKey(makeKeyEvent('i'));
            prompt.handleKey(makeKeyEvent('l'));
            prompt.handleKey(makeKeyEvent('d'));
            prompt.handleKey(makeKeyEvent('enter'));

            // Navigate to third checkbox and check it
            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('space'));

            const result = prompt.result;
            expect(result.selected).toEqual(['verbose', 'minify']);
            expect(result.values.output).toBe('build');
        });
    });

    describe('Callback', () => {
        it('calls onChange when checkbox toggled', () => {
            const onChange = vi.fn();
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
                onChange,
            });

            prompt.handleKey(makeKeyEvent('space'));

            expect(onChange).toHaveBeenCalledWith({
                selected: ['verbose'],
                values: { output: './dist' },
            });
        });

        it('calls onChange when text value submitted', () => {
            const onChange = vi.fn();
            const prompt = new EditablePrompt({
                choices: MIXED_CHOICES,
                onChange,
            });

            prompt.handleKey(makeKeyEvent('down'));
            prompt.handleKey(makeKeyEvent('enter'));
            prompt.handleKey(makeKeyEvent('x'));
            prompt.handleKey(makeKeyEvent('enter'));

            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        output: expect.stringContaining('x'),
                    }),
                })
            );
        });
    });
});