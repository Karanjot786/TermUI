import { describe, it, expect, vi } from "vitest";
import { createStore } from "./index";

describe("createStore -- custom middleware chain", () => {
  it("should apply middleware in registration order", () => {
    const order: string[] = [];
    const store = createStore({ count: 0 });

    store.use((next) => (action) => { order.push("a"); return next(action); });
    store.use((next) => (action) => { order.push("b"); return next(action); });
    store.use((next) => (action) => { order.push("c"); return next(action); });

    store.setState({ count: 1 });
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("should allow middleware to short-circuit actions", () => {
    const store = createStore({ count: 0 });
    store.use(() => () => undefined);
    store.setState({ count: 999 });
    expect(store.getState().count).toBe(0);
  });

  it("should chain without mutating the original state", () => {
    const store = createStore({ items: [] as string[] });
    const original = store.getState();
    store.use((next) => (action: { type: string; payload?: string }) => {
      if (action.type === "ADD") store.setState({ items: [...store.getState().items, action.payload ?? ""] });
      return next(action);
    });
    store.setState({ type: "ADD", payload: "test" });
    expect(store.getState().items).toEqual(["test"]);
    expect(store.getState()).not.toBe(original);
  });
});
