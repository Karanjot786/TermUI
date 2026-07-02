import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as readline from 'node:readline';
import { textPrompt, selectPrompt, confirmPrompt, multiSelectPrompt } from './prompts';

vi.mock('node:readline', () => {
    return {
        createInterface: vi.fn(),
    };
});

describe('create-termui-app prompts', () => {
    let mockQuestion: any;
    let mockClose: any;

    beforeEach(() => {
        mockQuestion = vi.fn();
        mockClose = vi.fn();
        vi.mocked(readline.createInterface).mockReturnValue({
            question: mockQuestion,
            close: mockClose,
        } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('textPrompt', () => {
        it('should ask question and return user answer trimmed', async () => {
            mockQuestion.mockImplementation((q: string, cb: (ans: string) => void) => {
                cb('  my answer   ');
            });

            const result = await textPrompt('What is your name?', 'Default');
            expect(mockQuestion).toHaveBeenCalledWith('  What is your name? (Default): ', expect.any(Function));
            expect(mockClose).toHaveBeenCalled();
            expect(result).toBe('my answer');
        });

        it('should return default value if answer is empty', async () => {
            mockQuestion.mockImplementation((q: string, cb: (ans: string) => void) => {
                cb('');
            });

            const result = await textPrompt('What is your name?', 'Default');
            expect(result).toBe('Default');
        });
    });

    describe('selectPrompt', () => {
        it('should show options and return selected index', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            mockQuestion.mockImplementation((q: string, cb: (ans: string) => void) => {
                cb('2');
            });

            const result = await selectPrompt('Pick one', ['Option A', 'Option B']);
            expect(consoleSpy).toHaveBeenCalledWith('\n  Pick one');
            expect(consoleSpy).toHaveBeenCalledWith('    1) Option A');
            expect(consoleSpy).toHaveBeenCalledWith('    2) Option B');
            expect(result).toBe(1); // 2 -> index 1
        });
    });

    describe('confirmPrompt', () => {
        it('should return true for yes answer', async () => {
            mockQuestion.mockImplementation((q: string, cb: (ans: string) => void) => {
                cb('yes');
            });
            const result = await confirmPrompt('Are you sure?', true);
            expect(result).toBe(true);
        });

        it('should return false for no answer', async () => {
            mockQuestion.mockImplementation((q: string, cb: (ans: string) => void) => {
                cb('n');
            });
            const result = await confirmPrompt('Are you sure?', true);
            expect(result).toBe(false);
        });

        it('should return default value on empty answer', async () => {
            mockQuestion.mockImplementation((q: string, cb: (ans: string) => void) => {
                cb('');
            });
            const result = await confirmPrompt('Are you sure?', false);
            expect(result).toBe(false);
        });
    });

    describe('multiSelectPrompt', () => {
        it('should return all true if user enters all', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            mockQuestion.mockImplementation((q: string, cb: (ans: string) => void) => {
                cb('all');
            });

            const result = await multiSelectPrompt('Pick multiple', ['A', 'B']);
            expect(result).toEqual([true, true]);
        });

        it('should return specific indexes based on comma-separated list', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            mockQuestion.mockImplementation((q: string, cb: (ans: string) => void) => {
                cb('1,3');
            });

            const result = await multiSelectPrompt('Pick multiple', ['A', 'B', 'C']);
            expect(result).toEqual([true, false, true]);
        });
    });
});
