// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Pty widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Pty } from './Pty.js';
import { Screen } from '@termuijs/core';

// Mock child_process to avoid actually spawning shells during tests
vi.mock('node:child_process', () => {
    return {
        spawn: vi.fn().mockImplementation(() => {
            let stdoutCb: any;
            let stderrCb: any;
            let closeCb: any;
            
            return {
                stdout: {
                    on: (event: string, cb: any) => { if (event === 'data') stdoutCb = cb; }
                },
                stderr: {
                    on: (event: string, cb: any) => { if (event === 'data') stderrCb = cb; }
                },
                stdin: {
                    writable: true,
                    write: vi.fn()
                },
                on: (event: string, cb: any) => { if (event === 'close') closeCb = cb; },
                kill: vi.fn(),
                
                // Helper to simulate output in tests
                _emitStdout: (data: string) => {
                    if (stdoutCb) stdoutCb(Buffer.from(data));
                },
                _emitStderr: (data: string) => {
                    if (stderrCb) stderrCb(Buffer.from(data));
                },
                _emitClose: () => {
                    if (closeCb) closeCb();
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
        const mockProcess = (pty as any)._process;
        mockProcess._emitStdout('Hello terminal\nSecond line');
        
        pty.render(screen);
        
        // The first line should be rendered
        const row0 = screen.back[0].map(c => c.char).join('').trimEnd();
        expect(row0).toBe('Hello terminal');
        
        // The second line should be rendered
        const row1 = screen.back[1].map(c => c.char).join('').trimEnd();
        expect(row1).toBe('Second line');
    });

    it('strips ANSI escape sequences from output', () => {
        const pty = new Pty();
        const screen = new Screen(20, 5);
        pty.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        
        const mockProcess = (pty as any)._process;
        // Output with red text ANSI
        mockProcess._emitStdout('\x1b[31mColored text\x1b[0m');
        
        pty.render(screen);
        
        const row0 = screen.back[0].map(c => c.char).join('').trimEnd();
        expect(row0).toBe('Colored text');
    });

    it('pipes keys to stdin', () => {
        const pty = new Pty();
        const mockProcess = (pty as any)._process;
        
        pty.handleKey({ key: 'a', raw: Buffer.from('a'), ctrl: false, alt: false, shift: false } as any);
        expect(mockProcess.stdin.write).toHaveBeenCalledWith(Buffer.from('a'));
        
        pty.handleKey({ key: 'enter', raw: Buffer.from('\n'), ctrl: false, alt: false, shift: false } as any);
        expect(mockProcess.stdin.write).toHaveBeenCalledWith(Buffer.from('\n'));
    });

    it('cleans up process on destroy', () => {
        const pty = new Pty();
        const mockProcess = (pty as any)._process;
        
        pty.destroy();
        expect(mockProcess.kill).toHaveBeenCalled();
        expect((pty as any)._process).toBeNull();
    });
});
