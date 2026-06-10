import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@termuijs/testing';
import { createElement, useRef } from '@termuijs/jsx';
import { PathInput } from './PathInput.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock fs module
vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs')>();
    return {
        ...actual,
        readdirSync: vi.fn(),
    };
});

describe('PathInput', () => {
    beforeEach(() => {
        // Provide mock implementation
        vi.mocked(fs.readdirSync).mockImplementation(((dirPath: any, options: any) => {
            return [
                { name: 'src', isDirectory: () => true },
                { name: 'package.json', isDirectory: () => false },
                { name: 'README.md', isDirectory: () => false },
            ] as fs.Dirent[];
        }) as any);
    });

    afterEach(() => {
        vi.mocked(fs.readdirSync).mockReset();
    });

    it('renders its current value', () => {
        const screen = render(createElement(() => {
            const ref = useRef<PathInput | null>(null);
            if (!ref.current) {
                ref.current = new PathInput();
                ref.current.value = 'src/index.ts';
            }
            return ref.current;
        }, null));
        
        expect(screen.lastFrame().join('\n')).toContain('src/index.ts');
        screen.unmount();
    });

    it('updates value on keypress', () => {
        let input!: PathInput;
        const screen = render(createElement(() => {
            const ref = useRef<PathInput | null>(null);
            if (!ref.current) {
                ref.current = new PathInput();
            }
            input = ref.current;
            return ref.current;
        }, null));
        
        input.handleKey({ key: 's', ctrl: false, shift: false, alt: false, raw: Buffer.from('s'), stopPropagation: () => {}, preventDefault: () => {} });
        screen.rerender();

        expect(input.value).toBe('s');
        expect(screen.lastFrame().join('\n')).toContain('s');
        screen.unmount();
    });

    it('completes a partial path on the completion key', () => {
        let input!: PathInput;
        const screen = render(createElement(() => {
            const ref = useRef<PathInput | null>(null);
            if (!ref.current) {
                // Ensure sufficient height to render completions
                ref.current = new PathInput({ height: 5 }, { cwd: '/mock/dir' });
                ref.current.value = 's';
            }
            input = ref.current;
            return ref.current;
        }, null));
        
        // Press tab to trigger completion
        input.handleKey({ key: 'tab', ctrl: false, shift: false, alt: false, raw: Buffer.from('\t'), stopPropagation: () => {}, preventDefault: () => {} });
        screen.rerender();

        // The first match should be 'src' (a directory, so it appends a separator)
        const expectedVal = 'src' + path.sep;
        expect(input.value).toBe(expectedVal);
        expect(screen.lastFrame().join('\n')).toContain(expectedVal);
        
        screen.unmount();
    });

    it('prevents default Tab focus navigation when completing', () => {
        const input = new PathInput({}, { cwd: '/mock/dir' });
        input.value = 's';
        const event = {
            key: 'tab',
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from('\t'),
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        } as unknown as import('@termuijs/core').KeyEvent; // runtime-only test object with mocked event methods

        input.handleKey(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
    });
});
