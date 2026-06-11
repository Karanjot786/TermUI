import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { prompt, NonInteractiveError } from './prompts.js';
import * as readline from 'readline';

vi.mock('readline', () => ({
    createInterface: vi.fn()
}));

describe('prompts', () => {
    let mockRl: any;
    
    beforeEach(() => {
        if (!Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')) {
            Object.defineProperty(process.stdin, 'isTTY', { configurable: true, get: () => undefined });
        }
        vi.spyOn(process.stdin, 'isTTY', 'get').mockReturnValue(true);
        vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        
        mockRl = {
            question: vi.fn(),
            close: vi.fn()
        };
        (readline.createInterface as any).mockReturnValue(mockRl);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('throws NonInteractiveError if not a TTY', async () => {
        vi.spyOn(process.stdin, 'isTTY', 'get').mockReturnValue(false);
        await expect(prompt.text({ message: 'Test' })).rejects.toThrow(NonInteractiveError);
    });

    it('prompt.text returns input', async () => {
        mockRl.question.mockImplementation((q: string, cb: (ans: string) => void) => {
            cb('my value');
        });
        
        const result = await prompt.text({ message: 'Test' });
        expect(result).toBe('my value');
    });

    it('prompt.confirm returns true for "y"', async () => {
        mockRl.question.mockImplementation((q: string, cb: (ans: string) => void) => cb('y'));
        const result = await prompt.confirm({ message: 'Continue?' });
        expect(result).toBe(true);
    });

    it('prompt.confirm returns false for "n"', async () => {
        mockRl.question.mockImplementation((q: string, cb: (ans: string) => void) => cb('n'));
        const result = await prompt.confirm({ message: 'Continue?' });
        expect(result).toBe(false);
    });

    it('prompt.select returns chosen value', async () => {
        mockRl.question.mockImplementation((q: string, cb: (ans: string) => void) => cb('2'));
        const result = await prompt.select({
            message: 'Pick one',
            options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }]
        });
        expect(result).toBe('b');
    });
});
