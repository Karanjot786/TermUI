// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Pty widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Pty } from './Pty.js';
import { Screen } from '@termuijs/core';

type MockPtyProcess = {
    _emitStdout: (data: string) => void;
    _emitStderr: (data: string) => void;
    _emitClose: () => void;
    stdin: { writable: boolean; write: ReturnType<typeof vi.fn> };
    stdout: {
        on: (event: string, cb: (...args: unknown[]) => void) => void;
        removeListener: (event: string, cb: (...args: unknown[]) => void) => void;
        listenerCount: (event: string) => number;
    };
    stderr: {
        on: (event: string, cb: (...args: unknown[]) => void) => void;
        removeListener: (event: string, cb: (...args: unknown[]) => void) => void;
        listenerCount: (event: string) => number;
    };
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    removeListener: (event: string, cb: (...args: unknown[]) => void) => void;
    listenerCount: (event: string) => number;
    kill: ReturnType<typeof vi.fn>;
};

function getMockProcess(pty: Pty): MockPtyProcess {
    const process = (pty as unknown as { _process: MockPtyProcess | null })._process;
    if (!process) {
        throw new Error('Expected Pty to have a spawned process');
    }
    return process;
}

// Mock child_process to avoid actually spawning shells during tests
vi.mock('node:child_process', () => {
    return {
        spawn: vi.fn().mockImplementation(() => {
            const listeners = {
                stdoutData: new Set<(...args: unknown[]) => void>(),
                stderrData: new Set<(...args: unknown[]) => void>(),
                close: new Set<(...args: unknown[]) => void>(),
            };

            return {
                stdout: {
                    on: (event: string, cb: (...args: unknown[]) => void) => {
                        if (event === 'data') listeners.stdoutData.add(cb);
                    },
                    removeListener: (event: string, cb: (...args: unknown[]) => void) => {
                        if (event === 'data') listeners.stdoutData.delete(cb);
                    },
                    listenerCount: (event: string) => event === 'data' ? listeners.stdoutData.size : 0,
                },
                stderr: {
                    on: (event: string, cb: (...args: unknown[]) => void) => {
                        if (event === 'data') listeners.stderrData.add(cb);
                    },
                    removeListener: (event: string, cb: (...args: unknown[]) => void) => {
                        if (event === 'data') listeners.stderrData.delete(cb);
                    },
                    listenerCount: (event: string) => event === 'data' ? listeners.stderrData.size : 0,
                },
                stdin: {
                    writable: true,
                    write: vi.fn()
                },
                on: (event: string, cb: (...args: unknown[]) => void) => {
                    if (event === 'close') listeners.close.add(cb);
                },
                removeListener: (event: string, cb: (...args: unknown[]) => void) => {
                    if (event === 'close') listeners.close.delete(cb);
                },
                listenerCount: (event: string) => event === 'close' ? listeners.close.size : 0,
                kill: vi.fn(),
                
                // Helper to simulate output in tests
                _emitStdout: (data: string) => {
                    for (const cb of listeners.stdoutData) cb(Buffer.from(data));
                },
                _emitStderr: (data: string) => {
                    for (const cb of listeners.stderrData) cb(Buffer.from(data));
                },
                _emitClose: () => {
                    for (const cb of listeners.close) cb();
                }
            };
        })
    };
});

describe('Pty', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('creates a Pty without throwing', () => {
        expect(() => new Pty()).not.toThrow();
    });

    it('renders initial empty lines', () => {
        const pty = new Pty();
        const screen = new Screen(20, 5);
        pty.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        pty.render(screen);
        
        // Empty state
        expect(screen.back[0][0].char).toBe(' ');
    });

    it('handles process output and renders it', () => {
        const pty = new Pty();
        const screen = new Screen(20, 5);
        pty.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        
        // Grab the mocked process to simulate output
        const mockProcess = getMockProcess(pty);
        mockProcess._emitStdout('Hello terminal\nSecond line');
        
        pty.render(screen);
        
        // The first line should be rendered
        const row0 = screen.back[0].map(c => c.char).join('').trimEnd();
        expect(row0).toBe('Hello terminal');
        
        // The second line should be rendered
        const row1 = screen.back[1].map(c => c.char).join('').trimEnd();
        expect(row1).toBe('Second line');
    });

    it('renders stderr output', () => {
        const pty = new Pty();
        const screen = new Screen(20, 5);
    
        pty.updateRect({ x: 0, y: 0, width: 20, height: 5 });
    
        const mockProcess = getMockProcess(pty);
    
        mockProcess._emitStderr('Error occurred');
    
        pty.render(screen);
    
        const row0 = screen.back[0].map(c => c.char).join('').trimEnd();
    
        expect(row0).toBe('Error occurred');
    });

    it('renders process exit message on close', () => {
        const pty = new Pty();
        const screen = new Screen(30, 5);
    
        pty.updateRect({ x: 0, y: 0, width: 30, height: 5 });
    
        const mockProcess = getMockProcess(pty);
    
        mockProcess._emitClose();
    
        pty.render(screen);
    
        const output = screen.back
            .map(row => row.map(c => c.char).join(''))
            .join('\n');
    
        expect(output).toContain('[Process Exited]');
    });

    it('strips ANSI escape sequences from output', () => {
        const pty = new Pty();
        const screen = new Screen(20, 5);
        pty.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        
        const mockProcess = getMockProcess(pty);
        // Output with red text ANSI
        mockProcess._emitStdout('\x1b[31mColored text\x1b[0m');
        
        pty.render(screen);
        
        const row0 = screen.back[0].map(c => c.char).join('').trimEnd();
        expect(row0).toBe('Colored text');
    });

    it('pipes keys to stdin', () => {
        const pty = new Pty();
        const mockProcess = getMockProcess(pty);
        
        pty.handleKey({ key: 'a', raw: Buffer.from('a'), ctrl: false, alt: false, shift: false } as any);
        expect(mockProcess.stdin.write).toHaveBeenCalledWith(Buffer.from('a'));
        
        pty.handleKey({ key: 'enter', raw: Buffer.from('\n'), ctrl: false, alt: false, shift: false } as any);
        expect(mockProcess.stdin.write).toHaveBeenCalledWith(Buffer.from('\n'));
    });

    it('returns false when stdin is not writable', () => {
        const pty = new Pty();
    
        const mockProcess = getMockProcess(pty);
    
        mockProcess.stdin.writable = false;
    
        const handled = pty.handleKey({
            key: 'a',
            raw: Buffer.from('a'),
            ctrl: false,
            alt: false,
            shift: false,
        } as any);
    
        expect(handled).toBe(false);
        expect(mockProcess.stdin.write).not.toHaveBeenCalled();
    });

    it('cleans up process on destroy', () => {
        const pty = new Pty();
        const mockProcess = getMockProcess(pty);
        
        pty.destroy();
        expect(mockProcess.kill).toHaveBeenCalled();
        expect((pty as unknown as { _process: MockPtyProcess | null })._process).toBeNull();
    });

    it('ignores late process output after destroy', () => {
        const pty = new Pty();
        const screen = new Screen(20, 5);
        pty.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        pty.render(screen);

        const mockProcess = getMockProcess(pty);
        pty.destroy();

        mockProcess._emitStdout('late output');
        mockProcess._emitStderr('late stderr');
        mockProcess._emitClose();

        pty.render(screen);

        const output = screen.back
            .map(row => row.map(c => c.char).join(''))
            .join('\n');

        expect(output).not.toContain('late output');
        expect(output).not.toContain('late stderr');
        expect(output).not.toContain('[Process Exited]');
    });

    it('trims buffer to the last 1000 lines', () => {
        const pty = new Pty();
    
        const mockProcess = getMockProcess(pty);
    
        const output =
            Array.from({ length: 1100 }, (_, i) => `line-${i}`).join('\n');
    
        mockProcess._emitStdout(output);
    
    const lines = (pty as any)._lines;

    expect(lines.length).toBeLessThanOrEqual(1000);
    expect(lines[0]).toContain('line-100');
    expect(lines[lines.length - 1]).toContain('line-1099');    
    });
    
});
