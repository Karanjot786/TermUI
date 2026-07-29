// Benchmark: easing functions at simulated 60fps (16.67ms per frame)
// Run: bun packages/motion/bench/easing.ts

import { spring, linear, easeInOut } from "../src/easing";

const FRAMES = 60;

function benchmark(name: string, fn: (t: number) => number) {
  const times: number[] = [];
  for (let frame = 0; frame <= FRAMES; frame++) {
    const t = frame / FRAMES;
    const start = Date.now();
    fn(t);
    times.push(Date.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);
  console.log(`${name}: avg=${avg.toFixed(3)}ms  max=${max}ms`);
}

console.log(`Easing Benchmark -- ${FRAMES} frames`);
benchmark("spring", (t) => spring(t));
benchmark("linear", (t) => linear(t));
benchmark("easeInOut", (t) => easeInOut(t));
