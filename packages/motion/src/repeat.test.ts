import { describe, it, expect, vi } from 'vitest';
import { repeat, type AnimationRunner } from './sequence.js';

describe('repeat()', () => {
  it('runs the runner count times', () => {
    let calls = 0;
    const runner: AnimationRunner = (done) => {
      calls++;
      done();
      return () => {};
    };

    const doneSpy = vi.fn();
    const repeated = repeat(runner, { count: 3 });
    repeated(doneSpy);

    expect(calls).toBe(3);
    expect(doneSpy).toHaveBeenCalledTimes(1);
  });

  it('default count runs once', () => {
    let calls = 0;
    const runner: AnimationRunner = (done) => {
      calls++;
      done();
      return () => {};
    };

    const doneSpy = vi.fn();
    const repeated = repeat(runner);
    repeated(doneSpy);

    expect(calls).toBe(1);
    expect(doneSpy).toHaveBeenCalledTimes(1);
  });

  it('cancel stops further passes', () => {
    let calls = 0;
    let triggerDone: (() => void) | null = null;
    const cancelSpy = vi.fn();

    const runner: AnimationRunner = (done) => {
      calls++;
      triggerDone = done;
      return cancelSpy;
    };

    const doneSpy = vi.fn();
    const repeated = repeat(runner, { count: 3 });
    const cancel = repeated(doneSpy);

    expect(calls).toBe(1);
    expect(cancelSpy).not.toHaveBeenCalled();

    cancel();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(doneSpy).not.toHaveBeenCalled();

    if (triggerDone) {
      (triggerDone as () => void)();
    }
    expect(calls).toBe(1);
  });

  it('infinite loop does not call done', () => {
    let calls = 0;
    let cancel: (() => void) | null = null;

    const runner: AnimationRunner = (done) => {
      calls++;
      if (calls === 5) {
        if (cancel) cancel();
      } else {
        done();
      }
      return () => {};
    };

    const doneSpy = vi.fn();
    const repeated = repeat(runner, { count: Infinity });
    cancel = repeated(doneSpy);

    expect(calls).toBe(5);
    expect(doneSpy).not.toHaveBeenCalled();
  });

  it('yoyo alternates direction each pass', () => {
    const directions: string[] = [];

    const forwardRunner = vi.fn((done) => {
      directions.push('forward');
      done();
      return () => {};
    });

    const reverseRunner = vi.fn((done) => {
      directions.push('reverse');
      done();
      return () => {};
    });

    const runner = Object.assign(forwardRunner, {
      reverse: reverseRunner,
    }) as AnimationRunner;

    const doneSpy = vi.fn();
    const repeated = repeat(runner, { count: 4, yoyo: true });
    repeated(doneSpy);

    expect(directions).toEqual(['forward', 'reverse', 'forward', 'reverse']);
    expect(doneSpy).toHaveBeenCalledTimes(1);
  });

  it('yoyo falls back to original runner when reverse is missing', () => {
    const directions: string[] = [];
    const forwardRunner = vi.fn((done) => {
      directions.push('forward');
      done();
      return () => {};
    }) as AnimationRunner;

    const doneSpy = vi.fn();
    const repeated = repeat(forwardRunner, { count: 4, yoyo: true });
    repeated(doneSpy);

    expect(directions).toEqual(['forward', 'forward', 'forward', 'forward']);
    expect(doneSpy).toHaveBeenCalledTimes(1);
  });
});
