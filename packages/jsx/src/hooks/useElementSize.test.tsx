import { describe, it, expect, vi, beforeEach } from "vitest";
// Use a runtime require and any-typing to avoid TypeScript errors when React
// type declarations are not available in the test environment.
const React: any = require("react");
import { useElementSize } from "./useElementSize";

// Mock React hooks
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useRef: vi.fn(),
    useEffect: vi.fn(),
  };
});

describe("useElementSize hook", () => {
  let mockElement: any;
  let observerCallback: any;
  let disconnectMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    disconnectMock = vi.fn();
    
    // Create an element that behaves like a DOM node
    mockElement = {
      offsetWidth: 200,
      offsetHeight: 150,
    };

    // Setup ResizeObserver mock
    global.ResizeObserver = vi.fn().mockImplementation((cb) => {
      observerCallback = cb;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: disconnectMock,
      };
    });
  });

  it("should initialize with default zeros and return ref structure", () => {
    vi.spyOn(React, "useRef").mockReturnValue({ current: null });
    
    const [ref, size] = useElementSize();
    
    expect(ref).toBeDefined();
    expect(size.width).toBe(0);
    expect(size.height).toBe(0);
  });

  it("should read dimensions when an element is attached", () => {
    vi.spyOn(React, "useRef").mockReturnValue({ current: mockElement });

    const [ref, size] = useElementSize();
    
    expect(size.width).toBe(200);
    expect(size.height).toBe(150);
  });
});