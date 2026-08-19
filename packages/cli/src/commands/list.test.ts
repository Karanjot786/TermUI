import { describe, it, expect, vi, afterEach } from 'vitest';
import { runList } from './list.js';
import * as registry from '../registry.js';

describe('runList', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should list components sorted alphabetically and print output to console', async () => {
        const mockComponents = [
            { slug: 'spinner', description: 'Interactive spinner' },
            { slug: 'avatar', description: 'Initials avatar' },
        ];

        vi.spyOn(registry, 'listComponents').mockResolvedValue(mockComponents as any);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await runList();

        expect(registry.listComponents).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('\n  2 components:\n');
        
        // Assert alphabetical sorting in the printed lines
        const firstLogCall = consoleSpy.mock.calls[1][0];
        const secondLogCall = consoleSpy.mock.calls[2][0];
        
        expect(firstLogCall).toContain('avatar');
        expect(firstLogCall).toContain('Initials avatar');
        expect(secondLogCall).toContain('spinner');
        expect(secondLogCall).toContain('Interactive spinner');
    });

    it('handles empty component list without crashing', async () => {
        vi.spyOn(registry, 'listComponents').mockResolvedValue([] as any);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await runList();

        expect(registry.listComponents).toHaveBeenCalled();
        // Header should say "0 components:"
        expect(consoleSpy).toHaveBeenCalledWith('\n  0 components:\n');
        // No items printed, but footer should still appear
        expect(consoleSpy).toHaveBeenCalledWith('\n  Add one with:  termuijs add <name>\n');
    });

    it('handles components with undefined description gracefully', async () => {
        const mockComponents = [
            { slug: 'bare-component' }, // no description field
            { slug: 'another', description: undefined },
            { slug: 'null-desc', description: null as any },
        ];

        vi.spyOn(registry, 'listComponents').mockResolvedValue(mockComponents as any);
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await runList();

        // All three should be listed without throwing
        // Items are sorted alphabetically: another, bare-component, null-desc
        const itemLines = consoleSpy.mock.calls.slice(1, -1); // exclude header and footer
        expect(itemLines.length).toBe(3);
        // Each line should contain the slug (description falls back to empty string)
        expect(itemLines[0][0]).toContain('another');
        expect(itemLines[1][0]).toContain('bare-component');
        expect(itemLines[2][0]).toContain('null-desc');
    });
});
