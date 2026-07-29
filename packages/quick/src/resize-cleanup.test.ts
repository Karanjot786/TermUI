import { describe, it, expect, vi } from "vitest";
import { render } from "./render";

describe("quick.render -- resize cleanup", () => {
  it("should re-layout without crashing on SIGWINCH simulation", async () => {
    const mockWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const view = { type: "box", children: [] };

    const stop = render(view);
    // Simulate resize: trigger resize handlers
    vi.spyOn(process, "on").mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === "SIGWINCH") handler();
      return process as unknown as NodeJS.Process;
    });

    expect(() => stop()).not.toThrow();
    mockWrite.mockRestore();
  });

  it("should clear the viewport on stop", async () => {
    const mockWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stop = render({ type: "text", content: "hello" });
    stop();
    const calls = mockWrite.mock.calls;
    const lastWrite = calls[calls.length - 1]?.[0] ?? "";
    expect(lastWrite).toContain("\x1b[2J");
    mockWrite.mockRestore();
  });
});
