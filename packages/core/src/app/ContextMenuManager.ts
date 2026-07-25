import { EventEmitter } from '../events/EventEmitter.js';

export interface ContextMenuItem {
    label: string;
    value: string;
    disabled?: boolean;
}

export interface ContextMenuState {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onSelect?: (item: ContextMenuItem, index: number) => void;
}

export interface ContextMenuManagerEventMap {
    open: ContextMenuState;
    close: void;
}

export class ContextMenuManager extends EventEmitter<ContextMenuManagerEventMap> {
    private _state: ContextMenuState | null = null;

    get isOpen(): boolean {
        return this._state !== null;
    }

    get state(): ContextMenuState | null {
        return this._state;
    }

    open(x: number, y: number, items: ContextMenuItem[], onSelect?: (item: ContextMenuItem, index: number) => void): void {
        this._state = { x, y, items, onSelect };
        this.emit('open', this._state);
    }

    close(): void {
        if (this.isOpen) {
            this._state = null;
            this.emit('close', undefined as void);
        }
    }
}
