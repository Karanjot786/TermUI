// packages/widgets/src/data/ListState.ts
import { ListItem } from '../input/List.js';

/**
 * External state object for List widget.
 * It owns the items, selected index and scroll offset.
 * The hook returns the same mutable object that can be passed to <List state={s} />.
 */
export interface ListState {
  /** The items displayed by the list */
  items: ListItem[];
  /** Index of the currently selected item */
  selectedIndex: number;
  /** Scroll offset (first visible item index) */
  scrollOffset: number;
  /** Update items */
  setItems(items: ListItem[]): void;
  /** Move selection up */
  selectPrev(): void;
  /** Move selection down */
  selectNext(): void;
  /** Confirm current selection (optional hook) */
  confirm(): void;
}

/** Hook that creates a fresh ListState. */
export function useListState(initial: { items: ListItem[] }): ListState {
  const state: ListState = {
    items: initial.items,
    selectedIndex: 0,
    scrollOffset: 0,
    setItems(items: ListItem[]) {
      state.items = items;
      if (state.selectedIndex >= items.length) {
        state.selectedIndex = Math.max(0, items.length - 1);
      }
    },
    selectPrev() {
      let next = state.selectedIndex - 1;
      while (next >= 0 && state.items[next]?.disabled) next--;
      if (next >= 0) {
        state.selectedIndex = next;
        if (next < state.scrollOffset) {
          state.scrollOffset = next;
        }
      }
    },
    selectNext() {
      let next = state.selectedIndex + 1;
      while (next < state.items.length && state.items[next]?.disabled) next++;
      if (next < state.items.length) {
        state.selectedIndex = next;
        // Note: scroll logic will be handled by List.render when needed
      }
    },
    confirm() {
      // No‑op placeholder – UI can call this when Enter is pressed.
    },
  };
  return state;
}
