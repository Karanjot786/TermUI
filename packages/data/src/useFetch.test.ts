import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { invalidate, clearCache, getCache, isFresh, setCache } from "./cache.js";

// Mock JSX before importing hooks
vi.mock("@termuijs/jsx", () => ({
  useState: (initial: any) => [
    typeof initial === "function" ? initial() : initial,
    vi.fn(),
  ],
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: (cb: () => void) => cb(),
  useInterval: vi.fn(),
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const { useFetch } = await import("./hooks.js");

describe("useFetch caching", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    clearCache();

    originalFetch = global.fetch;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    } as any);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    clearCache();
  });

  it("first fetch populates cache", async () => {
    useFetch("test-url-1", { staleTime: 1000 });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    await flushPromises();

    expect(isFresh("test-url-1")).toBe(true);
    expect(getCache("test-url-1")?.data).toEqual({
      status: "ok",
    });
  });

  it("second fetch for same URL uses cache", async () => {
    useFetch("test-url-2", { staleTime: 1000 });

    await flushPromises();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    useFetch("test-url-2", { staleTime: 1000 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("fresh cache prevents refetch", () => {
    setCache("test-url-3", { status: "cached" }, 5000);

    const result = useFetch("test-url-3", {
      staleTime: 5000,
    });

    expect(result.data).toEqual({
      status: "cached",
    });

    expect(result.loading).toBe(false);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("stale cache triggers refetch", () => {
    setCache("test-url-4", { status: "stale" }, -1000);

    useFetch("test-url-4", {
      staleTime: -1000,
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("invalidate removes cache entry", async () => {
    useFetch("test-url-5", { staleTime: 1000 });

    await flushPromises();

    expect(isFresh("test-url-5")).toBe(true);

    invalidate("test-url-5");

    expect(isFresh("test-url-5")).toBe(false);
    expect(getCache("test-url-5")).toBeUndefined();
  });

  it("fetch after invalidate performs new request", async () => {
    useFetch("test-url-6", { staleTime: 1000 });

    await flushPromises();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    invalidate("test-url-6");

    useFetch("test-url-6", { staleTime: 1000 });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("cache is shared across multiple consumers", async () => {
    useFetch("test-url-7", { staleTime: 1000 });

    await flushPromises();

    useFetch("test-url-7", { staleTime: 1000 });
    useFetch("test-url-7", { staleTime: 1000 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("concurrent requests share a single fetch", () => {
    useFetch("test-url-8", { staleTime: 1000 });
    useFetch("test-url-8", { staleTime: 1000 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});