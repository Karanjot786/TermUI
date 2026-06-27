// Shallow equality helper

export type EqualityFn<U> = (a: U, b: U) => boolean

export function shallow<U>(a: U, b: U): boolean {
  if (Object.is(a, b)) return true

  if (typeof a !== 'object' || a === null) return false
  if (typeof b !== 'object' || b === null) return false

  const aRec = a as Record<string, unknown>
  const bRec = b as Record<string, unknown>
  const aKeys = Object.keys(aRec)
  const bKeys = Object.keys(bRec)
  if (aKeys.length !== bKeys.length) return false

  const bKeysSet = new Set(bKeys)
  for (const key of aKeys) {
    if (!bKeysSet.has(key)) return false
    if (!Object.is(aRec[key], bRec[key])) return false
  }

  return true
}

export function deepEqual<U>(a: U, b: U): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null) return false
  if (typeof b !== 'object' || b === null) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  const aKeys = Object.keys(a as object)
  const bKeys = Object.keys(b as object)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!bKeys.includes(key) || !deepEqual((a as any)[key], (b as any)[key])) return false
  }
  return true
}
