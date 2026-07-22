/**
 * Options for configuring a {@link CommandHistory} instance.
 */
export interface CommandHistoryOptions {
    /** Maximum number of commands retained. Defaults to 100. */
    maxSize?: number;
}

/**
 * A simple in-memory command history with shell-style navigation.
 *
 * Tracks entered commands and supports walking backwards/forwards with
 * `previous()`/`next()`, fuzzy `search()`, and serialisation via
 * `export()`/`import()`.
 */
export class CommandHistory {
    private commands: string[] = [];
    private index = -1;
    private maxSize: number;

    constructor(options: CommandHistoryOptions = {}) {
        this.maxSize = options.maxSize ?? 100;
    }

    /**
     * Append a command to the history.
     * Blank/whitespace-only commands are ignored. Trims to `maxSize`.
     */
    add(command: string): void {
        if (!command.trim()) return;

        this.commands.push(command);

        if (this.commands.length > this.maxSize) {
            this.commands.shift();
        }

        this.index = this.commands.length;
    }

    /**
     * Move the cursor back one entry and return it, or `null` at the start.
     */
    previous(): string | null {
        if (this.commands.length === 0) {
            return null;
        }

        this.index = Math.max(0, this.index - 1);
        return this.commands[this.index];
    }

    /**
     * Move the cursor forward one entry and return it, or `null` past the end.
     */
    next(): string | null {
        if (this.commands.length === 0) {
            return null;
        }

        this.index = Math.min(
            this.commands.length,
            this.index + 1
        );

        if (this.index === this.commands.length) {
            return null;
        }

        return this.commands[this.index];
    }

    /**
     * Return every command containing `query` (case-insensitive substring match).
     */
    search(query: string): string[] {
        const value = query.toLowerCase();

        return this.commands.filter(command =>
            command.toLowerCase().includes(value)
        );
    }

    /** Return a shallow copy of all stored commands. */
    getAll(): string[] {
        return [...this.commands];
    }

    /** Remove all commands and reset the navigation cursor. */
    clear(): void {
        this.commands = [];
        this.index = -1;
    }

    /** Serialise the history to a JSON string for persistence. */
    export(): string {
        return JSON.stringify(this.commands);
    }

    /** Restore history from a JSON string produced by {@link export}. */
    import(data: string): void {
        const parsed: string[] = JSON.parse(data);
        this.commands = parsed.slice(-this.maxSize);
        this.index = this.commands.length;
    }
}