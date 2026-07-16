/**
 * Base error class for all TermUI-specific errors.
 * Extend this class when creating new error types for the framework.
 */
export class TermUIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TermUIError';
    }
}

/**
 * Thrown when the user aborts an interactive prompt by pressing Escape.
 * Catch this to implement graceful cancellation in prompt-based workflows.
 */
export class TermUIAbortError extends TermUIError {
    constructor(message = 'Prompt aborted') {
        super(message);
        this.name = 'TermUIAbortError';
    }
}

/**
 * Thrown when an operation is cancelled programmatically (e.g. via a guard or timeout).
 * Distinguishable from TermUIAbortError which is user-initiated.
 */
export class TermUICancelError extends TermUIError {
    constructor(message = 'Prompt cancelled') {
        super(message);
        this.name = 'TermUICancelError';
    }
}

/**
 * Thrown when a form field fails validation.
 * Contains the name of the invalid field to help consumers display targeted error messages.
 */
export class TermUIValidationError extends TermUIError {
    /** The name of the form field that failed validation. */
    field: string;

    constructor(field: string, message: string) {
        super(message);
        this.name = 'TermUIValidationError';
        this.field = field;
    }
}

