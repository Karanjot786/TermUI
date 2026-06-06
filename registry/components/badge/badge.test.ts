import { describe, it, expect } from 'vitest';
import { Badge } from './index';

describe('registry badge', () => {
  it('exports Badge component', () => {
    expect(typeof Badge).toBe('function');
  });
});
