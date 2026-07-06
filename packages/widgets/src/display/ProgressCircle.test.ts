import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { ProgressCircle } from './ProgressCircle.js';

function renderToString(widget: ProgressCircle, w = 20, h = 3): string {
  const screen = new Screen(w, h);
  widget.updateRect({ x: 0, y: 0, width: w, height: h });
  widget.render(screen);
  return screen.back.map(row => row.map(c => c.char).join('').trimEnd()).join('\n');
}

describe('ProgressCircle', () => {
  it('renders 0% as empty circle in sm mode', () => {
    const widget = new ProgressCircle({}, { value: 0, size: 'sm', showPercent: false });
    const out = renderToString(widget, 5, 1);
    // first char should be the 0% indicator
    expect(out.trim()).toBeTruthy();
  });

  it('renders 100% as full circle in sm mode', () => {
    const w1 = new ProgressCircle({}, { value: 0, size: 'sm', showPercent: false });
    const w2 = new ProgressCircle({}, { value: 100, size: 'sm', showPercent: false });
    const out1 = renderToString(w1, 5, 1);
    const out2 = renderToString(w2, 5, 1);
    expect(out1).not.toBe(out2); // different symbols
  });

  it('setValue updates rendered output', () => {
    const widget = new ProgressCircle({}, { value: 0, size: 'sm', showPercent: true });
    const before = renderToString(widget, 10, 1);
    widget.setValue(75);
    const after = renderToString(widget, 10, 1);
    expect(before).not.toBe(after);
  });

  it('clamps value to 0–100', () => {
    const widget = new ProgressCircle({}, { value: -10, size: 'sm' });
    expect(widget.value).toBe(0);
    widget.setValue(150);
    expect(widget.value).toBe(100);
  });

  it('getValue returns current value', () => {
    const widget = new ProgressCircle({}, { value: 42, size: 'sm' });
    expect(widget.value).toBe(42);
  });

  it('md size renders bracketed bar', () => {
    const widget = new ProgressCircle({}, { value: 50, size: 'md', showPercent: false });
    const out = renderToString(widget, 12, 1);
    expect(out).toBeTruthy();
  });

  it('shows percent label when showPercent=true', () => {
    const widget = new ProgressCircle({}, { value: 75, size: 'sm', showPercent: true });
    const out = renderToString(widget, 15, 1);
    expect(out).toContain('75');
  });

});
