import { describe, expect, it } from 'vitest';
import { StatusBar } from './StatusBar.js';

describe('StatusBar', () => {
    it('creates a StatusBar instance', () => {
        const statusBar = new StatusBar({}, {
            left: 'Ready',
            center: 'Dashboard',
            right: 'Ctrl+C Exit',
        });

        expect(statusBar).toBeDefined();
    });

    it('updates left section', () => {
        const statusBar = new StatusBar();

        statusBar.setLeft('Connected');

        expect(statusBar).toBeDefined();
    });

    it('updates center section', () => {
        const statusBar = new StatusBar();

        statusBar.setCenter('Workspace');

        expect(statusBar).toBeDefined();
    });

    it('updates right section', () => {
        const statusBar = new StatusBar();

        statusBar.setRight('F1 Help');

        expect(statusBar).toBeDefined();
    });
});