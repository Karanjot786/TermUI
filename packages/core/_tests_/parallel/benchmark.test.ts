/**
 * Performance benchmarks for parallel rendering
 */

import { describe, bench } from 'vitest';
import { ParallelRenderer } from '../../src/parallel';
import { Screen } from '../../src/screen';

describe('Parallel Rendering Benchmarks', () => {
  const screen = new Screen({ width: 80, height: 24 });
  const renderer = new ParallelRenderer({
    workers: 4,
    strategy: 'adaptive',
    partition: 'quadrant'
  });

  const generateWidgets = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `w${i}`,
      type: 'box',
      x: i % 80,
      y: Math.floor(i / 80) % 24,
      width: 2,
      height: 1
    }));
  };

  bench('render 1000 widgets', async () => {
    await renderer.render({ widgets: generateWidgets(1000) });
  });

  bench('render 10000 widgets', async () => {
    await renderer.render({ widgets: generateWidgets(10000) });
  });

  bench('render 100000 widgets', async () => {
    await renderer.render({ widgets: generateWidgets(100000) });
  });
});