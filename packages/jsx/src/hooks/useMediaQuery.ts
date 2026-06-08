import { useState, useEffect } from '../hooks.js';
import { getCurrentApp } from '../runtime.js';

function evaluateQuery(
    query: string,
    cols: number,
    rows: number,
): boolean {
    const normalized = query
        .trim()
        .replace(/^\(/, '')
        .replace(/\)$/, '');
    const [feature, valueString] = normalized.split(':');

    if (!feature || !valueString) {
        return false;
    }

    const value = Number(valueString.trim());

    switch (feature.trim()) {
        case 'min-width':
            return cols >= value;

        case 'max-width':
            return cols <= value;

        case 'min-height':
            return rows >= value;

        case 'max-height':
            return rows <= value;

        default:
            return false;
    }
}

export function useMediaQuery(query: string): boolean {
    const app = getCurrentApp();

    const getMatch = (): boolean => {
        if (!app) {
            return false;
        }

        return evaluateQuery(
            query,
            app.terminal.cols,
            app.terminal.rows,
        );
    };

    const [matches, setMatches] = useState(getMatch());

    useEffect(() => {
        if (!app) {
            return;
        }

        setMatches(
            evaluateQuery(
                query,
                app.terminal.cols,
                app.terminal.rows,
            ),
        );

        const unsubscribe = app.terminal.onResize((cols, rows) => {
            setMatches(evaluateQuery(query, cols, rows));
        });

        return unsubscribe;
    }, [query]);

    return matches;
}