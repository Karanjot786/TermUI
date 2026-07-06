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

export function devtools<T>(options: DevToolsOptions = {}): Middleware<T> & { api: any } {
    const { name = 'store', maxHistory = 50 } = options;
    
    let isTimeTraveling = false;
    let history: DevToolsState<T> = { past: [], present: null as any, future: [] };

    const api = {
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
    };

    const mw = ((prevState: T, update: Partial<T>, next: (update: Partial<T>, actionName?: string) => T, actionName?: string) => {
        if (isTimeTraveling) {
            next(update, actionName);
            return;
        }

        if (history.present === null) {
            history.present = prevState;
        }

        const nextState = next(update, actionName);
        
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
        
        // Update the API reference to the mutated history
        api.history = history;

    }) as Middleware<T> & { api: typeof api };
    
    mw.api = api;

    return mw;
}
