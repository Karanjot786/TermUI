import { renderHook, act } from "@testing-library/react";
import { useElementSize } from "./useElementSize";

describe("useElementSize hook", () => {
  let originalResizeObserver: typeof ResizeObserver;

  beforeAll(() => {
    originalResizeObserver = global.ResizeObserver;
  });

  afterAll(() => {
    global.ResizeObserver = originalResizeObserver;
  });

  it("should return zeros when element is not attached", () => {
    const { result } = renderHook(() => useElementSize());
    const [, size] = result.current;
    
    expect(size.width).toBe(0);
    expect(size.height).toBe(0);
  });

  it("should update size metrics upon DOM attachment", () => {
    const mockElement = document.createElement("div");
    Object.defineProperty(mockElement, "offsetWidth", { value: 200, configurable: true });
    Object.defineProperty(mockElement, "offsetHeight", { value: 150, configurable: true });

    let observerCallback: ResizeObserverCallback = () => {};
    
    global.ResizeObserver = jest.fn().mockImplementation((cb) => {
      observerCallback = cb;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    const { result } = renderHook(() => useElementSize());
    const [ref] = result.current;

    act(() => {
      (ref as any).current = mockElement;
    });

    act(() => {
      observerCallback(
        [{ target: mockElement } as unknown as ResizeObserverEntry],
        {} as ResizeObserver
      );
    });

    const [, currentSize] = result.current;
    expect(currentSize.width).toBe(200);
    expect(currentSize.height).toBe(150);
  });
});
