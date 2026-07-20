import * as readline from 'node:readline';
import type { Interface } from 'node:readline';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    confirmPrompt,
    multiSelectPrompt,
    selectPrompt,
    textPrompt,
} from './prompts';

vi.mock('node:readline', () => ({
    createInterface: vi.fn(),
}));

describe('create-termui-app prompts', () => {
    // These tests only need stable placeholder streams to verify createInterface wiring.
    const mockStdin = {} as NodeJS.ReadStream;
    const mockStdout = {} as NodeJS.WriteStream;
    const mockedCreateInterface = vi.mocked(readline.createInterface);
    let questionMock: ReturnType<typeof vi.fn>;
    let closeMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        questionMock = vi.fn();
        closeMock = vi.fn();

        vi.spyOn(process, 'stdin', 'get').mockReturnValue(mockStdin);
        vi.spyOn(process, 'stdout', 'get').mockReturnValue(mockStdout);
        mockedCreateInterface.mockReturnValue(
            {
                question: questionMock,
                close: closeMock,
            } as unknown as Interface,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('textPrompt', () => {
        it('trims input, includes the default suffix, and closes the interface', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('  my answer   ');
            });

            const result = await textPrompt('What is your name?', 'Default');

            expect(mockedCreateInterface).toHaveBeenCalledWith({
                input: mockStdin,
                output: mockStdout,
            });
            expect(questionMock).toHaveBeenCalledWith(
                '  What is your name? (Default): ',
                expect.any(Function),
            );
            expect(closeMock).toHaveBeenCalledTimes(1);
            expect(result).toBe('my answer');
        });

        it('returns the fallback when the user submits whitespace', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('   ');
            });

            const result = await textPrompt('Choose a name', 'Fallback');

            expect(result).toBe('Fallback');
        });

        it('returns an empty string when no default is provided and the answer is blank', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('');
            });

            const result = await textPrompt('Enter value');

            expect(questionMock).toHaveBeenCalledWith(
                '  Enter value: ',
                expect.any(Function),
            );
            expect(result).toBe('');
        });

        it('does not append a suffix for an empty-string default', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('kept');
            });

            await textPrompt('Name', '');

            expect(questionMock).toHaveBeenCalledWith(
                '  Name: ',
                expect.any(Function),
            );
        });
    });

    describe('selectPrompt', () => {
        it('renders numbered options and returns the chosen index', async () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
            questionMock.mockImplementation((_prompt, callback) => {
                callback('2');
            });

            const result = await selectPrompt('Pick one', ['Option A', 'Option B']);

            expect(logSpy).toHaveBeenCalledWith('\n  Pick one');
            expect(logSpy).toHaveBeenCalledWith('    1) Option A');
            expect(logSpy).toHaveBeenCalledWith('    2) Option B');
            expect(questionMock).toHaveBeenCalledWith(
                '  Enter number (1): ',
                expect.any(Function),
            );
            expect(result).toBe(1);
        });

        it('clamps values below the first option to zero', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('0');
            });

            await expect(selectPrompt('Pick one', ['A', 'B'])).resolves.toBe(0);
        });

        it('clamps values above the last option to the final index', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('99');
            });

            await expect(selectPrompt('Pick one', ['A', 'B'])).resolves.toBe(1);
        });

        it('returns NaN for non-numeric input', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('abc');
            });

            const result = await selectPrompt('Pick one', ['A', 'B']);

            expect(Number.isNaN(result)).toBe(true);
        });

        it('handles an empty options list without throwing', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('1');
            });

            const result = await selectPrompt('Pick one', []);

            expect(result).toBe(0);
        });
    });

    describe('confirmPrompt', () => {
        it('returns true for yes-like answers', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('yes');
            });

            await expect(confirmPrompt('Are you sure?')).resolves.toBe(true);
        });

        it('returns false for no-like answers', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('n');
            });

            await expect(confirmPrompt('Are you sure?')).resolves.toBe(false);
        });

        it('uses the positive default when the answer is empty', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('');
            });

            const result = await confirmPrompt('Proceed?', true);

            expect(questionMock).toHaveBeenCalledWith(
                '  Proceed? (Y/n): ',
                expect.any(Function),
            );
            expect(result).toBe(true);
        });

        it('uses the negative default when the answer is empty', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('');
            });

            const result = await confirmPrompt('Proceed?', false);

            expect(questionMock).toHaveBeenCalledWith(
                '  Proceed? (y/N): ',
                expect.any(Function),
            );
            expect(result).toBe(false);
        });
    });

    describe('multiSelectPrompt', () => {
        it('selects every option when the user enters all', async () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
            questionMock.mockImplementation((_prompt, callback) => {
                callback('all');
            });

            const result = await multiSelectPrompt('Pick multiple', ['A', 'B']);

            expect(logSpy).toHaveBeenCalledWith(
                "\n  Pick multiple (comma-separated numbers, or 'all')",
            );
            expect(logSpy).toHaveBeenCalledWith('    1) [ ] A');
            expect(logSpy).toHaveBeenCalledWith('    2) [ ] B');
            expect(questionMock).toHaveBeenCalledWith(
                '  Enter numbers (all): ',
                expect.any(Function),
            );
            expect(result).toEqual([true, true]);
        });

        it('keeps defaults when the user presses enter', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('');
            });

            const result = await multiSelectPrompt(
                'Pick multiple',
                ['A', 'B', 'C'],
                [false, true, false],
            );

            expect(questionMock).toHaveBeenCalledWith(
                '  Enter numbers (keep defaults): ',
                expect.any(Function),
            );
            expect(result).toEqual([false, true, false]);
        });

        it('falls back to selecting every option when there are no defaults', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('');
            });

            const result = await multiSelectPrompt('Pick multiple', ['A', 'B']);

            expect(questionMock).toHaveBeenCalledWith(
                '  Enter numbers (all): ',
                expect.any(Function),
            );
            expect(result).toEqual([true, true]);
        });

        it('accepts comma-separated numbers and ignores invalid selections', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('1, 3, foo, 2, 2');
            });

            const result = await multiSelectPrompt('Pick multiple', ['A', 'B', 'C']);

            expect(result).toEqual([true, true, true]);
        });

        it('returns false for positions that were not selected', async () => {
            questionMock.mockImplementation((_prompt, callback) => {
                callback('2, 99, -1');
            });

            const result = await multiSelectPrompt('Pick multiple', ['A', 'B', 'C']);

            expect(result).toEqual([false, true, false]);
        });
    });
});
