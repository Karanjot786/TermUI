import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { Box } from '@termuijs/widgets';
import { SetupFlow } from './SetupFlow.js';

function makeStep(title: string) {
  return { title, render: () => new Box() };
}

function render(widget: SetupFlow, w = 50, h = 20): string {
  const screen = new Screen(w, h);
  widget.updateRect({ x: 0, y: 0, width: w, height: h });
  widget.render(screen);
  return screen.back.map(row => row.map(c => c.char).join('').trimEnd()).join('\n');
}

describe('SetupFlow', () => {
  it('renders without throwing', () => {
    const flow = new SetupFlow({
      appName: 'MyApp',
      steps: [makeStep('Step 1'), makeStep('Step 2')],
      onComplete: () => {},
    });
    expect(() => render(flow)).not.toThrow();
  });

  it('starts at step 0', () => {
    const flow = new SetupFlow({
      appName: 'MyApp',
      steps: [makeStep('Step 1'), makeStep('Step 2')],
      onComplete: () => {},
    });
    expect(flow.currentStepIndex).toBe(0);
  });

  it('next() advances to step 1', () => {
    const flow = new SetupFlow({
      appName: 'MyApp',
      steps: [makeStep('Step 1'), makeStep('Step 2')],
      onComplete: () => {},
    });
    flow.next();
    expect(flow.currentStepIndex).toBe(1);
  });

  it('prev() goes back', () => {
    const flow = new SetupFlow({
      appName: 'MyApp',
      steps: [makeStep('Step 1'), makeStep('Step 2')],
      onComplete: () => {},
    });
    flow.next();
    flow.prev();
    expect(flow.currentStepIndex).toBe(0);
  });

  it('prev() does not go below 0', () => {
    const flow = new SetupFlow({
      appName: 'MyApp',
      steps: [makeStep('Step 1')],
      onComplete: () => {},
    });
    flow.prev();
    expect(flow.currentStepIndex).toBe(0);
  });

  it('calls onComplete when last step advances', () => {
    const onComplete = vi.fn();
    const flow = new SetupFlow({
      appName: 'MyApp',
      steps: [makeStep('Step 1')],
      onComplete,
    });
    flow.next();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('isComplete is true after final next()', () => {
    const flow = new SetupFlow({
      appName: 'MyApp',
      steps: [makeStep('Only Step')],
      onComplete: () => {},
    });
    expect(flow.isComplete).toBe(false);
    flow.next();
    expect(flow.isComplete).toBe(true);
  });

  it('handleKey Enter advances step', () => {
    const flow = new SetupFlow({
      appName: 'MyApp',
      steps: [makeStep('Step 1'), makeStep('Step 2')],
      onComplete: () => {},
    });
    flow.handleKey({ key: 'return', input: '\r', ctrl: false, meta: false, shift: false });
    expect(flow.currentStepIndex).toBe(1);
  });

  it('handleKey Escape calls onCancel', () => {
    const onCancel = vi.fn();
    const flow = new SetupFlow({
      appName: 'MyApp',
      steps: [makeStep('Step 1')],
      onComplete: () => {},
      onCancel,
    });
    flow.handleKey({ key: 'escape', input: '\x1b', ctrl: false, meta: false, shift: false });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders app name in header', () => {
    const flow = new SetupFlow({
      appName: 'SuperApp',
      steps: [makeStep('Step 1')],
      onComplete: () => {},
    });
    const out = render(flow);
    expect(out).toContain('SuperApp');
  });
});
