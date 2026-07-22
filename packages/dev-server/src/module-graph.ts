export interface ModuleGraphNode {
    id: string;
    imports: Set<string>;
    importers: Set<string>;
    restartBoundary?: boolean;
}

export interface ModuleInvalidationResult {
    changed: string;
    invalidated: string[];
    restartTargets: string[];
}

export class ModuleGraph {
    private nodes = new Map<string, ModuleGraphNode>();

    addModule(id: string, imports: Iterable<string> = [], options: { restartBoundary?: boolean } = {}): ModuleGraphNode {
        const node = this.getOrCreate(id);
        node.restartBoundary = options.restartBoundary ?? node.restartBoundary;

        for (const previous of node.imports) {
            this.nodes.get(previous)?.importers.delete(id);
        }
        node.imports = new Set(imports);

        for (const imported of node.imports) {
            this.getOrCreate(imported).importers.add(id);
        }

        return node;
    }

    markRestartBoundary(id: string, restartBoundary = true): void {
        this.getOrCreate(id).restartBoundary = restartBoundary;
    }

    invalidate(changed: string): ModuleInvalidationResult {
        const invalidated = new Set<string>();
        const restartTargets = new Set<string>();
        const queue = [changed];

        while (queue.length > 0) {
            const id = queue.shift()!;
            if (invalidated.has(id)) continue;
            invalidated.add(id);

            const node = this.nodes.get(id);
            if (!node) continue;
            if (node.restartBoundary) {
                restartTargets.add(id);
                continue;
            }

            for (const importer of node.importers) {
                queue.push(importer);
            }
        }

        return {
            changed,
            invalidated: [...invalidated].sort(),
            restartTargets: [...restartTargets].sort(),
        };
    }

    get(id: string): ModuleGraphNode | undefined {
        return this.nodes.get(id);
    }

    clear(): void {
        this.nodes.clear();
    }

    private getOrCreate(id: string): ModuleGraphNode {
        let node = this.nodes.get(id);
        if (!node) {
            node = { id, imports: new Set(), importers: new Set() };
            this.nodes.set(id, node);
        }
        return node;
    }
}
