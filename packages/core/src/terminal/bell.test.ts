import { describe, it, expect, vi } from 'vitest';
import { bell } from './bell.js';

describe('bell', () => {
    it('writes the BEL character to process.stdout', () => {
        const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        
        bell();
        
        expect(spy).toHaveBeenCalledWith('\x07');
        
        spy.mockRestore();
    });
});
