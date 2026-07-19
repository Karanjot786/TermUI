/**
 * Integration tests for parallel rendering
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { ParallelRenderer } from '../../src/parallel';
import { Screen } from '../../src/screen';

describe('Parallel Rendering Integration', () => {
  let renderer: ParallelRenderer;
  let screen: Screen;

  beforeAll(() => {
    screen = new Screen({ width: 80, height: 24 });
    renderer = new ParallelRenderer({
      workers: 2,
      strategy: 'adaptive',
      partition: 'quadrant'
    });
  });

  test('should initialize with correct number of workers', () => {
    const stats = renderer.getStats();
    expect(stats.totalWorkers).toBe(2);
  });

  test('should render a simple screen', async () => {
    const result = await renderer.render({
      widgets: [
        { id: '1', type: 'box', x: 0, y: 0, width: 10, height: 5 },
        { id: '2', type: 'text', x: 5, y: 2, content: 'Hello' }
      ]
    });
    expect(result).toBeDefined();
    expect(result.sections).toBeDefined();
  });

  test('should handle 1000 widgets efficiently', async () => {
    const widgets = Array.from({ length: 1000 }, (_, i) => ({
      id: `w${i}`,
      type: 'box',
      x: i % 80,
      y: Math.floor(i / 80),
      width: 2,
      height: 1
    }));

    const start = performance.now();
    await renderer.render({ widgets });
    const time = performance.now() - start;

    expect(time).toBeLessThan(50); // Should render 1000 widgets in <50ms
  });

  afterAll(() => {
    renderer.dispose();
  });
});