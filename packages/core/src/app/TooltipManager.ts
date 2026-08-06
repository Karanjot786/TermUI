import { EventEmitter } from '../events/EventEmitter.js';

export interface TooltipState {
    text: string;
    x: number;
    y: number;
}

export type TooltipManagerEventMap = {
    change: TooltipState | null;
};

export class TooltipManager {
    readonly events = new EventEmitter<TooltipManagerEventMap>();
    private _state: TooltipState | null = null;

    get state(): TooltipState | null {
        return this._state;
    }

    open(text: string, x: number, y: number): void {
        this._state = { text, x, y };
        this.events.emit('change', this._state);
    }

    close(): void {
        if (this._state !== null) {
            this._state = null;
            this.events.emit('change', null);
        }
    }
}
