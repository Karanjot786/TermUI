// ─────────────────────────────────────────────────────
// @termuijs/store — Immutable helpers for deep updates
// ─────────────────────────────────────────────────────

/**
 * Immutably sets a value at a deeply nested path within an object/array.
 * If the path contains non-existent intermediate segments, they will be created
 * (arrays for numeric keys/indices, objects for string keys).
 *
 * @param obj The source object or array.
 * @param path An array of keys/indices representing the nested path.
 * @param value The value to set at the path.
 * @returns A new object or array with the updated value, using structural sharing.
 */
export function setIn<T>(obj: T, path: (string | number)[], value: any): T {
    if (path.length === 0) {
        return value;
    }

    const [key, ...rest] = path;

    let clone: any; // type-cast: necessary to handle recursive deep tree cloning with structural sharing
    if (Array.isArray(obj)) {
        clone = [...obj];
    } else if (obj !== null && typeof obj === 'object') {
        clone = { ...obj };
    } else {
        clone = typeof key === 'number' ? [] : {};
    }

    const nextVal = rest.length > 0
        ? setIn(clone[key], rest, value)
        : value;

    clone[key] = nextVal;
    return clone as T;
}

/**
 * Immutably updates a value at a deeply nested path using an updater function.
 * If the path contains non-existent intermediate segments, they will be created.
 *
 * @param obj The source object or array.
 * @param path An array of keys/indices representing the nested path.
 * @param updater A function that receives the current value and returns the new value.
 * @returns A new object or array with the updated value, using structural sharing.
 */
export function updateIn<T>(obj: T, path: (string | number)[], updater: (val: any) => any): T {
    if (path.length === 0) {
        return updater(obj);
    }

    const [key, ...rest] = path;

    let clone: any; // type-cast: necessary to handle recursive deep tree cloning with structural sharing
    if (Array.isArray(obj)) {
        clone = [...obj];
    } else if (obj !== null && typeof obj === 'object') {
        clone = { ...obj };
    } else {
        clone = typeof key === 'number' ? [] : {};
    }

    const nextVal = rest.length > 0
        ? updateIn(clone[key], rest, updater)
        : updater(clone[key]);

    clone[key] = nextVal;
    return clone as T;
}

/**
 * Immutably deletes a key/index at a deeply nested path within an object/array.
 * If the path does not exist, the original object/array is returned unchanged.
 *
 * @param obj The source object or array.
 * @param path An array of keys/indices representing the nested path.
 * @returns A new object or array with the key/index removed.
 */
export function deleteIn<T>(obj: T, path: (string | number)[]): T {
    if (path.length === 0) {
        return obj;
    }

    const [key, ...rest] = path;

    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (rest.length > 0) {
        const currentVal = (obj as any)[key]; // type-cast: any is used to access dynamic keys on arbitrary nested trees
        if (currentVal === undefined || currentVal === null) {
            return obj;
        }

        const nextVal = deleteIn(currentVal, rest);
        if (nextVal === currentVal) {
            return obj;
        }

        let clone: any; // type-cast: necessary to handle recursive deep tree cloning with structural sharing
        if (Array.isArray(obj)) {
            clone = [...obj];
        } else {
            clone = { ...obj };
        }
        clone[key] = nextVal;
        return clone as T;
    }

    // Leaf deletion
    if (Array.isArray(obj)) {
        const index = typeof key === 'number' ? key : parseInt(String(key), 10);
        if (Number.isNaN(index) || index < 0 || index >= obj.length) {
            return obj;
        }
        const clone = [...obj];
        clone.splice(index, 1);
        return clone as any as T; // type-cast: cast spliced array to generic type T
    } else {
        if (!(key in obj)) {
            return obj;
        }
        const clone = { ...obj } as any; // type-cast: any allows key deletion on intermediate cloned object
        delete clone[key];
        return clone as T;
    }
}
