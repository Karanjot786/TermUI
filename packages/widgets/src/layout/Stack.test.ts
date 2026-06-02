// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Stack layout
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Stack } from './Stack.js';
import { Box } from '../display/Box.js';
import { Text } from '../display/Text.js';
import { Screen, computeLayout } from '@termuijs/core';

describe('Stack layout', () => {
    it('renders all children layered', () => {
        const child0 = new Text('Hello');
        const child1 = new Text('World');
        
        const stack = new Stack([child0, child1]);
        
        expect(stack.children.length).toBe(2);
        expect(stack.getActiveIndex()).toBe(1); // Last child active by default
    });

    it('setChildren updates children and marks dirty', () => {
        const stack = new Stack([]);
        const markDirtySpy = vi.spyOn(stack, 'markDirty');
        const newChildren = [new Text('A'), new Text('B')];
        
        stack.setChildren(newChildren);
        
        expect(stack.children.length).toBe(2);
        expect(markDirtySpy).toHaveBeenCalled();
    });

    it('setActiveIndex changes active child and marks dirty', () => {
        const stack = new Stack([new Text('One'), new Text('Two'), new Text('Three')]);
        const markDirtySpy = vi.spyOn(stack, 'markDirty');
        
        stack.setActiveIndex(0);
        
        expect(stack.getActiveIndex()).toBe(0);
        expect(markDirtySpy).toHaveBeenCalled();
    });

    it('setActiveIndex does nothing for invalid index', () => {
        const stack = new Stack([new Text('One'), new Text('Two')]);
        
        stack.setActiveIndex(5);
        expect(stack.getActiveIndex()).toBe(1); // Unchanged
        
        stack.setActiveIndex(-1);
        expect(stack.getActiveIndex()).toBe(1); // Unchanged
    });

    it('uses custom activeIndex from options', () => {
        const stack = new Stack([new Text('A'), new Text('B'), new Text('C')], undefined, {
            activeIndex: 0
        });
        
        expect(stack.getActiveIndex()).toBe(0);
    });

    it('handles empty children gracefully', () => {
        const stack = new Stack([]);
        
        expect(stack.children.length).toBe(0);
        expect(stack.getActiveIndex()).toBe(0);
    });
});
