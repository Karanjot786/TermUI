import { useState } from '../hooks.js';

export function useTransition(): [
    isPending: boolean,
    startTransition: (callback: () => void) => void,
] {
    const [isPending, setIsPending] = useState(false);

    const startTransition = (callback: () => void): void => {
        setIsPending(true);

        Promise.resolve().then(() => {
            try {
                callback();
            } finally {
                setIsPending(false);
            }
        });
    };

    return [isPending, startTransition];
}