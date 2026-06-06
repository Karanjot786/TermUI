import { useState } from '../hooks.js';

export interface UseBooleanActions {
  setTrue: () => void;
  setFalse: () => void;
  toggle: () => void;
  set: (value: boolean) => void;
}

export function useBoolean(initialValue = false): [boolean, UseBooleanActions] {
  const [value, setValue] = useState(initialValue);

  return [value, {
    setTrue: () => setValue(true),
    setFalse: () => setValue(false),
    toggle: () => setValue((prev) => !prev),
    set: (value: boolean) => setValue(value),
  }];
}
