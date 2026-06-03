import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Stepper } from './Stepper.js';

// Mock caps for unicode support
vi.mock('@termuijs/core', async () => {
    const actual = await vi.importActual('@termuijs/core');
    return {
        ...actual,
        caps: {
            unicode: true,
        },
    };
});

describe('Stepper', () => {
    it('renders all step labels', () => {
        const stepper = new Stepper(['Step 1', 'Step 2', 'Step 3']);
        expect(stepper.activeStep).toBe(0);
    });

    it('setActiveStep changes active step', () => {
        const stepper = new Stepper(['One', 'Two', 'Three']);
        const markDirtySpy = vi.spyOn(stepper, 'markDirty');
        
        stepper.setActiveStep(1);
        expect(stepper.activeStep).toBe(1);
        expect(markDirtySpy).toHaveBeenCalled();
    });

    it('setActiveStep does nothing for invalid index', () => {
        const stepper = new Stepper(['One', 'Two']);
        stepper.setActiveStep(5);
        expect(stepper.activeStep).toBe(0);
        
        stepper.setActiveStep(-1);
        expect(stepper.activeStep).toBe(0);
    });

    it('uses custom colors from options', () => {
        const stepper = new Stepper(['A', 'B'], undefined, {
            completedColor: { type: 'named', name: 'blue' },
            activeColor: { type: 'named', name: 'red' },
            pendingColor: { type: 'named', name: 'white' },
        });
        
        expect(stepper.activeStep).toBe(0);
    });

    it('uses custom connector character', () => {
        const stepper = new Stepper(['X', 'Y', 'Z'], undefined, {
            connectorChar: '→',
        });
        
        expect(stepper.activeStep).toBe(0);
    });
});
