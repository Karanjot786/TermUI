import { describe, it, expect } from 'vitest';
import { ShortcutManager, Shortcut } from './ShortcutManager.js';

describe('ShortcutManager', () => {
    const getDefaultShortcuts = (): Shortcut[] => [
        { command: 'open_file', keys: 'ctrl+o', category: 'File' },
        { command: 'save_file', keys: 'ctrl+s', category: 'File' },
        { command: 'find_text', keys: 'ctrl+f', category: 'Edit' },
    ];

    it('should initialize with default shortcuts', () => {
        const defaultShortcuts = getDefaultShortcuts();
        const manager = new ShortcutManager(defaultShortcuts);
        expect(manager.getShortcuts()).toEqual(defaultShortcuts);
    });

    it('should initialize with an empty list if none provided', () => {
        const manager = new ShortcutManager();
        expect(manager.getShortcuts()).toEqual([]);
    });

    it('should add a new shortcut', () => {
        const manager = new ShortcutManager();
        const newShortcut: Shortcut = { command: 'close_file', keys: 'ctrl+w', category: 'File' };
        manager.addShortcut(newShortcut);
        expect(manager.getShortcuts()).toContainEqual(newShortcut);
        expect(manager.getShortcuts().length).toBe(1);
    });

    it('should update keybindings of an existing shortcut by command name', () => {
        const manager = new ShortcutManager(getDefaultShortcuts());
        manager.updateShortcut('save_file', 'ctrl+shift+s');
        const updated = manager.getShortcuts().find(s => s.command === 'save_file');
        expect(updated?.keys).toBe('ctrl+shift+s');
    });

    it('should not throw or modify anything when updating a non-existent shortcut', () => {
        const defaultShortcuts = getDefaultShortcuts();
        const manager = new ShortcutManager(defaultShortcuts);
        expect(() => manager.updateShortcut('non_existent', 'ctrl+x')).not.toThrow();
        expect(manager.getShortcuts()).toEqual(defaultShortcuts);
    });

    it('should search shortcuts case-insensitively by command', () => {
        const manager = new ShortcutManager(getDefaultShortcuts());
        const results = manager.search('SAVE');
        expect(results).toEqual([
            { command: 'save_file', keys: 'ctrl+s', category: 'File' }
        ]);
    });

    it('should search shortcuts case-insensitively by keys', () => {
        const manager = new ShortcutManager(getDefaultShortcuts());
        const results = manager.search('CTRL+O');
        expect(results).toEqual([
            { command: 'open_file', keys: 'ctrl+o', category: 'File' }
        ]);
    });

    it('should return empty search results if query matches nothing', () => {
        const manager = new ShortcutManager(getDefaultShortcuts());
        const results = manager.search('ctrl+alt+delete');
        expect(results).toEqual([]);
    });

    it('should export the config as pretty-printed JSON', () => {
        const defaultShortcuts = getDefaultShortcuts();
        const manager = new ShortcutManager(defaultShortcuts);
        const exported = manager.exportConfig();
        expect(exported).toBe(JSON.stringify(defaultShortcuts, null, 2));
    });

    it('should import the config JSON and replace current shortcuts', () => {
        const manager = new ShortcutManager(getDefaultShortcuts());
        const newConfig = [
            { command: 'new_action', keys: 'ctrl+n', category: 'General' }
        ];
        const newConfigString = JSON.stringify(newConfig);
        manager.importConfig(newConfigString);
        expect(manager.getShortcuts()).toEqual(newConfig);
    });
});
