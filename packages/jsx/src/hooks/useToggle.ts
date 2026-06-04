import { useState } from '../hooks.js';

export interface UseToggleResult {
  toggle: () => void;
  on: () => void;
  off: () => void;
}

export function useToggle(initialValue = false): [boolean, UseToggleResult] {
  const [value, setValue] = useState(initialValue);

  return [value, {
    toggle: () => setValue((prev) => !prev),
    on: () => setValue(true),
    off: () => setValue(false),
  }];
}
