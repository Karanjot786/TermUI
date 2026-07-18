// ─────────────────────────────────────────────────────
// @termuijs/ui — Imperative Prompts
// ─────────────────────────────────────────────────────

import * as readline from 'readline';
import { App, TermUIAbortError } from '@termuijs/core';
import { TextInput, Widget } from '@termuijs/widgets';
import { Select, type SelectOption, type SelectOptions } from './Select.js';
import { NumberInput, type NumberInputOptions } from './NumberInput.js';
import { Form, type FormField, type FormOptions } from './Form.js';

export class NonInteractiveError extends Error {
    constructor() {
        super('Prompts require an interactive TTY. stdin is not a TTY.');
        this.name = 'NonInteractiveError';
    }
}

export interface TextPromptOptions {
    message: string;
    placeholder?: string;
    validate?: (value: string) => string | null;
    default?: string;
}

export interface ConfirmPromptOptions {
    message: string;
    default?: boolean;
}

export interface SelectPromptOptions<T = string> {
    message: string;
    options: Array<{ label: string; value: T }>;
    default?: T;
}

async function promptText(options: TextPromptOptions): Promise<string> {
    if (!process.stdin.isTTY) throw new NonInteractiveError();

    const defaultHint = options.default ? ` (${options.default})` : '';
    const placeholder = options.placeholder ? ` [${options.placeholder}]` : '';

    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const ask = () => {
            rl.question(`${options.message}${defaultHint}${placeholder}: `, (answer) => {
                const value = answer.trim() || options.default || '';
                if (options.validate) {
                    const error = options.validate(value);
                    if (error) {
                        process.stdout.write(`  ${error}\n`);
                        ask();
                        return;
                    }
                }
                rl.close();
                resolve(value);
            });
        };

        ask();
    });
}

async function promptConfirm(options: ConfirmPromptOptions): Promise<boolean> {
    if (!process.stdin.isTTY) throw new NonInteractiveError();

    const hint = options.default === true ? 'Y/n' : options.default === false ? 'y/N' : 'y/n';

    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(`${options.message} [${hint}]: `, (answer) => {
            rl.close();
            const a = answer.trim().toLowerCase();
            if (a === 'y' || a === 'yes') { resolve(true); return; }
            if (a === 'n' || a === 'no') { resolve(false); return; }
            if (a === '' && options.default !== undefined) { resolve(options.default); return; }
            resolve(false);
        });
    });
}

async function promptSelect<T = string>(options: SelectPromptOptions<T>): Promise<T> {
    if (!process.stdin.isTTY) throw new NonInteractiveError();

    const { options: choices, default: defaultValue } = options;
    process.stdout.write(`${options.message}\n`);
    choices.forEach((opt, i) => {
        const isDefault = opt.value === defaultValue;
        process.stdout.write(`  ${i + 1}. ${opt.label}${isDefault ? ' (default)' : ''}\n`);
    });

    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const ask = () => {
            rl.question(`Enter number (1-${choices.length}): `, (answer) => {
                const trimmed = answer.trim();
                if (trimmed === '' && defaultValue !== undefined) {
                    rl.close();
                    resolve(defaultValue);
                    return;
                }
                const n = parseInt(trimmed, 10);
                if (!isNaN(n) && n >= 1 && n <= choices.length) {
                    rl.close();
                    resolve(choices[n - 1].value);
                    return;
                }
                process.stdout.write(`  Invalid choice. Enter a number 1-${choices.length}.\n`);
                ask();
            });
        };

        ask();
    });
}

export async function promptWidget<T = any /* Allow resolving any prompt value type */>(widget: Widget): Promise<T> {
    if (!process.stdin.isTTY) throw new NonInteractiveError();

    let inlineRows = 3;
    if (widget instanceof Form) {
        inlineRows = typeof widget.style?.height === 'number' ? widget.style.height : 5;
    } else if (widget instanceof Select) {
        inlineRows = 1 + (widget as any /* Bypass private options access */)._options.length;
    } else if (widget instanceof NumberInput) {
        inlineRows = typeof widget.style?.height === 'number' ? widget.style.height : 3;
    } else if (widget instanceof TextInput) {
        inlineRows = typeof widget.style?.height === 'number' ? widget.style.height : 3;
    }

    const app = new App(widget, {
        screenMode: 'inline',
        inlineRows,
        skipFallback: true,
    });

    const signal = (widget as any /* Bypass private signal access */).signal;

    return new Promise<T>((resolve, reject) => {
        let completed = false;

        const cleanup = () => {
            if (completed) return;
            completed = true;
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
            app.unmount();
        };

        const onAbort = () => {
            cleanup();
            reject(new TermUIAbortError());
        };

        if (signal) {
            if (signal.aborted) {
                cleanup();
                reject(new TermUIAbortError());
                return;
            }
            signal.addEventListener('abort', onAbort);
        }

        if (widget instanceof Select) {
            widget.onComplete((option) => {
                cleanup();
                resolve(option.value as unknown as T);
            });
        } else if (widget instanceof TextInput) {
            widget.onComplete((value) => {
                cleanup();
                resolve(value as unknown as T);
            });
        } else if (widget instanceof NumberInput) {
            widget.onComplete((value) => {
                cleanup();
                resolve(value as unknown as T);
            });
        } else if (widget instanceof Form) {
            widget.onComplete((values) => {
                cleanup();
                resolve(values as unknown as T);
            });
        } else if ('onComplete' in widget && typeof (widget as any).onComplete === 'function') {
            (widget as any).onComplete((value: any) => {
                cleanup();
                resolve(value as T);
            });
        }

        app.mount().catch((err) => {
            cleanup();
            reject(err);
        });
    });
}

export function select(config: { options: string[]; placeholder?: string; activeColor?: any /* Keep color type flexible */; signal?: AbortSignal }) {
    const formattedOptions = config.options.map(o => ({ label: o, value: o }));
    return new Select(formattedOptions, {
        placeholder: config.placeholder,
        activeColor: config.activeColor,
        signal: config.signal,
    });
}

export function textInput(options: { placeholder?: string; mask?: string; maxLength?: number; suggestions?: string[]; signal?: AbortSignal } = {}) {
    return new TextInput({}, options);
}

export function numberInput(options: NumberInputOptions & { signal?: AbortSignal } = {}) {
    return new NumberInput({}, options);
}

export function form(fields: FormField[], options: FormOptions & { signal?: AbortSignal } = {}) {
    return new Form(fields, options);
}

export interface Prompt {
    <T = any /* Default prompt value type */>(widget: Widget): Promise<T>;
    text: typeof promptText;
    confirm: typeof promptConfirm;
    select: typeof promptSelect;
}

export const prompt: Prompt = Object.assign(promptWidget, {
    text: promptText,
    confirm: promptConfirm,
    select: promptSelect,
});
