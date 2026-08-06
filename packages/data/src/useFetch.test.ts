import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { invalidate, clearCache, getCache, isFresh, setCache } from "./cache.js";
import { render } from "@termuijs/testing";
import { h, useState } from "@termuijs/jsx";
import { useFetch, useInfiniteQuery, UseFetchOptions, __resetSharedAbortControllersForTests } from "./hooks.js";

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

function renderFetch(url: string, options?: UseFetchOptions) {
  let currentResult: any; // useFetch's generic result shape varies per call site in this helper

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
    } as unknown) as typeof global.fetch; // partial Response mock doesn't implement the full interface
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    clearCache();
    __resetSharedAbortControllersForTests();
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

  it("aborts the in-flight request on unmount", async () => {
    let capturedSignal: AbortSignal | undefined;
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal;
      return new Promise(() => {
        // never resolves; unmount should abort it instead
      });
    }) as unknown as typeof global.fetch; // mock signature narrower than fetch's overloads

    const { unmount } = renderFetch("test-url-abort-unmount", { staleTime: 1000 });

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("aborts the in-flight request when the key changes", async () => {
    const signals: AbortSignal[] = [];
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      return new Promise(() => {
        // never resolves
      });
    }) as unknown as typeof global.fetch; // mock signature narrower than fetch's overloads

    let setKey: (key: string) => void = () => {};

    function TestComponent() {
      const [key, updateKey] = useState("initial");
      setKey = updateKey;
      const result = useFetch("test-url-abort-key", { key });
      return h("text", null, result.loading ? "loading" : "done");
    }

    render(h(TestComponent, {}));

    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    setKey("changed");
    await flushPromises();

    expect(signals[0].aborted).toBe(true);
    expect(signals).toHaveLength(2);
    expect(signals[1].aborted).toBe(false);
  });

  it("ignores AbortError and does not set it as a user-visible error", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted.");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as unknown as typeof global.fetch; // mock signature narrower than fetch's overloads

    let currentResult: any; // useFetch's generic result shape varies per call site in this test
    let setKey: (key: string) => void = () => {};

    function TestComponent() {
      const [key, updateKey] = useState("initial");
      setKey = updateKey;
      currentResult = useFetch("test-url-abort-error", { key });
      return h("text", null, currentResult.loading ? "loading" : "done");
    }

    render(h(TestComponent, {}));

    setKey("changed");
    await flushPromises();

    expect(currentResult.error).toBeNull();
  });

  it("does not cache a response after the request was aborted", async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted.");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as unknown as typeof global.fetch; // mock signature narrower than fetch's overloads

    const { unmount } = renderFetch("test-url-abort-cache", { staleTime: 1000 });
    unmount();
    await flushPromises();

    expect(isFresh("test-url-abort-cache")).toBe(false);
    expect(getCache("test-url-abort-cache")).toBeUndefined();
  });

  it("does not populate the cache when a response resolves after unmount", async () => {
    // Unlike the AbortError case above, this exercises the isMounted guard in
    // the success branch directly: the underlying promise is unaffected by
    // abort() (it ignores the signal) and still resolves successfully, but
    // after the consumer has already unmounted.
    let resolveFetch!: (value: unknown) => void;
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        resolveFetch = resolve;
      });
    }) as unknown as typeof global.fetch; // mock signature narrower than fetch's overloads

    const { unmount } = renderFetch("test-url-success-after-unmount", { staleTime: 1000 });
    unmount();

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ status: "late" }),
    });
    await flushPromises();

    expect(isFresh("test-url-success-after-unmount")).toBe(false);
    expect(getCache("test-url-success-after-unmount")).toBeUndefined();
  });

  it("does not schedule fetch after unmount when a retry was pending", async () => {
    vi.useFakeTimers();

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.reject(new Error("network error"));
    }) as unknown as typeof global.fetch; // mock signature narrower than fetch's overloads

    const { unmount } = renderFetch("test-url-retry-cleanup", {
      retry: 2,
      retryDelay: 300,
    });

    // Let the first attempt fail and the retry timer get scheduled.
    await vi.advanceTimersByTimeAsync(0);
    expect(callCount).toBe(1);

    unmount();

    // Advance well past the retry delay — cleanup must have cleared the timer.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(callCount).toBe(1);

    vi.useRealTimers();
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

  it("accepts circular cache keys", async () => {
    const key: Record<string, unknown> = { scope: "dashboard" };
    key.self = key;

    const { unmount } = renderFetch("test-url-circular-key", {
      key,
      staleTime: 1000,
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    await flushPromises();

    expect(isFresh('test-url-circular-key::{"scope":"dashboard","self":"[Circular]"}')).toBe(true);

    unmount();
  });
});

describe("useInfiniteQuery", () => {
  it("aborts a pending next-page request on unmount", async () => {
    const signals: AbortSignal[] = [];
    let currentResult: ReturnType<typeof useInfiniteQuery<number, number>>;

    const queryFn = vi.fn((page: number, signal?: AbortSignal) => {
      if (signal) signals.push(signal);

      if (page === 1) {
        return Promise.resolve(page);
      }

      return new Promise<number>(() => {
        // The cleanup path should abort this pending next-page request.
      });
    });

    function TestComponent() {
      currentResult = useInfiniteQuery({
        queryFn,
        initialPageParam: 1,
        getNextPageParam: page => page + 1,
      });

      return h("text", null, currentResult.loading ? "loading" : "done");
    }

    const screen = render(h(TestComponent, {}));

    await flushPromises();
    currentResult!.fetchNextPage();

    expect(signals).toHaveLength(2);
    expect(signals[1].aborted).toBe(false);

    screen.unmount();

    expect(signals[1].aborted).toBe(true);
  });
});
