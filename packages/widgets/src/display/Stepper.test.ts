// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Stepper widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Stepper, type StepperStep } from './Stepper.js';

// ── Helpers ───────────────────────────────────────────

const STEPS: StepperStep[] = [
    { label: 'Setup',  status: 'completed' },
    { label: 'Config', status: 'active' },
    { label: 'Review', status: 'pending' },
    { label: 'Done',   status: 'pending' },
];

function renderStepper(
    steps: StepperStep[] = STEPS,
    opts: ConstructorParameters<typeof Stepper>[2] = {},
    width = 60,
    height = 10,
): { widget: Stepper; screen: Screen } {
    const widget = new Stepper(steps, {}, opts);
    const screen = new Screen(width, height);
    widget.updateRect({ x: 0, y: 0, width, height });
    widget.render(screen);
    return { widget, screen };
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

function cellAt(screen: Screen, row: number, col: number) {
    return screen.back[row]?.[col];
}

// ── Tests ─────────────────────────────────────────────

describe('Stepper', () => {

    describe('1. Horizontal render (default)', () => {
        it('renders all step labels', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            expect(text).toContain('Setup');
            expect(text).toContain('Config');
            expect(text).toContain('Review');
            expect(text).toContain('Done');
            vi.restoreAllMocks();
        });

        it('renders completed step with ✓ icon', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            expect(text).toContain('✓');
            vi.restoreAllMocks();
        });

        it('renders active step with ● icon', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            expect(text).toContain('●');
            vi.restoreAllMocks();
        });

        it('renders pending step with ○ icon', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            expect(text).toContain('○');
            vi.restoreAllMocks();
        });

        it('renders connectors between steps', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            expect(text).toContain('─');
            vi.restoreAllMocks();
        });
    });

    describe('2. Vertical render', () => {
        it('renders all step labels on separate rows', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper(STEPS, { orientation: 'vertical' });
            const rows = [0, 2, 4, 6].map(r => rowText(screen, r));
            expect(rows[0]).toContain('Setup');
            expect(rows[1]).toContain('Config');
            expect(rows[2]).toContain('Review');
            expect(rows[3]).toContain('Done');
            vi.restoreAllMocks();
        });

        it('renders vertical connector between steps', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper(STEPS, { orientation: 'vertical' });
            // Row 1 is the connector between Setup and Config
            expect(cellAt(screen, 1, 0)?.char).toBe('│');
            vi.restoreAllMocks();
        });
    });

    describe('3. Status colors', () => {
        it('completed step icon has green color', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper();
            // First cell is the ✓ icon of completed step
            const cell = cellAt(screen, 0, 0);
            expect(cell?.fg).toEqual({ type: 'named', name: 'green' });
            vi.restoreAllMocks();
        });

        it('active step icon has cyan color and is bold', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            // Find ● position
            const bulletIdx = text.indexOf('●');
            const cell = cellAt(screen, 0, bulletIdx);
            expect(cell?.fg).toEqual({ type: 'named', name: 'cyan' });
            expect(cell?.bold).toBe(true);
            vi.restoreAllMocks();
        });

        it('pending step icon is dim', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            const circleIdx = text.indexOf('○');
            const cell = cellAt(screen, 0, circleIdx);
            expect(cell?.dim).toBe(true);
            vi.restoreAllMocks();
        });
    });

    describe('4. ASCII fallback', () => {
        it('uses + for completed when caps.unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            expect(text).toContain('+');
            expect(text).not.toContain('✓');
            vi.restoreAllMocks();
        });

        it('uses * for active when caps.unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            expect(text).toContain('*');
            expect(text).not.toContain('●');
            vi.restoreAllMocks();
        });

        it('uses - for pending when caps.unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const { screen } = renderStepper();
            const text = rowText(screen, 0);
            expect(text).toContain('-');
            expect(text).not.toContain('○');
            vi.restoreAllMocks();
        });

        it('uses | for vertical connector when caps.unicode is false', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
            const { screen } = renderStepper(STEPS, { orientation: 'vertical' });
            expect(cellAt(screen, 1, 0)?.char).toBe('|');
            vi.restoreAllMocks();
        });
    });

    describe('5. setSteps', () => {
        it('replaces steps and marks dirty', () => {
            const { widget } = renderStepper();
            widget.clearDirty();
            widget.setSteps([{ label: 'New', status: 'active' }]);
            expect(widget.isDirty).toBe(true);
            expect(widget.getSteps()).toHaveLength(1);
        });
    });

    describe('6. setStepStatus', () => {
        it('updates a step status and marks dirty', () => {
            const { widget } = renderStepper();
            widget.clearDirty();
            widget.setStepStatus(2, 'active');
            expect(widget.isDirty).toBe(true);
            expect(widget.getSteps()[2].status).toBe('active');
        });

        it('ignores out-of-bounds index', () => {
            const { widget } = renderStepper();
            expect(() => widget.setStepStatus(99, 'active')).not.toThrow();
        });
    });

    describe('7. nextStep / prevStep', () => {
        it('nextStep advances active to next step', () => {
            const { widget } = renderStepper();
            // Config (index 1) is active
            widget.nextStep();
            expect(widget.getSteps()[1].status).toBe('completed');
            expect(widget.getSteps()[2].status).toBe('active');
        });

        it('nextStep marks dirty', () => {
            const { widget } = renderStepper();
            widget.clearDirty();
            widget.nextStep();
            expect(widget.isDirty).toBe(true);
        });

        it('nextStep does nothing when last step is active', () => {
            const steps: StepperStep[] = [
                { label: 'A', status: 'completed' },
                { label: 'B', status: 'active' },
            ];
            const { widget } = renderStepper(steps);
            widget.nextStep();
            expect(widget.getSteps()[1].status).toBe('active');
        });

        it('prevStep moves active to previous step', () => {
        const freshSteps: StepperStep[] = [
            { label: 'Setup',  status: 'completed' },
            { label: 'Config', status: 'active' },
            { label: 'Review', status: 'pending' },
        ];
        const { widget } = renderStepper(freshSteps);
        widget.prevStep();
        expect(widget.getSteps()[0].status).toBe('active');
        expect(widget.getSteps()[1].status).toBe('pending');
    });

        it('prevStep marks dirty', () => {
            const { widget } = renderStepper();
            widget.clearDirty();
            widget.prevStep();
            expect(widget.isDirty).toBe(true);
        });

        it('prevStep does nothing when first step is active', () => {
            const steps: StepperStep[] = [
                { label: 'A', status: 'active' },
                { label: 'B', status: 'pending' },
            ];
            const { widget } = renderStepper(steps);
            widget.prevStep();
            expect(widget.getSteps()[0].status).toBe('active');
        });
    });

    describe('8. Edge cases', () => {
        it('handles empty steps array without error', () => {
            expect(() => renderStepper([])).not.toThrow();
        });

        it('handles zero-size rect without error', () => {
            expect(() => renderStepper(STEPS, {}, 0, 0)).not.toThrow();
        });

        it('uses pending as default status when not specified', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const { screen } = renderStepper([{ label: 'NoStatus' }]);
            const text = rowText(screen, 0);
            expect(text).toContain('○');
            vi.restoreAllMocks();
        });
    });
});