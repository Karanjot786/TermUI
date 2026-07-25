import { describe, expect, it } from 'vitest';
import { Workspace } from './Workspace.js';

describe('Workspace', () => {
    it('saves and loads layouts', () => {
        const workspace = new Workspace();

        const layout = {
            id: 'dashboard',
            panels: [{ id: 'logs' }, { id: 'stats' }],
        };

        workspace.saveLayout('dashboard', layout);

        expect(workspace.loadLayout('dashboard')).toEqual(layout);
    });

    it('switches workspaces', () => {
        const workspace = new Workspace();

        workspace.saveLayout('default', {
            id: 'default',
            panels: [],
        });

        workspace.saveLayout('dev', {
            id: 'dev',
            panels: [],
        });

        workspace.switchWorkspace('dev');

        expect(workspace.getCurrentWorkspace()).toBe('dev');
    });

    it('lists workspace names', () => {
        const workspace = new Workspace();

        workspace.saveLayout('default', {
            id: 'default',
            panels: [],
        });

        workspace.saveLayout('editor', {
            id: 'editor',
            panels: [],
        });

        expect(workspace.getWorkspaceNames()).toEqual([
            'default',
            'editor',
        ]);
    });

    it('removes a workspace', () => {
        const workspace = new Workspace();

        workspace.saveLayout('temp', {
            id: 'temp',
            panels: [],
        });

        workspace.removeWorkspace('temp');

        expect(workspace.loadLayout('temp')).toBeUndefined();
    });

    it('clears all workspaces', () => {
        const workspace = new Workspace();

        workspace.saveLayout('one', {
            id: 'one',
            panels: [],
        });

        workspace.saveLayout('two', {
            id: 'two',
            panels: [],
        });

        workspace.clear();

        expect(workspace.getWorkspaceNames()).toEqual([]);
    });

    it('restores layouts from storage', () => {
        const saved = new Map<string, string>();
        const storage = {
            save: (name: string, data: string) => saved.set(name, data),
            load: (name: string) => saved.get(name) ?? null,
        };
        const source = new Workspace();
        source.saveLayout('default', { id: 'default', panels: [{ id: 'main' }] });
        source.save(storage);

        const restored = new Workspace();
        restored.restore(storage);

        expect(restored.loadLayout('default')).toEqual({ id: 'default', panels: [{ id: 'main' }] });
    });

    it('ignores corrupt stored layout data without throwing', () => {
        const workspace = new Workspace();
        workspace.saveLayout('default', { id: 'default', panels: [] });
        const storage = {
            save: () => {},
            load: () => '{',
        };

        expect(() => workspace.restore(storage)).not.toThrow();
        expect(workspace.loadLayout('default')).toEqual({ id: 'default', panels: [] });
    });

    it('ignores stored layout data with the wrong shape', () => {
        const workspace = new Workspace();
        workspace.saveLayout('default', { id: 'default', panels: [] });
        const storage = {
            save: () => {},
            load: () => JSON.stringify([['broken', { id: 'broken' }]]),
        };

        workspace.restore(storage);

        expect(workspace.getWorkspaceNames()).toEqual(['default']);
        expect(workspace.loadLayout('broken')).toBeUndefined();
    });
});
