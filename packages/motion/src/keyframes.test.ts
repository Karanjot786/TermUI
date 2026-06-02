import { describe, it, expect } from 'vitest';
import { keyframes } from './keyframes.js';


describe('keyframes interpolation engine', () => {
  it('should interpolate linearly between steps', () => {
    const animation = keyframes([
      { value: 0, duration: 100 },
      { value: 10, duration: 100 },
      { value: 20, duration: 100 }
    ]);

    expect(animation(0)).toBe(0);
    expect(animation(50)).toBe(5);
    expect(animation(100)).toBe(10);
    expect(animation(150)).toBe(15);
  });
});
