import { describe, it, expect, vi, beforeEach } from "vitest";
import { watchFile } from "./watcher";
import * as fs from "fs";

describe("watchFile -- truncation recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should recover from file truncation without crashing", async () => {
    const readFileSync = vi.spyOn(fs, "readFileSync");
    readFileSync.mockReturnValueOnce(Buffer.from("content")).mockReturnValueOnce(Buffer.from(""));

    const handler = vi.fn();
    const stop = watchFile("/fake/path.txt", handler);

    expect(handler).toHaveBeenCalledWith(Buffer.from("content"));
    stop();
  });

  it("should call handler after truncation and re-growth", async () => {
    const readFileSync = vi.spyOn(fs, "readFileSync");
    const handler = vi.fn();
    readFileSync.mockReturnValueOnce(Buffer.from("old")).mockReturnValueOnce(Buffer.from(""));

    const stop = watchFile("/fake/path2.txt", handler);
    stop();
    expect(handler).toHaveBeenCalled();
  });
});
