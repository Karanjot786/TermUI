import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RouteTransitionManager } from './transitions.js';
import { Router } from './router.js';

// Mock the external motion module behavior safely
vi.mock('@termuijs/motion', () => {
    return {
        transition: vi.fn((options: any) => {
            options.onFrame(0.5);
            options.onComplete();
        })
    };
});

describe('RouteTransitionManager Subsystem', () => {
    let mockRouter: Router;

    beforeEach(() => {
        mockRouter = new Router();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should capture navigate triggers and dispatch core happy-path transition frame updates', () => {
        const manager = new RouteTransitionManager(mockRouter);
        const frameSpy = vi.fn();
        const completeSpy = vi.fn();

        manager.events.on('frame', frameSpy);
        manager.events.on('complete', completeSpy);

        const dummyVNode = { type: 'box', props: {}, children: [] } as any;

        // Manually trigger the router lifecycle
        mockRouter.events.emit('navigate', {
            match: null as any,
            screen: dummyVNode
        });

        expect(frameSpy).toHaveBeenCalledTimes(1);
        expect(frameSpy).toHaveBeenCalledWith(expect.objectContaining({ alpha: 0.5 }));
        expect(completeSpy).toHaveBeenCalledTimes(1);
        expect(manager.activeScreen).toBe(dummyVNode);
    });

    it('should run leave configurations cleanly when historical back steps occur', () => {
        const manager = new RouteTransitionManager(mockRouter);
        const completeSpy = vi.fn();
        manager.events.on('complete', completeSpy);

        const dummyVNode = { type: 'text', props: {}, children: [] } as any;

        mockRouter.events.emit('back', {
            match: null as any,
            screen: dummyVNode
        });

        expect(completeSpy).toHaveBeenCalledTimes(1);
        expect(manager.activeScreen).toBe(dummyVNode);
    });

    it('edge cases: empty input or null back actions should fail gracefully without throwing crash frames', () => {
        const manager = new RouteTransitionManager(mockRouter);
        
        expect(() => {
            mockRouter.events.emit('back', null);
            manager.triggerTransition(null as any, 'enter');
        }).not.toThrow();
    });
});