import { describe, it, expect, vi, afterEach } from 'vitest';
import { bell } from './bell.js';

describe('bell', () => {
    afterEach(() => vi.restoreAllMocks());

    it('writes the BEL character to process.stdout', () => {
        const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        
        bell();
        
        expect(spy).toHaveBeenCalledWith('\x07');
        
        spy.mockRestore();
    });
});
