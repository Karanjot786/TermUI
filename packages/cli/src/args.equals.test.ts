import { describe, it, expect } from "vitest";
import { parseArgs } from "./args";

describe("parseArgs -- equals format", () => {
  it("should parse --key=value as equivalent to --key value", () => {
    const a = parseArgs(["--foo", "bar"]);
    const b = parseArgs(["--foo=bar"]);
    expect(a).toEqual(b);
  });

  it("should parse multiple equals-format flags", () => {
    const result = parseArgs(["--name=mavis", "--verbose=true", "--count=42"]);
    expect(result.name).toBe("mavis");
    expect(result.verbose).toBe(true);
    expect(result.count).toBe(42);
  });

  it("should handle mixed equals and space flags", () => {
    const result = parseArgs(["--host", "localhost", "--port=3000"]);
    expect(result.host).toBe("localhost");
    expect(result.port).toBe(3000);
  });

  it("should treat --flag= with empty value as empty string", () => {
    const result = parseArgs(["--flag="]);
    expect(result.flag).toBe("");
  });
});
