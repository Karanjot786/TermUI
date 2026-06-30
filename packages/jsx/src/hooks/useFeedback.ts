// useFeedback — map UI events to terminal audio cues (bell)

export type FeedbackType =
  | 'click' | 'success' | 'error' | 'warning' | 'copy'
  | 'toggleOn' | 'toggleOff' | 'select' | 'submit' | 'cancel'
  | 'delete' | 'complete' | 'info';

export interface FeedbackOptions {
  /** Set false to silence all feedback (e.g. user preference). Default: true */
  enabled?: boolean;
}

/** Types that produce an audible bell. All others are silent. */
export const AUDIBLE_FEEDBACK_TYPES: ReadonlySet<FeedbackType> = new Set([
  'success', 'error', 'warning', 'copy', 'submit', 'delete', 'complete',
]);

/** Fire feedback for a given interaction type. */
export function triggerFeedback(type: FeedbackType, options?: FeedbackOptions): void {
  if (options?.enabled === false) return;
  if (AUDIBLE_FEEDBACK_TYPES.has(type)) {
    process.stdout.write('\x07'); // BEL character
  }
  // Silent types (click, select, cancel, etc.) produce no output —
  // callers can extend this for visual-only effects.
}

export function useFeedback(options?: FeedbackOptions): (type: FeedbackType) => void {
  return (type: FeedbackType) => triggerFeedback(type, options);
}
