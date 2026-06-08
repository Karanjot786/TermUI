import { useRef } from '../hooks';

export function useLatest<T>(value: T): { readonly current: T } {
    const ref = useRef(value);

    ref.current = value;

    return ref;
}
