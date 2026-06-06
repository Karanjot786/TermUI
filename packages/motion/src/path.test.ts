import { describe, it, expect, vi, afterEach } from 'vitest';
import { pathAnimation } from './path.ts';
// Add the .ts extension here
import * as sequenceModule from './sequence.ts';

describe('pathAnimation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('happy-path: creates a sequence of waypoints', () => {
    const sequenceSpy = vi.spyOn(sequenceModule, 'sequence');
    sequenceSpy.mockImplementation((steps: any) => steps);

    const waypoints = [0, 50, 100];
    const config = { duration: 300 };
    
    pathAnimation(waypoints, config);
    
    expect(sequenceSpy).toHaveBeenCalledWith([
      { target: 0, duration: 300 },
      { target: 50, duration: 300 },
      { target: 100, duration: 300 }
    ]);
  });

  it('edge case: does not throw on empty input', () => {
    expect(() => pathAnimation([])).not.toThrow();
    expect(pathAnimation([])).toBeNull();
  });

  it('edge case: handles undefined or missing config gracefully', () => {
    const sequenceSpy = vi.spyOn(sequenceModule, 'sequence');
    sequenceSpy.mockImplementation((steps: any) => steps);

    pathAnimation([10]);

    expect(sequenceSpy).toHaveBeenCalledWith([
      { target: 10 }
    ]);
  });
});