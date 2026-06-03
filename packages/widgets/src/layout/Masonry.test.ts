import { describe, it, expect, vi } from 'vitest';
import { Masonry } from './Masonry.js';
import { Widget } from '../base/Widget.js';

// Helper: create a real widget with a fixed preferredHeight
function makeWidget(height: number): Widget {
  const w = new Widget({});
  w.preferredHeight = height;
  return w;
}

describe('Masonry', () => {
  it('distributes 4 children across 2 columns', () => {
    const children = [
      makeWidget(3), // col 0
      makeWidget(3), // col 1
      makeWidget(3), // col 0
      makeWidget(3), // col 1
    ];

    const masonry = new Masonry(children, {}, { columns: 2 });
    masonry.updateRect({ x: 0, y: 0, width: 80, height: 24 });

    // children 0 and 2 should be in column 0 (x=0)
    expect(children[0].rect?.x).toBe(0);
    expect(children[2].rect?.x).toBe(0);

    // children 1 and 3 should be in column 1 (x=40)
    expect(children[1].rect?.x).toBe(40);
    expect(children[3].rect?.x).toBe(40);
  });

  it('puts next item in shorter column when one is taller', () => {
    const children = [
      makeWidget(10), // col 0 — tall
      makeWidget(2),  // col 1 — short
      makeWidget(2),  // should go to col 1 (shorter)
    ];

    const masonry = new Masonry(children, {}, { columns: 2 });
    masonry.updateRect({ x: 0, y: 0, width: 80, height: 24 });

    // child 2 should go to column 1 (x=40) because col 1 is shorter
    expect(children[2].rect?.x).toBe(40);
  });

  it('setChildren triggers markDirty', () => {
    const masonry = new Masonry([], {}, { columns: 2 });
    const spy = vi.spyOn(masonry, 'markDirty');

    masonry.setChildren([makeWidget(1)]);

    expect(spy).toHaveBeenCalled();
  });
});