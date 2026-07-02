import { describe, it, expect } from 'vitest';
import { getCurrentApp, setCurrentApp } from './runtime.js';
import type { App } from '@termuijs/core';

describe('JSX runtime app context', () => {
    it('defaults current app to null', () => {
        expect(getCurrentApp()).toBeNull();
    });

    it('sets and retrieves the current app instance', () => {
        const dummyApp = { name: 'DummyApp' } as unknown as App;
        setCurrentApp(dummyApp);
        expect(getCurrentApp()).toBe(dummyApp);

        // Reset back to null
        setCurrentApp(null);
        expect(getCurrentApp()).toBeNull();
    });
});
