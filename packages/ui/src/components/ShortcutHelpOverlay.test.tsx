/** @jsxImportSource @termuijs/jsx */
import { describe, it, expect } from 'vitest';
import { render } from '@termuijs/testing';
import { ShortcutHelpOverlay } from './ShortcutHelpOverlay.js';

describe('ShortcutHelpOverlay', () => {
    it('should not be visible by default', () => {
        const screen = render(<ShortcutHelpOverlay />);
        expect(screen.getOutput()).not.toContain('Keyboard Shortcuts');
    });

    it('should open when "?" key is pressed and close on escape', () => {
        const screen = render(<ShortcutHelpOverlay />);
        expect(screen.getOutput()).not.toContain('Keyboard Shortcuts');

        // Press ? to open
        screen.pressKey('?');
        expect(screen.getOutput()).toContain('Keyboard Shortcuts');

        // Press escape to close
        screen.pressKey('escape');
        expect(screen.getOutput()).not.toContain('Keyboard Shortcuts');
    });

    it('should close when "q" key is pressed', () => {
        const screen = render(<ShortcutHelpOverlay />);
        screen.pressKey('?');
        expect(screen.getOutput()).toContain('Keyboard Shortcuts');

        // Press q to close
        screen.pressKey('q');
        expect(screen.getOutput()).not.toContain('Keyboard Shortcuts');
    });

    it('should render custom shortcuts list when visible', () => {
        const custom = [
            { key: 'Ctrl+F', label: 'Search Files' },
            { key: 'Ctrl+P', label: 'Print Document' }
        ];
        const screen = render(<ShortcutHelpOverlay shortcuts={custom} />);
        screen.pressKey('?');
        
        const output = screen.getOutput();
        expect(output).toContain('[Ctrl+F]');
        expect(output).toContain('Search Files');
        expect(output).toContain('[Ctrl+P]');
        expect(output).toContain('Print Document');
    });
});
