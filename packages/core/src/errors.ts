export class TermUIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TermUIError';
    }
}

export class TermUIAbortError extends TermUIError {
    constructor(message = 'Prompt aborted') {
        super(message);
        this.name = 'TermUIAbortError';
    }
}

export class TermUICancelError extends TermUIError {
    constructor(message = 'Prompt cancelled') {
        super(message);
        this.name = 'TermUICancelError';
    }
}

export class TermUIValidationError extends TermUIError {
    field: string;

    constructor(field: string, message: string) {
        super(message);
        this.name = 'TermUIValidationError';
        this.field = field;
    }
}

