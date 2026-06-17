// ─────────────────────────────────────────────────────
// @termuijs/core — Layout computation benchmark
// ─────────────────────────────────────────────────────
//
// Measures layout engine throughput across different tree sizes and
// complexities. Every iteration invalidates the entire layout tree
// so the engine pays a worst-case full-recomputation cost.
//
// Output:
//   - human-readable lines on stdout
//   - one JSON line prefixed with `BENCH_RESULT_JSON:` for CI parsing

import { createLayoutNode, computeLayout, invalidateLayout } from '../layout/LayoutEngine.js';
import type { LayoutNode } from '../layout/LayoutEngine.js';
import type { Style } from '../style/Style.js';

interface TreeSizeResult {
    nodeCount: number;
    depth: number;
    layoutsPerSec: number;
    durationMs: number;
    iterations: number;
}

const TREE_CONFIGS = [
    { nodeCount: 10, depth: 3, branching: 3 },
    { nodeCount: 50, depth: 4, branching: 3 },
    { nodeCount: 100, depth: 5, branching: 3 },
    { nodeCount: 500, depth: 6, branching: 4 },
];

const RUN_MS = 1000;

function createLayoutTree(nodeCount: number, depth: number, branching: number): LayoutNode {
    let nodesCreated = 0;
    
    function createNode(currentDepth: number): LayoutNode {
        if (nodesCreated >= nodeCount) {
            return createLayoutNode(`node-${nodesCreated}`, {}, []);
        }
        
        nodesCreated++;
        const children: LayoutNode[] = [];
        
        if (currentDepth < depth && nodesCreated < nodeCount) {
            const remaining = nodeCount - nodesCreated;
            const childCount = Math.min(branching, remaining);
            for (let i = 0; i < childCount; i++) {
                children.push(createNode(currentDepth + 1));
                nodesCreated++;
            }
        }
        
        // Create a realistic style with various properties
        const style: Style = {
            flexDirection: currentDepth % 2 === 0 ? 'row' : 'column',
            padding: currentDepth % 3 === 0 ? 1 : 0,
            margin: currentDepth % 4 === 0 ? 1 : 0,
            border: currentDepth % 5 === 0 ? 'single' : undefined,
            width: currentDepth % 2 === 0 ? '100%' : undefined,
            height: currentDepth % 3 === 0 ? '50%' : undefined,
            gap: currentDepth % 4 === 0 ? 1 : 0,
        };
        
        return createLayoutNode(`node-${nodesCreated}`, style, children);
    }
    
    return createNode(0);
}

function benchTreeSize(nodeCount: number, depth: number, branching: number): TreeSizeResult {
    const root = createLayoutTree(nodeCount, depth, branching);
    const containerWidth = 120;
    const containerHeight = 50;
    
    // Warm-up pass
    invalidateLayout(root);
    computeLayout(root, containerWidth, containerHeight);
    
    let iterations = 0;
    const start = performance.now();
    const deadline = start + RUN_MS;
    
    while (performance.now() < deadline) {
        invalidateLayout(root);
        computeLayout(root, containerWidth, containerHeight);
        iterations++;
    }
    
    const durationMs = performance.now() - start;
    const layoutsPerSec = iterations / (durationMs / 1000);
    
    return { nodeCount, depth, layoutsPerSec, durationMs, iterations };
}

function main(): void {
    const results: TreeSizeResult[] = [];
    
    for (const { nodeCount, depth, branching } of TREE_CONFIGS) {
        const result = benchTreeSize(nodeCount, depth, branching);
        results.push(result);
        const lps = (result.layoutsPerSec).toFixed(0);
        console.log(`${result.nodeCount} nodes (depth ${result.depth}): ${lps} layouts/sec  (${result.iterations} iterations in ${result.durationMs.toFixed(0)}ms)`);
    }
    
    const payload = {
        version: 1,
        benchmark: 'layout-computation',
        runMs: RUN_MS,
        node: process.versions.node,
        bun: process.versions.bun ?? null,
        results,
    };
    console.log(`BENCH_RESULT_JSON: ${JSON.stringify(payload)}`);
}

main();
