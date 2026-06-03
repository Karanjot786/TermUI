import { type Router, type NavigateEvent } from './router.js';
import { type VNode } from '@termuijs/jsx';
import { EventEmitter } from '@termuijs/core';
import { transition } from '@termuijs/motion';

export interface RouteTransitionEvents {
    frame: { screen: VNode; alpha: number };
    complete: { screen: VNode };
}

export interface TransitionManagerOptions {
    duration?: number;
    easing?: string;
}

export class RouteTransitionManager {
    private _router: Router;
    private _duration: number;
    private _currentScreen: VNode | null = null;
    readonly events = new EventEmitter<RouteTransitionEvents>();

    constructor(router: Router, options: TransitionManagerOptions = {}) {
        this._router = router;
        this._duration = options.duration ?? 300;
        this._setupListeners();
    }

    private _setupListeners(): void {
        this._router.events.on('navigate', (e: NavigateEvent) => {
            this.triggerTransition(e.screen, 'enter');
        });

        this._router.events.on('back', (e: NavigateEvent | null) => {
            if (e) {
                this.triggerTransition(e.screen, 'leave');
            }
        });
    }

    /**
     * Drives enter/leave screen layouts utilizing @termuijs/motion transitions
     */
    triggerTransition(screen: VNode, direction: 'enter' | 'leave'): void {
        if (!screen) return;
        this._currentScreen = screen;

        transition({
            durationMs: this._duration,
            onFrame: (progress: number) => {
                if (this._currentScreen !== screen) return;

                this.events.emit('frame', {
                    screen,
                    alpha: progress
                });
            },
            onComplete: () => {
                if (this._currentScreen !== screen) return;
                this.events.emit('complete', { screen });
            }
        });
    }

    get activeScreen(): VNode | null {
        return this._currentScreen;
    }
}