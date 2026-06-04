import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { StatusIndicator } from './StatusIndicator.js';

describe('StatusIndicator', () => {
  it('renders a filled dot when status is up', () => {
    const screen = new Screen(30, 1);
    const indicator = new StatusIndicator('API', true, { width: 30, height: 1 });
    indicator.updateRect({ x: 0, y: 0, width: 30, height: 1 });
    indicator.render(screen);
    // up state renders a filled circle character
    expect(screen.back[0][0].char).toBe('●');
  });

  it('renders an empty dot when status is down', () => {
    const screen = new Screen(30, 1);
    const indicator = new StatusIndicator('API', false, { width: 30, height: 1 });
    indicator.updateRect({ x: 0, y: 0, width: 30, height: 1 });
    indicator.render(screen);
    // down state renders an empty circle character
    expect(screen.back[0][0].char).toBe('○');
  });

  it('renders the label text', () => {
    const screen = new Screen(30, 1);
    const indicator = new StatusIndicator('Worker', true, { width: 30, height: 1 });
    indicator.updateRect({ x: 0, y: 0, width: 30, height: 1 });
    indicator.render(screen);
    const row = screen.back[0].map((c: { char: string }) => c.char).join('');
    expect(row).toContain('Worker');
  });

  it('renders "Online" when up and "Offline" when down', () => {
    const screenUp = new Screen(30, 1);
    const screenDown = new Screen(30, 1);
    new StatusIndicator('Svc', true, { width: 30, height: 1 })
      .updateRect({ x: 0, y: 0, width: 30, height: 1 });
    const up = new StatusIndicator('Svc', true, { width: 30, height: 1 });
    up.updateRect({ x: 0, y: 0, width: 30, height: 1 });
    up.render(screenUp);
    const down = new StatusIndicator('Svc', false, { width: 30, height: 1 });
    down.updateRect({ x: 0, y: 0, width: 30, height: 1 });
    down.render(screenDown);
    const rowUp   = screenUp.back[0].map((c: { char: string }) => c.char).join('');
    const rowDown = screenDown.back[0].map((c: { char: string }) => c.char).join('');
    expect(rowUp).toContain('Online');
    expect(rowDown).toContain('Offline');
  });

  it('renders different output for up vs down state', () => {
    const screenA = new Screen(30, 1);
    const screenB = new Screen(30, 1);
    const a = new StatusIndicator('X', true, { width: 30, height: 1 });
    a.updateRect({ x: 0, y: 0, width: 30, height: 1 });
    a.render(screenA);
    const b = new StatusIndicator('X', false, { width: 30, height: 1 });
    b.updateRect({ x: 0, y: 0, width: 30, height: 1 });
    b.render(screenB);
    expect(screenA.back[0][0].char).not.toBe(screenB.back[0][0].char);
  });

  it('setStatus updates status and marks dirty', () => {
    const si = new StatusIndicator('API Server', true);
    const markDirtySpy = vi.spyOn(si, 'markDirty');
    
    si.setStatus(false);
    expect(si.getStatus()).toBe(false);
    expect(markDirtySpy).toHaveBeenCalled();
  });

  it('setLabel updates label and marks dirty', () => {
    const si = new StatusIndicator('API Server', true);
    const markDirtySpy = vi.spyOn(si, 'markDirty');
    
    si.setLabel('Database Server');
    expect(markDirtySpy).toHaveBeenCalled();
  });
});