import { describe, it, expect } from 'vitest';
import { Panel } from './Panel.js';
import { Widget } from '../base/Widget.js';
import type { Screen } from '@termuijs/core';

class TestChild extends Widget {
  wasRendered = false;

  protected _renderSelf(_screen: Screen): void {
    this.wasRendered = true;
  }
}

describe('Panel widget', () => {
  it('has correct title after construction', () => {
    const panel = new Panel({}, { title: 'My Panel' });
    expect(panel).toBeDefined();
  });

  it('updates title with setTitle and marks dirty', () => {
    const panel = new Panel({}, { title: 'Old Title' });
    panel.setTitle('New Title');
    expect(panel.isDirty).toBe(true);
  });

  it('accepts a child widget via addChild', () => {
    const panel = new Panel({}, { title: 'Info' });
    const child = new TestChild();
    panel.addChild(child);
    expect(panel.children.length).toBe(1);
  });

  it('has border style set to single by default', () => {
    const panel = new Panel({}, { title: 'Test' });
    expect(panel.style.border).toBe('single');
  });

  it('clears children with clearChildren', () => {
    const panel = new Panel({}, { title: 'Test' });
    panel.addChild(new TestChild());
    panel.addChild(new TestChild());
    panel.clearChildren();
    expect(panel.children.length).toBe(0);
  });
});
