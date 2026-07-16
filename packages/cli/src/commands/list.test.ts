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
});
