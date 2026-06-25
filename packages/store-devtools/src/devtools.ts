import type { Middleware } from '@termuijs/store';

export interface DevToolsAction<T> {
    type: string;
    payload: Partial<T>;
    timestamp: number;
}

export interface DevToolsState<T> {
    past: { state: T; action: DevToolsAction<T> }[];
    present: T;
    future: { state: T; action: DevToolsAction<T> }[];
}

export interface DevToolsOptions {
    name?: string;
    maxHistory?: number;
}

export function devtools<T>(options: DevToolsOptions = {}): Middleware<T> {
    const { name = 'store', maxHistory = 50 } = options;
    
    // Initialize global store register
    if (typeof globalThis !== 'undefined') {
        (globalThis as any).__TERMUIJS_DEVTOOLS__ = (globalThis as any).__TERMUIJS_DEVTOOLS__ || new Map();
    }
    
    let isTimeTraveling = false;
    let history: DevToolsState<T> = { past: [], present: null as any, future: [] };

    return (prevState: T, update: Partial<T>, next: (update: Partial<T>, actionName?: string) => T, actionName?: string) => {
        if (isTimeTraveling) {
            next(update, actionName);
            return;
        }

        if (history.present === null) {
            history.present = prevState;
        }

        next(update, actionName);
        
        // At this point, the update is applied, but we need the store's reference to getState.
        // Wait, the middleware doesn't give us the computed nextState easily, but we know
        // `update` is merged into `prevState`.
        const nextState = { ...prevState, ...update };
        
        const action: DevToolsAction<T> = {
            type: actionName || 'anonymous',
            payload: update,
            timestamp: Date.now()
        };

        history.past.push({ state: history.present, action });
        if (history.past.length > maxHistory) {
            history.past.shift();
        }
        history.present = nextState;
        history.future = [];

        if (typeof globalThis !== 'undefined') {
            const devtoolsMap = (globalThis as any).__TERMUIJS_DEVTOOLS__ as Map<string, any>;
            devtoolsMap.set(name, {
                history,
                goTo: (index: number, setState: (state: T) => void) => {
                    const allStates = [...history.past, { state: history.present, action: null as any }, ...history.future];
                    if (index >= 0 && index < allStates.length) {
                        isTimeTraveling = true;
                        const target = allStates[index];
                        setState(target.state);
                        
                        history.past = allStates.slice(0, index) as any;
                        history.present = target.state;
                        history.future = allStates.slice(index + 1) as any;
                        
                        isTimeTraveling = false;
                    }
                }
            });
        }
    };
}
