// ─────────────────────────────────────────────────────
// @termuijs/core — Style merging benchmark
// ─────────────────────────────────────────────────────
//
// Measures style merging performance across different style complexities.
// Style merging is a hot path during rendering as widgets inherit and override styles.
//
// Output:
//   - human-readable lines on stdout
//   - one JSON line prefixed with `BENCH_RESULT_JSON:` for CI parsing

import { mergeStyles, defaultStyle } from '../style/Style.js';
import type { Style } from '../style/Style.js';

interface StyleComplexityResult {
    propertyCount: number;
    mergesPerSec: number;
    durationMs: number;
    iterations: number;
}

const STYLE_CONFIGS = [
    { propertyCount: 5 },
    { propertyCount: 10 },
    { propertyCount: 20 },
    { propertyCount: 30 },
];

const RUN_MS = 1000;

function createComplexStyle(propertyCount: number): Style {
    const allProperties: Array<keyof Style> = [
        'fg', 'bg', 'bold', 'italic', 'underline', 'dim', 'strikethrough', 'inverse',
        'padding', 'margin', 'border', 'asciiOnly', 'borderColor',
        'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
        'x', 'y', 'groupId',
        'flexDirection', 'justifyContent', 'alignItems', 'flexGrow', 'flexShrink', 'flexWrap', 'gap',
        'overflow', 'zIndex', 'focusRingColor', 'focusRingStyle', 'visible',
    ];
    
    const style: Style = {};
    for (let i = 0; i < Math.min(propertyCount, allProperties.length); i++) {
        const prop = allProperties[i];
        switch (prop) {
            case 'fg':
            case 'bg':
            case 'borderColor':
            case 'focusRingColor':
                style[prop] = { type: 'named', name: 'red' };
                break;
            case 'bold':
            case 'italic':
            case 'underline':
            case 'dim':
            case 'strikethrough':
            case 'inverse':
            case 'asciiOnly':
            case 'visible':
                style[prop] = i % 2 === 0;
                break;
            case 'padding':
            case 'margin':
                style[prop] = i % 3 === 0 ? 1 : 0;
                break;
            case 'border':
                style[prop] = 'single';
                break;
            case 'width':
            case 'height':
            case 'minWidth':
            case 'minHeight':
            case 'maxWidth':
            case 'maxHeight':
            case 'x':
            case 'y':
            case 'flexGrow':
            case 'flexShrink':
            case 'gap':
            case 'zIndex':
                style[prop] = i + 1;
                break;
            case 'flexDirection':
                style[prop] = i % 2 === 0 ? 'row' : 'column';
                break;
            case 'justifyContent':
                style[prop] = 'center';
                break;
            case 'alignItems':
                style[prop] = 'stretch';
                break;
            case 'flexWrap':
                style[prop] = 'nowrap';
                break;
            case 'overflow':
                style[prop] = 'hidden';
                break;
            case 'focusRingStyle':
                style[prop] = 'border';
                break;
            default:
                break;
        }
    }
    return style;
}

function benchStyleComplexity(propertyCount: number): StyleComplexityResult {
    const base = defaultStyle();
    const override = createComplexStyle(propertyCount);
    
    // Warm-up pass
    for (let i = 0; i < 1000; i++) {
        mergeStyles(base, override);
    }
    
    let iterations = 0;
    const start = performance.now();
    const deadline = start + RUN_MS;
    
    while (performance.now() < deadline) {
        mergeStyles(base, override);
        iterations++;
    }
    
    const durationMs = performance.now() - start;
    const mergesPerSec = iterations / (durationMs / 1000);
    
    return { propertyCount, mergesPerSec, durationMs, iterations };
}

function main(): void {
    const results: StyleComplexityResult[] = [];
    
    for (const { propertyCount } of STYLE_CONFIGS) {
        const result = benchStyleComplexity(propertyCount);
        results.push(result);
        const mps = (result.mergesPerSec / 1e6).toFixed(2);
        process.stdout.write(`${result.propertyCount} properties: ${mps}M merges/sec  (${result.iterations} iterations in ${result.durationMs.toFixed(0)}ms)` + '\n');
    }
    
    const payload = {
        version: 1,
        benchmark: 'style-merge',
        runMs: RUN_MS,
        node: process.versions.node,
        bun: process.versions.bun ?? null,
        results,
    };
    process.stdout.write(`BENCH_RESULT_JSON: ${JSON.stringify(payload)}` + '\n');
}

main();
