// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Wizard component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { Box, TextInput } from '@termuijs/widgets';
import { Wizard } from './Wizard.js';

const makeSteps = () => [
    { title: 'Configure Account', render: () => new Box() },
    { title: 'Configure Database', render: () => new TextInput() },
    { title: 'Confirmation', render: () => new Box() },
];

describe('Wizard', () => {
    it('renders step indicator correctly', () => {
        const wizard = new Wizard(makeSteps());
        wizard.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);
        wizard.render(screen);

        const renderedText = screen.back[0].map((c) => c.char).join('');
        expect(renderedText).toContain('Step 1 of 3: Configure Account');
    });

    it('advances to next step on handleKey right/n', () => {
        const wizard = new Wizard(makeSteps());
        wizard.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);

        // Right Arrow key triggers navigation
        wizard.handleKey({ key: 'right', ctrl: false, alt: false } as any);
        screen.clear();
        wizard.render(screen);
        let renderedText = screen.back[0].map((c) => c.char).join('');
        expect(wizard.currentStepIndex).toBe(1);
        expect(renderedText).toContain('Step 2 of 3: Configure Database');

        // 'n' key triggers navigation
        wizard.handleKey({ key: 'n', ctrl: false, alt: false } as any);
        screen.clear();
        wizard.render(screen);
        renderedText = screen.back[0].map((c) => c.char).join('');
        expect(wizard.currentStepIndex).toBe(2);
        expect(renderedText).toContain('Step 3 of 3: Confirmation');
    });

    it('validation string blocks advancement and stores/renders error', () => {
        const validateMock = vi.fn().mockReturnValue('Username must not be empty');
        const customSteps = [
            { title: 'Configure Account', render: () => new Box(), validate: validateMock },
            { title: 'Configure Database', render: () => new Box() },
        ];
        const wizard = new Wizard(customSteps);
        wizard.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);

        wizard.handleKey({ key: 'right', ctrl: false, alt: false } as any);
        expect(validateMock).toHaveBeenCalled();
        expect(wizard.currentStepIndex).toBe(0);
        expect(wizard.error).toBe('Username must not be empty');

        wizard.render(screen);
        const renderedIndicator = screen.back[0].map((c) => c.char).join('');
        const renderedError = screen.back[1].map((c) => c.char).join('');

        expect(renderedIndicator).toContain('Step 1 of 2: Configure Account');
        expect(renderedError).toContain('Username must not be empty');
    });

    it('validation false blocks advancement silently', () => {
        const validateMock = vi.fn().mockReturnValue(false);
        const customSteps = [
            { title: 'Configure Account', render: () => new Box(), validate: validateMock },
            { title: 'Configure Database', render: () => new Box() },
        ];
        const wizard = new Wizard(customSteps);
        wizard.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);

        wizard.handleKey({ key: 'right', ctrl: false, alt: false } as any);
        expect(validateMock).toHaveBeenCalled();
        expect(wizard.currentStepIndex).toBe(0);
        expect(wizard.error).toBe('');

        wizard.render(screen);
        const renderedError = screen.back[1].map((c) => c.char).join('').trim();
        expect(renderedError).toBe('');
    });

    it('goes back to previous step on handleKey left/b', () => {
        const wizard = new Wizard(makeSteps());
        wizard.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);

        // Move to step 2
        wizard.handleKey({ key: 'right', ctrl: false, alt: false } as any);
        expect(wizard.currentStepIndex).toBe(1);

        // Left Arrow key triggers back navigation
        wizard.handleKey({ key: 'left', ctrl: false, alt: false } as any);
        screen.clear();
        wizard.render(screen);
        let renderedText = screen.back[0].map((c) => c.char).join('');
        expect(wizard.currentStepIndex).toBe(0);
        expect(renderedText).toContain('Step 1 of 3: Configure Account');

        // Move to step 2 again
        wizard.handleKey({ key: 'right', ctrl: false, alt: false } as any);
        expect(wizard.currentStepIndex).toBe(1);

        // 'b' key triggers back navigation
        wizard.handleKey({ key: 'b', ctrl: false, alt: false } as any);
        screen.clear();
        wizard.render(screen);
        renderedText = screen.back[0].map((c) => c.char).join('');
        expect(wizard.currentStepIndex).toBe(0);
        expect(renderedText).toContain('Step 1 of 3: Configure Account');
    });

    it('fires onComplete on enter/return on the final step and collects step data', () => {
        const onCompleteMock = vi.fn();
        
        const firstInput = new TextInput();
        firstInput.value = 'john_doe';

        const secondInput = new TextInput();
        secondInput.value = 'postgres://db';

        const customSteps = [
            { title: 'Step One', render: () => firstInput },
            { title: 'Step Two', render: () => secondInput },
        ];

        const wizard = new Wizard(customSteps, { onComplete: onCompleteMock });
        wizard.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        // Advance to step 2 (final step)
        wizard.handleKey({ key: 'right', ctrl: false, alt: false } as any);
        expect(wizard.currentStepIndex).toBe(1);

        // Enter triggers completion
        wizard.handleKey({ key: 'enter', ctrl: false, alt: false } as any);
        expect(onCompleteMock).toHaveBeenCalledWith(['john_doe', 'postgres://db']);
    });
});
