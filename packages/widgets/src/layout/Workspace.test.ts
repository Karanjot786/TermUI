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
});