import { describe, it, expect, vi } from 'vitest';
import { Stack } from './Stack.js';
import { Widget } from '../base/Widget.js';

class TestWidget extends Widget {
    render(): string { return ''; }
}

describe('Stack', () => {
    it('creates stack with children', () => {
        const child1 = new TestWidget();
        const child2 = new TestWidget();
        const stack = new Stack([child1, child2]);
        
        expect(stack['_children'].length).toBe(2);
    });

    it('setChildren updates children and marks dirty', () => {
        const stack = new Stack([]);
        const markDirtySpy = vi.spyOn(stack, 'markDirty');
        const newChildren = [new TestWidget(), new TestWidget()];
        
        stack.setChildren(newChildren);
        
        expect(stack['_children'].length).toBe(2);
        expect(markDirtySpy).toHaveBeenCalled();
    });

    it('setActiveIndex changes active child and marks dirty', () => {
        const stack = new Stack([new TestWidget(), new TestWidget(), new TestWidget()]);
        const markDirtySpy = vi.spyOn(stack, 'markDirty');
        
        stack.setActiveIndex(0);
        
        expect(stack.getActiveIndex()).toBe(0);
        expect(markDirtySpy).toHaveBeenCalled();
    });

    it('setActiveIndex does nothing for invalid index', () => {
        const stack = new Stack([new TestWidget(), new TestWidget()]);
        
        stack.setActiveIndex(5);
        expect(stack.getActiveIndex()).toBe(1);
        
        stack.setActiveIndex(-1);
        expect(stack.getActiveIndex()).toBe(1);
    });

    it('uses custom activeIndex from options', () => {
        const stack = new Stack([new TestWidget(), new TestWidget(), new TestWidget()], undefined, {
            activeIndex: 0
        });
        
        expect(stack.getActiveIndex()).toBe(0);
    });

    it('handles empty children gracefully', () => {
        const stack = new Stack([]);
        
        expect(stack['_children'].length).toBe(0);
        expect(stack.getActiveIndex()).toBe(0);
    });
});
