import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter, useParams, Routes, Route } from "react-router";
import React from "react";

function harness(initialPath: string, routePath: string) {
  return renderHook(() => useParams(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={routePath} element={<div>{JSON.stringify(useParams())}</div>} />
        </Routes>
      </MemoryRouter>
    ),
  });
}

describe("useParams -- edge-case segments", () => {
  it("should return empty string for missing optional segment", () => {
    const { result } = harness("/users", "/users/:id?");
    expect(result.current.id).toBe("");
  });

  it("should return param value when optional segment is provided", () => {
    const { result } = harness("/users/42", "/users/:id?");
    expect(result.current.id).toBe("42");
  });

  it("should capture catch-all segment as single splat param", () => {
    const { result } = harness("/docs/a/b/c", "/docs/*");
    expect(result.current["*"]).toBe("a/b/c");
  });

  it("should handle mixed optional and catch-all", () => {
    const { result } = harness("/org/42/settings/advanced", "/org/:orgId?/settings/*");
    expect(result.current.orgId).toBe("42");
    expect(result.current["*"]).toBe("advanced");
  });
});
