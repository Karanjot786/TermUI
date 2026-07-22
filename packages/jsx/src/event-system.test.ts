import { describe, it, expect, vi } from 'vitest';
import { matchesSelector, applyDelegatedEvents } from './event-system.js';
import type { VElement, VNode } from './vnode.js';
import { Fragment, isVElement } from './vnode.js';

describe('Event System: Selector Matching', () => {
    it('matches #id', () => {
        expect(matchesSelector({ id: 'submit-btn' }, '#submit-btn')).toBe(true);
        expect(matchesSelector({ id: 'other' }, '#submit-btn')).toBe(false);
    });

    it('matches .class', () => {
        expect(matchesSelector({ class: 'input-field' }, '.input-field')).toBe(true);
        expect(matchesSelector({ className: 'input-field' }, '.input-field')).toBe(true);
        expect(matchesSelector({ class: 'other input-field' }, '.input-field')).toBe(true);
        expect(matchesSelector({ class: 'other' }, '.input-field')).toBe(false);
    });
});

describe('Event System: Delegation', () => {
    it('applies handler to child with matching #id', () => {
        const handler = vi.fn();
        const props = {
            onPress: { from: '#submit-btn', handler }
        };
        const children: VElement[] = [
            { type: 'button', props: { id: 'submit-btn' }, children: [] },
            { type: 'button', props: { id: 'other' }, children: [] }
        ];

        applyDelegatedEvents(props, children);

        expect(children[0].props.onPress).toBe(handler);
        expect(children[1].props.onPress).toBeUndefined();
        
        // The delegation object should be removed from the container's props
        expect(props.onPress).toBeUndefined();
    });

    it('applies handler to child with matching .class', () => {
        const handler = vi.fn();
        const props = {
            onFocus: { from: '.input-field', handler }
        };
        const children: VElement[] = [
            { type: 'input', props: { class: 'input-field' }, children: [] },
            { type: 'input', props: { class: 'other' }, children: [] }
        ];

        applyDelegatedEvents(props, children);

        expect(children[0].props.onFocus).toBe(handler);
        expect(children[1].props.onFocus).toBeUndefined();
    });

    it('applies handler to deeply nested descendants', () => {
        const handler = vi.fn();
        const props = {
            onPress: { from: '#deep-btn', handler }
        };
        const children: VElement[] = [
            {
                type: 'box',
                props: {},
                children: [
                    {
                        type: 'box',
                        props: {},
                        children: [
                            { type: 'button', props: { id: 'deep-btn' }, children: [] }
                        ]
                    }
                ]
            }
        ];

        applyDelegatedEvents(props, children);

        const child1 = children[0];
        if (!isVElement(child1)) throw new Error('Expected VElement');
        const child2 = child1.children[0];
        if (!isVElement(child2)) throw new Error('Expected VElement');
        const deepBtn = child2.children[0];
        if (!isVElement(deepBtn)) throw new Error('Expected VElement');
        
        expect(deepBtn.props.onPress).toBe(handler);
    });

    it('handles fragments correctly', () => {
        const handler = vi.fn();
        const props = {
            onPress: { from: '#frag-btn', handler }
        };
        const children: VNode[] = [
            {
                type: Fragment,
                children: [
                    { type: 'button', props: { id: 'frag-btn' }, children: [] }
                ]
            }
        ];

        applyDelegatedEvents(props, children);

        const fragment = children[0];
        // Fragment's children contains the button
        const fragBtn = (fragment as any).children[0] as VElement;
        expect(fragBtn.props.onPress).toBe(handler);
    });

    it('preserves existing handler when delegating', () => {
        const existingHandler = vi.fn();
        const delegatedHandler = vi.fn();
        const props = {
            onPress: { from: '#btn', handler: delegatedHandler }
        };
        const children: VElement[] = [
            { type: 'button', props: { id: 'btn', onPress: existingHandler }, children: [] }
        ];

        applyDelegatedEvents(props, children);

        expect(children[0].props.onPress).toBeTypeOf('function');
        
        // Call the newly bound handler
        children[0].props.onPress();

        expect(existingHandler).toHaveBeenCalled();
        expect(delegatedHandler).toHaveBeenCalled();
    });
});
