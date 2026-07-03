import { describe, it, expect, vi, afterEach } from 'vitest';
import { triggerFeedback, AUDIBLE_FEEDBACK_TYPES } from './useFeedback.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('triggerFeedback', () => {
  it('writes bell to stdout for audible types', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    triggerFeedback('success');
    expect(spy).toHaveBeenCalledWith('\x07');
  });

  it('writes bell for error', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    triggerFeedback('error');
    expect(spy).toHaveBeenCalledWith('\x07');
  });

  it('does NOT write bell for silent types', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    triggerFeedback('click');
    expect(spy).not.toHaveBeenCalled();
  });

  it('does nothing when enabled=false', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    triggerFeedback('success', { enabled: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('AUDIBLE_FEEDBACK_TYPES includes success, error, warning, copy, submit, delete, complete', () => {
    expect(AUDIBLE_FEEDBACK_TYPES).toContain('success');
    expect(AUDIBLE_FEEDBACK_TYPES).toContain('error');
    expect(AUDIBLE_FEEDBACK_TYPES).toContain('warning');
    expect(AUDIBLE_FEEDBACK_TYPES).toContain('copy');
    expect(AUDIBLE_FEEDBACK_TYPES).toContain('submit');
    expect(AUDIBLE_FEEDBACK_TYPES).toContain('delete');
    expect(AUDIBLE_FEEDBACK_TYPES).toContain('complete');
  });

  it('does not include click, select, cancel, info in audible list', () => {
    expect(AUDIBLE_FEEDBACK_TYPES).not.toContain('click');
    expect(AUDIBLE_FEEDBACK_TYPES).not.toContain('select');
    expect(AUDIBLE_FEEDBACK_TYPES).not.toContain('cancel');
    expect(AUDIBLE_FEEDBACK_TYPES).not.toContain('info');
  });
});
