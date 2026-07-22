import { describe, expect, it } from 'vitest';
import { ModuleGraph } from './module-graph.js';

describe('ModuleGraph', () => {
    it('tracks imports and reverse importers', () => {
        const graph = new ModuleGraph();
        graph.addModule('app.ts', ['button.ts']);

        expect(graph.get('app.ts')?.imports.has('button.ts')).toBe(true);
        expect(graph.get('button.ts')?.importers.has('app.ts')).toBe(true);
    });

    it('invalidates importers until restart boundaries', () => {
        const graph = new ModuleGraph();
        graph.addModule('app.ts', ['routes.ts'], { restartBoundary: true });
        graph.addModule('routes.ts', ['button.ts']);
        graph.addModule('button.ts');

        const result = graph.invalidate('button.ts');

        expect(result.invalidated).toEqual(['app.ts', 'button.ts', 'routes.ts']);
        expect(result.restartTargets).toEqual(['app.ts']);
    });

    it('updates reverse edges when module imports change', () => {
        const graph = new ModuleGraph();
        graph.addModule('app.ts', ['a.ts']);
        graph.addModule('app.ts', ['b.ts']);

        expect(graph.get('a.ts')?.importers.has('app.ts')).toBe(false);
        expect(graph.get('b.ts')?.importers.has('app.ts')).toBe(true);
    });
});
