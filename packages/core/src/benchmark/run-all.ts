// ─────────────────────────────────────────────────────
// @termuijs/core — Benchmark runner
// ─────────────────────────────────────────────────────
//
// Runs all benchmarks and aggregates results into a single JSON output.
// Each benchmark outputs a line prefixed with `BENCH_RESULT_JSON:` which
// this script collects and combines.
//
// Output:
//   - human-readable summary on stdout
//   - one JSON line prefixed with `BENCH_RESULT_JSON:` for CI parsing

import { spawn } from 'node:child_process';

const report = (msg: string) => process.stdout.write(msg + '\n');

interface BenchmarkResult {
    benchmark: string;
    version: number;
    runMs: number;
    node: string;
    bun: string | null;
    results: unknown[];
}

interface AggregatedResults {
    version: 1;
    benchmarks: BenchmarkResult[];
    node: string;
    bun: string | null;
}

const BENCHMARKS = [
    'render-loop.ts',
    'layout-computation.ts',
    'style-merge.ts',
    'input-parsing.ts',
    'border-merge.ts',
];

async function runBenchmark(benchmarkFile: string): Promise<BenchmarkResult> {
    return new Promise((resolve, reject) => {
        const proc = spawn('bun', [benchmarkFile], {
            cwd: new URL('.', import.meta.url),
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let resolved = false;

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                reject(new Error(`Failed to spawn benchmark ${benchmarkFile}: ${err.message}`));
            }
        });

        proc.on('close', (code) => {
            if (resolved) return;
            resolved = true;
            
            if (code !== 0) {
                reject(new Error(`Benchmark ${benchmarkFile} failed with code ${code}: ${stderr}`));
                return;
            }

            // Extract the JSON line
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.startsWith('BENCH_RESULT_JSON:')) {
                    try {
                        const jsonStr = line.replace('BENCH_RESULT_JSON: ', '');
                        const result = JSON.parse(jsonStr);
                        // Validate the result structure
                        if (!result || typeof result !== 'object') {
                            throw new Error('Invalid result: not an object');
                        }
                        if (!result.benchmark || typeof result.benchmark !== 'string') {
                            throw new Error('Invalid result: missing or invalid benchmark field');
                        }
                        if (!Array.isArray(result.results)) {
                            throw new Error('Invalid result: results is not an array');
                        }
                        resolve(result as BenchmarkResult);
                        return;
                    } catch (e) {
                        reject(new Error(`Failed to parse benchmark result from ${benchmarkFile}: ${e}`));
                        return;
                    }
                }
            }
            reject(new Error(`No BENCH_RESULT_JSON line found in output from ${benchmarkFile}`));
        });
    });
}

async function main(): Promise<void> {
    report('Running all benchmarks...\n');

    const results: BenchmarkResult[] = [];
    const benchmarkDir = new URL('.', import.meta.url);

    for (const benchmarkFile of BENCHMARKS) {
        const fullPath = new URL(benchmarkFile, benchmarkDir);
        report(`Running ${benchmarkFile}...`);
        try {
            const result = await runBenchmark(fullPath.pathname);
            results.push(result);
            report(`  ✓ ${result.benchmark} completed\n`);
        } catch (error) {
            process.stderr.write(`  ✗ ${benchmarkFile} failed:` + ' ' + String(error) + '\n');
            process.exit(1);
        }
    }

    report('\n=== Benchmark Summary ===\n');
    for (const result of results) {
        report(`${result.benchmark}:`);
        report(`  Node: ${result.node}`);
        report(`  Bun: ${result.bun ?? 'n/a'}`);
        report(`  Run time: ${result.runMs}ms per iteration`);
        report(`  Results: ${result.results.length} data points`);
        report('');
    }

    const payload: AggregatedResults = {
        version: 1,
        benchmarks: results,
        node: process.versions.node,
        bun: process.versions.bun ?? null,
    };

    report(`BENCH_RESULT_JSON: ${JSON.stringify(payload)}`);
}

main().catch((error) => {
    process.stderr.write('Benchmark runner failed:' + ' ' + String(error) + '\n');
    process.exit(1);
});
