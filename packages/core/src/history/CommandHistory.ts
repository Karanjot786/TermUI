export interface CommandHistoryOptions {
    maxSize?: number;
}

export class CommandHistory {
    private commands: string[] = [];
    private index = -1;
    private maxSize: number;

    constructor(options: CommandHistoryOptions = {}) {
        this.maxSize = options.maxSize ?? 100;
    }

    add(command: string): void {
        if (!command.trim()) return;

        this.commands.push(command);

        if (this.commands.length > this.maxSize) {
            this.commands.shift();
        }

        this.index = this.commands.length;
    }

    previous(): string | null {
        if (this.commands.length === 0) {
            return null;
        }

        this.index = Math.max(0, this.index - 1);
        return this.commands[this.index];
    }

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

    search(query: string): string[] {
        const value = query.toLowerCase();

        return this.commands.filter(command =>
            command.toLowerCase().includes(value)
        );
    }

    getAll(): string[] {
        return [...this.commands];
    }

    clear(): void {
        this.commands = [];
        this.index = -1;
    }

    export(): string {
        return JSON.stringify(this.commands);
    }

    import(data: string): void {
        const parsed: string[] = JSON.parse(data);
        this.commands = parsed.slice(-this.maxSize);
        this.index = this.commands.length;
    }
}