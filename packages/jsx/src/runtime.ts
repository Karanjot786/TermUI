import type { App } from '@termuijs/core';

let currentApp: App | null = null;

export function setCurrentApp(app: App | null): void {
    currentApp = app;
}

export function getCurrentApp(): App | null {
    return currentApp;
}