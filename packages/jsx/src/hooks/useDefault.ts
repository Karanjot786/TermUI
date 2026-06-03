import { useState } from '../hooks.js';

export function useDefault<T>(
  defaultValue: T,
  initialValue: T,
): [T, (value: T | null | undefined) => void] {
  const [value, setValue] = useState<T | null | undefined>(initialValue);

  const displayed = value === null || value === undefined ? defaultValue : value;

  return [displayed, (next: T | null | undefined) => setValue(next)];
}
