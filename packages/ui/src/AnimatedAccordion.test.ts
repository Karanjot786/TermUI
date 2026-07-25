import { describe, it, expect, vi } from 'vitest';
import { Screen, createKeyEvent } from '@termuijs/core';
import { Box } from '@termuijs/widgets';
import { AnimatedAccordion, AnimatedAccordionItem } from './AnimatedAccordion.js';

describe('AnimatedAccordion', () => {
    it('should initially render all items closed', () => {
        const accordion = new AnimatedAccordion();
        
        const item1 = new AnimatedAccordionItem({
            title: 'Section 1',
            content: new Box()
        });
        
        accordion.addItem(item1);
        
        const screen = new Screen(20, 10);
        accordion.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        accordion.render(screen);
        
        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('▶ Section 1');
    });

    it('should toggle an item and respect allowMultiple via real clicks', () => {
        const accordion = new AnimatedAccordion({ allowMultiple: false });
        
        const item1 = new AnimatedAccordionItem({ title: 'Section 1', content: new Box() });
        const item2 = new AnimatedAccordionItem({ title: 'Section 2', content: new Box() });
        
        accordion.addItem(item1);
        accordion.addItem(item2);

        // Click item 1
        item1.events.emit('click' as any, { type: 'click' } as any);
        expect(item1.isOpen).toBe(true);

        // Click item 2
        item2.events.emit('click' as any, { type: 'click' } as any);
        expect(item1.isOpen).toBe(false); // Should close item1
        expect(item2.isOpen).toBe(true);
    });

    it('should allow keyboard toggle', () => {
        const accordion = new AnimatedAccordion({ allowMultiple: false });
        
        const item1 = new AnimatedAccordionItem({ title: 'Section 1', content: new Box() });
        accordion.addItem(item1);

        const enterEvent = createKeyEvent({
            key: 'enter',
            raw: Buffer.from([]),
            ctrl: false,
            alt: false,
            shift: false
        });

        item1.handleKey(enterEvent);
        expect(item1.isOpen).toBe(true);
    });
});
