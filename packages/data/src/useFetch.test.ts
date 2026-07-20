import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { invalidate, clearCache, getCache, isFresh, setCache } from "./cache.js";
import { render } from "@termuijs/testing";
import { h } from "@termuijs/jsx";
import { useFetch, UseFetchOptions } from "./hooks.js";

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

function renderFetch(url: string, options?: UseFetchOptions) {
  let currentResult: any;

  function TestComponent(props: { url: string; options?: UseFetchOptions }) {
    currentResult = useFetch(props.url, props.options);
    return h("text", null, currentResult.loading ? "loading" : "done");
  }

  const screen = render(h(TestComponent, { url, options }));

  return {
    get result() {
      return currentResult;
    },
    rerender: (newUrl: string, newOptions?: UseFetchOptions) => {
      screen.rerender(h(TestComponent, { url: newUrl, options: newOptions }));
    },
    unmount: () => screen.unmount(),
  };
}

describe("useFetch caching", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    clearCache();

    originalFetch = global.fetch;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    } as unknown) as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    clearCache();
  });

  it("first fetch populates cache", async () => {
    const { unmount } = renderFetch("test-url-1", { staleTime: 1000 });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    await flushPromises();

    expect(isFresh("test-url-1")).toBe(true);
    expect(getCache("test-url-1")?.data).toEqual({
      status: "ok",
    });

    unmount();
  });

  it("second fetch for same URL uses cache", async () => {
    const { unmount: u1 } = renderFetch("test-url-2", { staleTime: 1000 });
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const { unmount: u2 } = renderFetch("test-url-2", { staleTime: 1000 });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    u1();
    u2();
  });

  it("fresh cache prevents refetch", () => {
    setCache("test-url-3", { status: "cached" }, 5000);

    const { result, unmount } = renderFetch("test-url-3", { staleTime: 5000 });

    expect(result.data).toEqual({
      status: "cached",
    });
    expect(result.loading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();

    unmount();
  });

  it("stale cache triggers refetch", () => {
    setCache("test-url-4", { status: "stale" }, -1000);

    const { unmount } = renderFetch("test-url-4", { staleTime: -1000 });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("invalidate removes cache entry", async () => {
    const { unmount } = renderFetch("test-url-5", { staleTime: 1000 });

    await flushPromises();

    expect(isFresh("test-url-5")).toBe(true);

    invalidate("test-url-5");

    expect(isFresh("test-url-5")).toBe(false);
    expect(getCache("test-url-5")).toBeUndefined();

    unmount();
  });

  it("fetch after invalidate performs new request", async () => {
    const { unmount: u1 } = renderFetch("test-url-6", { staleTime: 1000 });
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    invalidate("test-url-6");

    const { unmount: u2 } = renderFetch("test-url-6", { staleTime: 1000 });

    expect(global.fetch).toHaveBeenCalledTimes(2);

    u1();
    u2();
  });

  it("cache is shared across multiple consumers", async () => {
    const { unmount: u1 } = renderFetch("test-url-7", { staleTime: 1000 });
    await flushPromises();

    const { unmount: u2 } = renderFetch("test-url-7", { staleTime: 1000 });
    const { unmount: u3 } = renderFetch("test-url-7", { staleTime: 1000 });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    u1();
    u2();
    u3();
  });

  it("concurrent requests share a single fetch", () => {
    const { unmount: u1 } = renderFetch("test-url-8", { staleTime: 1000 });
    const { unmount: u2 } = renderFetch("test-url-8", { staleTime: 1000 });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    u1();
    u2();
  });

  it("refetches when the key changes", async () => {
    const { rerender, unmount } = renderFetch("test-url-key", { key: "initial" });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await flushPromises();

    // Rerender the component using the new key
    rerender("test-url-key", { key: "changed" });
    
    // Dependency array should trigger a new fetch
    expect(global.fetch).toHaveBeenCalledTimes(2);

    unmount();
  });

  it("refetches when the key changes while URL cache is fresh", async () => {
    const { rerender, unmount } = renderFetch("test-url-key-fresh", {
      key: "initial",
      staleTime: 5000,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await flushPromises();
    expect(isFresh('test-url-key-fresh::"initial"')).toBe(true);

    rerender("test-url-key-fresh", {
      key: "changed",
      staleTime: 5000,
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);

    unmount();
  });
});
