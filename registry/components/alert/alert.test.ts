import { describe, it, expect } from 'vitest';
import { Alert } from './index';

describe('registry alert', () => {
  it('exports Alert component', () => {
    expect(typeof Alert).toBe('function');
  });
});
