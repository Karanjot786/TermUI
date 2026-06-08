import { describe, expect, it } from 'vitest';
import ShortcutHelpOverlayDefault, {
    ShortcutHelpOverlay,
    type Shortcut,
    type ShortcutHelpOverlayProps,
} from './ShortcutHelpOverlay.js';

describe('ShortcutHelpOverlay', () => {
    it('exports a named function component', () => {
        expect(typeof ShortcutHelpOverlay).toBe('function');
    });

    it('default export matches named export', () => {
        expect(ShortcutHelpOverlayDefault).toBe(ShortcutHelpOverlay);
    });

    it('Shortcut shape has key and label strings', () => {
        const shortcut: Shortcut = { key: 'Ctrl+C', label: 'Exit' };
        expect(shortcut.key).toBe('Ctrl+C');
        expect(shortcut.label).toBe('Exit');
    });

    it('ShortcutHelpOverlayProps accepts shortcuts array', () => {
        const shortcuts: Shortcut[] = [
            { key: '?', label: 'Help' },
            { key: 'q', label: 'Quit' },
        ];
        const props: ShortcutHelpOverlayProps = { shortcuts };
        expect(props.shortcuts).toHaveLength(2);
        expect(props.shortcuts?.[0]?.key).toBe('?');
        expect(props.shortcuts?.[1]?.label).toBe('Quit');
    });
});
