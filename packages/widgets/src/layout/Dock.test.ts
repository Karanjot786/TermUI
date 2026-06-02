import { describe, it, expect, vi } from 'vitest';
import { Widget } from '../base/Widget.js';
import { Dock } from './Dock.js';
import type { Screen } from '@termuijs/core';

class TestWidget extends Widget {
  protected _renderSelf(_screen: Screen): void {}
}

describe('Dock', () => {
  it('top item occupies full row 0', () => {
    const top = new TestWidget();
    const dock = new Dock([{ widget: top, edge: 'top', size: 3 }]);
    dock.updateRect({ x: 0, y: 0, width: 80, height: 24 });
    expect(top.rect).toEqual({ x: 0, y: 0, width: 80, height: 3 });
  });

  it('bottom item occupies the last rows', () => {
    const bottom = new TestWidget();
    const dock = new Dock([{ widget: bottom, edge: 'bottom', size: 2 }]);
    dock.updateRect({ x: 0, y: 0, width: 80, height: 24 });
    expect(bottom.rect).toEqual({ x: 0, y: 22, width: 80, height: 2 });
  });

  it('fill item occupies the remaining center area', () => {
    const top = new TestWidget();
    const fill = new TestWidget();
    const dock = new Dock([
      { widget: top, edge: 'top', size: 3 },
      { widget: fill, edge: 'fill' },
    ]);
    dock.updateRect({ x: 0, y: 0, width: 80, height: 24 });
    expect(fill.rect).toEqual({ x: 0, y: 3, width: 80, height: 21 });
  });

  it('setItems triggers markDirty', () => {
    const dock = new Dock([]);
    const spy = vi.spyOn(dock, 'markDirty');
    dock.setItems([]);
    expect(spy).toHaveBeenCalled();
  });
});
