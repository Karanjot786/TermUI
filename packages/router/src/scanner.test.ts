import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';

import { scanRoutes } from './scanner.js';

describe('scanRoutes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns empty array when directory does not exist', () => {
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);

        expect(scanRoutes('/screens')).toEqual([]);
    });

    it('discovers root index route', () => {
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);

        vi.spyOn(fs, 'readdirSync').mockReturnValue(['index.tsx'] as any);

        vi.spyOn(fs, 'statSync').mockReturnValue({
            isDirectory: () => false,
        } as any);

        const routes = scanRoutes('/screens');

        expect(routes).toHaveLength(1);
        expect(routes[0]?.urlPath).toBe('/');
        expect(routes[0]?.isIndex).toBe(true);
        expect(routes[0]?.isDynamic).toBe(false);
    });

    it('discovers standard route', () => {
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);

        vi.spyOn(fs, 'readdirSync').mockReturnValue(['about.tsx'] as any);

        vi.spyOn(fs, 'statSync').mockReturnValue({
            isDirectory: () => false,
        } as any);

        const routes = scanRoutes('/screens');

        expect(routes[0]?.urlPath).toBe('/about');
        expect(routes[0]?.isIndex).toBe(false);
    });

    it('detects dynamic routes', () => {
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);

        vi.spyOn(fs, 'readdirSync').mockReturnValue(['[id].tsx'] as any);

        vi.spyOn(fs, 'statSync').mockReturnValue({
            isDirectory: () => false,
        } as any);

        const routes = scanRoutes('/screens');

        expect(routes[0]?.urlPath).toBe('/[id]');
        expect(routes[0]?.isDynamic).toBe(true);
    });

    it('ignores private files', () => {
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);

        vi.spyOn(fs, 'readdirSync').mockReturnValue([
            '_private.tsx',
            '.hidden.tsx',
        ] as any);

        vi.spyOn(fs, 'statSync').mockReturnValue({
            isDirectory: () => false,
        } as any);

        const routes = scanRoutes('/screens');

        expect(routes).toHaveLength(0);
    });

    it('sorts static routes before dynamic routes', () => {
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);

        vi.spyOn(fs, 'readdirSync').mockReturnValue([
            '[id].tsx',
            'about.tsx',
        ] as any);

        vi.spyOn(fs, 'statSync').mockReturnValue({
            isDirectory: () => false,
        } as any);

        const routes = scanRoutes('/screens');

        expect(routes[0]?.urlPath).toBe('/about');
        expect(routes[1]?.urlPath).toBe('/[id]');
    });
});