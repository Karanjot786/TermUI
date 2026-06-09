import { describe, it, expect } from 'vitest';
import { Progress } from './index';

describe('registry progress', () => {
  it('exports Progress component', () => {
    expect(typeof Progress).toBe('function');
  });
});
