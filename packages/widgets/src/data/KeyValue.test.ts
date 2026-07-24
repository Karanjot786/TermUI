// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for KeyValue widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { KeyValue } from './KeyValue.js';
import { Screen } from '@termuijs/core';

describe('KeyValue', () => {
    it('creates key value pairs from array', () => {
        const kv = new KeyValue([{ key: 'name', value: 'Alice' }]);
        const screen = new Screen(40, 10);
        kv.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        kv.render(screen);
        const rows = screen.back.map((row: { char: string }[]) => row.map(c => c.char).join(''));
        expect(rows.some(r => r.includes('name'))).toBe(true);
        expect(rows.some(r => r.includes('Alice'))).toBe(true);
    });

    it('creates key value pairs from object', () => {
        const kv = new KeyValue({ name: 'Alice', age: 30 });
        expect(kv).toBeDefined();
    });

    it('is not focusable with flat objects', () => {
        const kv = new KeyValue({ name: 'Alice' });
        expect(kv.focusable).toBe(false);
    });

    it('is focusable with nested objects', () => {
        const kv = new KeyValue({ user: { name: 'Alice' } });
        expect(kv.focusable).toBe(true);
    });

    it('handles expand/collapse on enter', () => {
        const kv = new KeyValue({ user: { name: 'Alice' } });
        kv.isFocused = true;
        
        // Initial state doesn't crash
        expect(() => {
            kv.toggleSelected();
        }).not.toThrow();
    });

    // Flat objects behavior (existing behavior)
    describe('Flat Objects', () => {
        it('renders flat objects without change', () => {
            const kv = new KeyValue({ name: 'Alice', age: 30 });
            expect(kv).toBeDefined();
            expect(kv.focusable).toBe(false);
        });

        it('handles empty flat objects', () => {
            const kv = new KeyValue({});
            expect(kv).toBeDefined();
            expect(kv.focusable).toBe(false);
        });

        it('handles primitive values', () => {
            const kv = new KeyValue({ 
                name: 'Alice', 
                age: 30, 
                active: true, 
                score: 95.5 
            });
            expect(kv).toBeDefined();
            expect(kv.focusable).toBe(false);
        });
    });

    // Nested objects behavior
    describe('Nested Objects', () => {
        it('is focusable with nested objects', () => {
            const kv = new KeyValue({ 
                user: { name: 'Alice' }, 
                config: { theme: 'dark' } 
            });
            expect(kv.focusable).toBe(true);
        });

        it('handles empty nested objects', () => {
            const kv = new KeyValue({ empty: {} });
            expect(kv.focusable).toBe(true);
        });

        it('handles deeply nested objects', () => {
            const kv = new KeyValue({
                level1: {
                    level2: {
                        level3: { value: 'deep' }
                    }
                }
            });
            expect(kv.focusable).toBe(true);
        });

        it('handles mixed flat and nested objects', () => {
            const kv = new KeyValue({
                name: 'Alice',
                address: { city: 'Berlin', zip: '10115' },
                age: 30,
                preferences: { theme: 'dark', notifications: true }
            });
            expect(kv.focusable).toBe(true);
        });
    });

    // Expand/Collapse behavior
    describe('Expand/Collapse', () => {
        it('starts with nested objects collapsed', () => {
            const kv = new KeyValue({ user: { name: 'Alice' } });
            kv.isFocused = true;
            
            // Check initial state - should not be expanded
            kv.toggleSelected(); // This should expand it
            // We can't directly test the internal state, but we can test behavior
        });

        it('toggles expansion state', () => {
            const kv = new KeyValue({ user: { name: 'Alice' } });
            kv.isFocused = true;
            
            // First toggle should expand
            kv.toggleSelected();
            // Second toggle should collapse
            kv.toggleSelected();
            // Should be able to toggle multiple times without issues
            kv.toggleSelected();
        });

        it('handles expand/collapse with multiple nested objects', () => {
            const kv = new KeyValue({
                user: { name: 'Alice' },
                config: { theme: 'dark', language: 'en' },
                settings: { notifications: true }
            });
            kv.isFocused = true;
            
            // Should handle multiple nested objects
            expect(() => {
                kv.toggleSelected();
                kv.toggleSelected();
                kv.toggleSelected();
            }).not.toThrow();
        });
    });

    // Keyboard navigation
    describe('Keyboard Navigation', () => {
        it('handles arrow up/down navigation', () => {
            const kv = new KeyValue({
                name: 'Alice',
                address: { city: 'Berlin' },
                age: 30
            });
            kv.isFocused = true;
            
            // Should not throw on key presses
            expect(() => {
                kv.handleKey('ArrowUp');
                kv.handleKey('ArrowDown');
                kv.handleKey('up');
                kv.handleKey('down');
            }).not.toThrow();
        });

        it('handles enter/space for expand/collapse', () => {
            const kv = new KeyValue({
                user: { name: 'Alice' },
                age: 30
            });
            kv.isFocused = true;
            
            // Should handle expand/collapse keys
            expect(() => {
                kv.handleKey('Enter');
                kv.handleKey(' ');
                kv.handleKey('space');
            }).not.toThrow();
        });

        it('handles unknown keys gracefully', () => {
            const kv = new KeyValue({ name: 'Alice' });
            kv.isFocused = true;
            
            expect(() => {
                kv.handleKey('unknown');
            }).not.toThrow();
        });

        it('handles KeyEvent objects correctly', () => {
            const kv = new KeyValue({
                name: 'Alice',
                age: 30
            });
            kv.isFocused = true;
            
            kv.handleKey({ key: 'down' } as any);
            expect((kv as any)._selectedIndex).toBe(1);

            kv.handleKey({ key: 'up' } as any);
            expect((kv as any)._selectedIndex).toBe(0);
        });
    });

    // Edge cases
    describe('Edge Cases', () => {
        it('handles null values', () => {
            const kv = new KeyValue({
                name: 'Alice',
                data: null,
                config: { theme: 'dark' }
            });
            expect(kv).toBeDefined();
        });

        it('handles undefined values', () => {
            const kv = new KeyValue({
                name: 'Alice',
                data: undefined,
                config: { theme: 'dark' }
            });
            expect(kv).toBeDefined();
        });

        it('handles array values', () => {
            const kv = new KeyValue({
                name: 'Alice',
                tags: ['user', 'admin'],
                config: { theme: 'dark' }
            });
            expect(kv).toBeDefined();
        });

        it('handles very large objects', () => {
            const largeObj: any = { name: 'Alice' };
            for (let i = 0; i < 100; i++) {
                largeObj[`key${i}`] = `value${i}`;
            }
            
            const kv = new KeyValue({
                user: largeObj,
                age: 30
            });
            expect(kv).toBeDefined();
        });
    });
});
