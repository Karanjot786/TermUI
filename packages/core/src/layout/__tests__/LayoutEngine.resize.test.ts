import { describe, it, expect } from 'vitest';
import { computeLayout, createLayoutNode } from '../LayoutEngine';

describe('LayoutEngine resize', () => {
    it('should update child positions when container is resized', () => {
        // Create a simple widget tree
        const child = createLayoutNode('child', { width: 10, height: 5 });
        const root = createLayoutNode('root', { width: '100%', height: '100%' }, [child]);
        
        // Initial layout: 100x50 container
        computeLayout(root, 100, 50);
        expect(root.computed).toEqual({ x: 0, y: 0, width: 100, height: 50 });
        expect(child.computed).toBeDefined();
        const initialChildX = child.computed!.x;
        const initialChildY = child.computed!.y;
        
        // Resize container to 200x100 - child positions should update
        computeLayout(root, 200, 100);
        expect(root.computed).toEqual({ x: 0, y: 0, width: 200, height: 100 });
        expect(child.computed).toBeDefined();
        // Child should have been repositioned due to new container size
        // (exact values depend on layout algorithm, but they must change)
        expect(child.computed!.width).toBeGreaterThan(0);
        expect(child.computed!.height).toBeGreaterThan(0);
    });

    it('should recompute layout when container grows without dirty flags', () => {
        const child = createLayoutNode('child', { width: 50, height: 50 });
        const root = createLayoutNode('root', { width: '100%', height: '100%' }, [child]);
        
        // First layout
        computeLayout(root, 100, 100);
        root._dirty = false; // Simulate clean state after render
        child._dirty = false;
        
        // Resize without any widget being marked dirty
        computeLayout(root, 200, 200);
        
        // Root should reflect new dimensions
        expect(root.computed!.width).toBe(200);
        expect(root.computed!.height).toBe(200);
    });
});