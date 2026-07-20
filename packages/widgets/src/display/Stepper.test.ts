// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Stepper widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Stepper } from './Stepper.js';
import type { StepperStep } from './Stepper.js';

afterEach(() => {
    vi.restoreAllMocks();
});

function makeSteps(): StepperStep[] {
    return [
        { label: 'Setup', status: 'completed' },
        { label: 'Config', status: 'active' },
        { label: 'Review', status: 'pending' },
    ];
}

function renderStepper(
    steps: StepperStep[],
    opts: ConstructorParameters<typeof Stepper>[2] = {},
    cols = 60,
    rows = 10,
): Screen {
    const widget = new Stepper(steps, {}, opts);
    const screen = new Screen(cols, rows);
    widget.updateRect({ x: 0, y: 0, width: cols, height: rows });
    widget.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('');
}

describe('Stepper — rendered icons (unicode)', () => {
    it('renders completed icon ✓ for a completed step', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = renderStepper(makeSteps());
        expect(screen.back[0][0].char).toBe('✓');
    });

    it('renders active icon ● for the active step', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = renderStepper(makeSteps());
        const row = rowText(screen, 0);
        expect(row).toContain('●');
    });

    it('renders pending icon ○ for a pending step', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = renderStepper(makeSteps());
        const row = rowText(screen, 0);
        expect(row).toContain('○');
    });
});

describe('Stepper — ASCII fallback', () => {
    it('uses + for completed, * for active, - for pending when unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = renderStepper(makeSteps());
        const row = rowText(screen, 0);
        expect(row).toContain('+');
        expect(row).toContain('*');
        expect(row).toContain('-');
        expect(row).not.toContain('✓');
        expect(row).not.toContain('●');
        expect(row).not.toContain('○');
    });
});

describe('Stepper — horizontal orientation', () => {
    it('renders all step labels on row 0', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = renderStepper(makeSteps(), { orientation: 'horizontal' });
        const row = rowText(screen, 0);
        expect(row).toContain('Setup');
        expect(row).toContain('Config');
        expect(row).toContain('Review');
    });

    it('renders unicode connector ──── between steps', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = renderStepper(makeSteps(), { orientation: 'horizontal' });
        const row = rowText(screen, 0);
        expect(row).toContain('─');
    });

    it('renders ASCII connector ---- between steps when unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = renderStepper(makeSteps(), { orientation: 'horizontal' });
        const row = rowText(screen, 0);
        expect(row).toContain('-');
        expect(row).not.toContain('─');
    });
});

describe('Stepper — vertical orientation', () => {
    it('renders each step label on a separate row', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = renderStepper(makeSteps(), { orientation: 'vertical' });
        expect(rowText(screen, 0)).toContain('Setup');
        expect(rowText(screen, 2)).toContain('Config');
        expect(rowText(screen, 4)).toContain('Review');
    });

    it('renders unicode vertical connector │ between step rows', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = renderStepper(makeSteps(), { orientation: 'vertical' });
        // Connector rows are at odd indices (1, 3)
        expect(screen.back[1][0].char).toBe('│');
        expect(screen.back[3][0].char).toBe('│');
    });

    it('renders ASCII vertical connector | when unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = renderStepper(makeSteps(), { orientation: 'vertical' });
        expect(screen.back[1][0].char).toBe('|');
    });
});

describe('Stepper — navigation API', () => {
    it('nextStep advances the active step and marks dirty', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const widget = new Stepper(makeSteps());
        widget.clearDirty();

        widget.nextStep();

        expect(widget.isDirty).toBe(true);
        const steps = widget.getSteps();
        expect(steps[1]?.status).toBe('completed');
        expect(steps[2]?.status).toBe('active');
    });

    it('nextStep is a no-op when active step is the last', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const widget = new Stepper([
            { label: 'A', status: 'completed' },
            { label: 'B', status: 'active' },
        ]);
        widget.clearDirty();

        widget.nextStep();

        expect(widget.isDirty).toBe(false);
        expect(widget.getSteps()[1]?.status).toBe('active');
    });

    it('prevStep moves active step back and marks dirty', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const widget = new Stepper(makeSteps());
        widget.clearDirty();

        widget.prevStep();

        expect(widget.isDirty).toBe(true);
        const steps = widget.getSteps();
        expect(steps[0]?.status).toBe('active');
        expect(steps[1]?.status).toBe('pending');
    });

    it('prevStep is a no-op when active step is the first', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const widget = new Stepper([
            { label: 'A', status: 'active' },
            { label: 'B', status: 'pending' },
        ]);
        widget.clearDirty();

        widget.prevStep();

        expect(widget.isDirty).toBe(false);
        expect(widget.getSteps()[0]?.status).toBe('active');
    });

    it('setStepStatus updates a single step and marks dirty', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const widget = new Stepper(makeSteps());
        widget.clearDirty();

        widget.setStepStatus(2, 'active');

        expect(widget.isDirty).toBe(true);
        expect(widget.getSteps()[2]?.status).toBe('active');
    });

    it('setStepStatus is a no-op for out-of-bounds index', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const widget = new Stepper(makeSteps());
        widget.clearDirty();

        widget.setStepStatus(99, 'active');

        expect(widget.isDirty).toBe(false);
    });

    it('setSteps replaces all steps and marks dirty', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const widget = new Stepper(makeSteps());
        widget.clearDirty();

        widget.setSteps([{ label: 'New', status: 'active' }]);

        expect(widget.isDirty).toBe(true);
        expect(widget.getSteps()).toHaveLength(1);
        expect(widget.getSteps()[0]?.label).toBe('New');
    });
});

describe('Stepper — edge cases', () => {
    it('renders without error when width is zero', () => {
        const widget = new Stepper(makeSteps());
        const screen = new Screen(20, 5);
        widget.updateRect({ x: 0, y: 0, width: 0, height: 5 });
        expect(() => widget.render(screen)).not.toThrow();
    });

    it('renders without error when height is zero', () => {
        const widget = new Stepper(makeSteps());
        const screen = new Screen(20, 5);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 0 });
        expect(() => widget.render(screen)).not.toThrow();
    });

    it('renders without error with empty steps array', () => {
        const widget = new Stepper([]);
        const screen = new Screen(20, 5);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        expect(() => widget.render(screen)).not.toThrow();
    });
});
