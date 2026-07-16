import { useBoolean } from './useBoolean.js';

export function useToggle(initialValue = false) {
  const [value, { toggle, setTrue, setFalse }] = useBoolean(initialValue);

  return [value, {
    toggle,
    on: setTrue,
    off: setFalse,
  }];
}
