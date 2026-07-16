export type NavigationItemPredicate<T> = (item: T, index: number) => boolean;

export function firstEnabledIndex<T>(items: readonly T[], isDisabled: NavigationItemPredicate<T>): number {
    for (let i = 0; i < items.length; i++) {
        if (!isDisabled(items[i], i)) {
            return i;
        }
    }
    return -1;
}

export function lastEnabledIndex<T>(items: readonly T[], isDisabled: NavigationItemPredicate<T>): number {
    for (let i = items.length - 1; i >= 0; i--) {
        if (!isDisabled(items[i], i)) {
            return i;
        }
    }
    return -1;
}

export function nextEnabledIndex<T>(
    items: readonly T[],
    currentIndex: number,
    isDisabled: NavigationItemPredicate<T>,
    wrapAround = false,
): number {
    if (items.length === 0) return currentIndex;

    const firstEnabled = firstEnabledIndex(items, isDisabled);
    if (firstEnabled < 0) return currentIndex;
    if (currentIndex < 0) return firstEnabled;
    if (currentIndex >= items.length) return currentIndex;

    const start = currentIndex;
    let next = start + 1;
    let visited = 0;

    while (visited < items.length) {
        if (next >= items.length) {
            if (!wrapAround) return start;
            next = 0;
        }

        if (next === start && visited > 0) {
            return start;
        }

        if (!isDisabled(items[next], next)) {
            return next;
        }

        next++;
        visited++;
    }

    return currentIndex;
}

export function previousEnabledIndex<T>(
    items: readonly T[],
    currentIndex: number,
    isDisabled: NavigationItemPredicate<T>,
    wrapAround = false,
): number {
    if (items.length === 0) return currentIndex;

    const lastEnabled = lastEnabledIndex(items, isDisabled);
    if (lastEnabled < 0) return currentIndex;
    if (currentIndex < 0) return lastEnabled;
    if (currentIndex >= items.length) return currentIndex;

    const start = currentIndex;
    let prev = start - 1;
    let visited = 0;

    while (visited < items.length) {
        if (prev < 0) {
            if (!wrapAround) return start;
            prev = items.length - 1;
        }

        if (prev === start && visited > 0) {
            return start;
        }

        if (!isDisabled(items[prev], prev)) {
            return prev;
        }

        prev--;
        visited++;
    }

    return currentIndex;
}
