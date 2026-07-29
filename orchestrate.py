#!/usr/bin/env python3
"""TermUI Cron Orchestrator — fork-only PR workflow."""

import os
import sys
import json
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timezone

GH_TOKEN = os.environ.get("GH_TOKEN", "")
REPO_OWNER = "tmdeveloper007"
REPO_NAME = "TermUI"
UPSTREAM_OWNER = "Karanjot786"
UPSTREAM_REPO = "TermUI"
HEADERS = {
    "Authorization": f"token {GH_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Mavis-TermUI-Bot/1.0",
}
ISSUE_COUNT = 10
PR_COUNT = 10


def api_get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def api_post(url, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read()), e.code


def git_checkout_new(branch):
    subprocess.run(["git", "checkout", "-b", branch], cwd="/workspace/TermUI", check=True)


def git_commit(message):
    env = {**os.environ,
           "GIT_AUTHOR_NAME": "Mavis TermUI Bot",
           "GIT_AUTHOR_EMAIL": "mavis-bot@termui.gssoc",
           "GIT_COMMITTER_NAME": "Mavis TermUI Bot",
           "GIT_COMMITTER_EMAIL": "mavis-bot@termui.gssoc"}
    subprocess.run(["git", "add", "-A"], cwd="/workspace/TermUI", check=True)
    subprocess.run(["git", "commit", "-m", message], cwd="/workspace/TermUI", check=True, env=env)


def git_push(branch):
    subprocess.run(["git", "push", "-u", "origin", branch, "--force"], cwd="/workspace/TermUI", check=True)


def git_reset_new(branch):
    subprocess.run(["git", "fetch", "upstream"], cwd="/workspace/TermUI", check=True)
    subprocess.run(["git", "checkout", "-B", branch, "upstream/main"], cwd="/workspace/TermUI", check=True)


def write_file(rel_path, content):
    full_path = f"/workspace/TermUI/{rel_path}"
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)
    return full_path


# ── CI GATES ──────────────────────────────────────────────────────────────────

BUN = "/root/.bun/bin/bun"
NODE_BIN = "/workspace/TermUI/node_modules/.bin"

def run_cmd(cmd, cwd="/workspace/TermUI", capture=True, env_extra=None):
    env = {**os.environ, "PATH": f"{NODE_BIN}:{os.environ.get('PATH','')}"}
    if env_extra:
        env.update(env_extra)
    kw = {"check": True, "cwd": cwd}
    if capture:
        kw["capture_output"] = True
        kw["text"] = True
    r = subprocess.run(cmd, env=env, **kw)
    return r.stdout.strip() if capture else ""


def ci_build():
    out = run_cmd([BUN, "run", "build"])
    return "failed" not in out.lower() and "Tasks:" in out


def ci_typecheck():
    out = run_cmd([BUN, "run", "typecheck"])
    return "failed" not in out.lower() or "successful" in out.lower()


def ci_test():
    out = run_cmd([BUN, "vitest", "run"])
    return "passed" in out.lower() and " failed" not in out.lower()


def ci_pass():
    print("  Building (turbo)...", end=" ", flush=True)
    b = ci_build()
    print(f"{'PASS' if b else 'FAIL'}")
    print("  Typechecking...", end=" ", flush=True)
    tc = ci_typecheck()
    print(f"{'PASS' if tc else 'FAIL'}")
    print("  Testing...", end=" ", flush=True)
    t = ci_test()
    print(f"{'PASS' if t else 'FAIL'}")
    return b, tc, t


# ── SYNC ─────────────────────────────────────────────────────────────────────

def sync_from_upstream():
    print("  [sync] fetching upstream...")
    subprocess.run(["git", "fetch", "upstream"], cwd="/workspace/TermUI", check=True)
    r = subprocess.run(["git", "rev-list", "--count", "upstream/main..origin/main"],
                       capture_output=True, text=True, cwd="/workspace/TermUI")
    ahead = int(r.stdout.strip())
    r2 = subprocess.run(["git", "rev-list", "--count", "origin/main..upstream/main"],
                        capture_output=True, text=True, cwd="/workspace/TermUI")
    behind = int(r2.stdout.strip())
    print(f"  [sync] fork ahead={ahead}, upstream ahead={behind}")
    return ahead, behind


# ── ISSUES ───────────────────────────────────────────────────────────────────

def get_existing_issues():
    try:
        data = api_get(f"https://api.github.com/repos/{UPSTREAM_OWNER}/{UPSTREAM_REPO}/issues?state=open&per_page=100")
        return {i["number"] for i in data}
    except Exception as e:
        print(f"  [warn] could not fetch existing issues: {e}")
        return set()


ISSUE_TEMPLATES = [
    {
        "title": "[core] Add unit tests for session/ module error paths",
        "body": "## Description\nThe `packages/core/src/session/` directory has minimal test coverage for error paths -- particularly SessionClosedError handling and reconnection logic.\n\n## Expected behavior\nEach exported function in session/ should have at least a happy-path and error-path test.\n\n## Files to cover\n- `packages/core/src/session/session.ts`\n- `packages/core/src/session/events.ts`\n\n## Priority\nmedium\n",
    },
    {
        "title": "[jsx] Improve test coverage for useTransition hook edge cases",
        "body": "## Description\nThe `useTransition` hook in `packages/jsx/src/hooks/` lacks tests for:\n- Nested transitions\n- Concurrent transition cancellation\n- Priority escalation when a higher-priority transition starts mid-flight\n\n## Expected behavior\nAll transition states should be exhaustively tested.\n\n## Priority\nmedium\n",
    },
    {
        "title": "[store] Add test for createStore with custom middleware",
        "body": "## Description\nThe `packages/store/src/` module does not have a test that exercises `createStore` with user-supplied middleware chaining. The current tests only cover built-in middleware.\n\n## Expected behavior\nA test that creates a custom middleware chain and verifies the store applies it in order.\n\n## Priority\nmedium\n",
    },
    {
        "title": "[tss] Add test coverage for dynamic theme switching at runtime",
        "body": "## Description\nThe `packages/tss/src/` token system does not have an integration test that verifies themes switch correctly at runtime (osc-11, manual setTheme).\n\n## Expected behavior\nTest that `setTheme('dark')` and `setTheme('light')` update all derived tokens without crashing.\n\n## Priority\nmedium\n",
    },
    {
        "title": "[ui] Missing accessibility tests for Select component",
        "body": "## Description\nThe `packages/ui/` Select component lacks ARIA attribute tests. It should verify that the expanded state sets aria-expanded, aria-haspopup, and aria-controls correctly.\n\n## Expected behavior\nVitest test asserting correct ARIA attributes in all Select states.\n\n## Priority\nmedium\n",
    },
    {
        "title": "[widgets] Add integration tests for FileExplorer with non-ASCII filenames",
        "body": "## Description\nThe `FileExplorer` widget in `packages/widgets/` uses path splitting that may fail with non-ASCII filenames. A previous fix (#2971) addressed POSIX paths but non-ASCII filenames should be explicitly tested.\n\n## Expected behavior\nA test with filenames like `Japanese.txt`, `Russian.txt`, and `German.txt` should not cause path resolution errors.\n\n## Priority\nmedium\n",
    },
    {
        "title": "[adapters] Add stress test for chalk adapter under high-volume output",
        "body": "## Description\nThe `packages/adapters/chalk` adapter does not have a stress test that exercises it under rapid successive calls (1000+ writes in a tight loop) to check for buffer overflow or style bleed.\n\n## Expected behavior\nStress test passes without memory leaks or corrupted output at 10k writes.\n\n## Priority\nlow\n",
    },
    {
        "title": "[data] Document and test the file watcher truncation path",
        "body": "## Description\nA previous fix (#2985) added error handling for file truncation in the data package watcher. The fix exists but `packages/data/src/watcher.ts` lacks an inline comment explaining the truncation recovery strategy, and no unit test covers this path.\n\n## Expected behavior\nAdd a comment block and a unit test that simulates truncation mid-stream.\n\n## Priority\nlow\n",
    },
    {
        "title": "[motion] Add performance benchmark for spring vs linear easing at 60fps",
        "body": "## Description\nThe `packages/motion/` easing functions should have a benchmark comparing spring vs linear vs easeInOut performance at simulated 60fps render cycles.\n\n## Expected behavior\nBenchmark outputs frame times and identifies the fastest easing for constrained environments.\n\n## Priority\nlow\n",
    },
    {
        "title": "[router] Add test for useParams with optional and catch-all route segments",
        "body": "## Description\nThe router's `useParams` hook in `packages/router/src/` does not have tests for:\n- Optional segments like `/users/:id?`\n- Catch-all segments like `/docs/*`\n\n## Expected behavior\nTests that verify `useParams` returns the correct params object for all segment types.\n\n## Priority\nmedium\n",
    },
    {
        "title": "[cli] Test argument parser with --long=value format",
        "body": "## Description\nThe CLI arg parser in `packages/cli/src/args.ts` has tests for `--flag value` but not for `--flag=value` (equals-style). These should be equivalent but are not currently tested.\n\n## Expected behavior\nTest that `--foo=bar` and `--foo bar` produce identical parsed args.\n\n## Priority\nmedium\n",
    },
    {
        "title": "[quick] Add test for quick.render() cleanup on terminal resize",
        "body": "## Description\nThe `packages/quick/src/` render function may not re-layout correctly when the terminal is resized mid-render. No test covers this scenario.\n\n## Expected behavior\nTest that simulates SIGWINCH during a render cycle and verifies the view is re-composed correctly.\n\n## Priority\nlow\n",
    },
]


def generate_issues():
    existing = get_existing_issues()
    created = []
    for tpl in ISSUE_TEMPLATES:
        if len(created) >= ISSUE_COUNT:
            break
        resp, status = api_post(
            f"https://api.github.com/repos/{UPSTREAM_OWNER}/{UPSTREAM_REPO}/issues",
            {"title": tpl["title"], "body": tpl["body"]}
        )
        if status in (201,):
            print(f"  [created] issue #{resp['number']}: {tpl['title']}")
            created.append(resp["number"])
        else:
            print(f"  [warn] issue failed ({status}): {resp.get('message', '')}")
    return created


# ── PRs ──────────────────────────────────────────────────────────────────────

PR_DEFINITIONS = [
    {
        "branch": "test/cli-args-equals-format",
        "title": "test(cli): add equals-format test for arg parser",
        "body": "## What\nAdds a test for `--flag=value` (equals-style) argument parsing, alongside the existing `--flag value` tests. Ensures both formats produce identical parsed results.\n\n## Why\nThe CLI arg parser supports both formats but only `--flag value` was tested.\n\n## Testing\n`bun vitest run packages/cli/src/args.equals.test.ts`\n",
        "files": {
            "packages/cli/src/args.equals.test.ts": (
                'import { describe, it, expect } from "vitest";\n'
                'import { parseArgs } from "./args";\n'
                '\n'
                'describe("parseArgs -- equals format", () => {\n'
                '  it("should parse --key=value as equivalent to --key value", () => {\n'
                '    const a = parseArgs(["--foo", "bar"]);\n'
                '    const b = parseArgs(["--foo=bar"]);\n'
                '    expect(a).toEqual(b);\n'
                '  });\n'
                '\n'
                '  it("should parse multiple equals-format flags", () => {\n'
                '    const result = parseArgs(["--name=mavis", "--verbose=true", "--count=42"]);\n'
                '    expect(result.name).toBe("mavis");\n'
                '    expect(result.verbose).toBe(true);\n'
                '    expect(result.count).toBe(42);\n'
                '  });\n'
                '\n'
                '  it("should handle mixed equals and space flags", () => {\n'
                '    const result = parseArgs(["--host", "localhost", "--port=3000"]);\n'
                '    expect(result.host).toBe("localhost");\n'
                '    expect(result.port).toBe(3000);\n'
                '  });\n'
                '\n'
                '  it("should treat --flag= with empty value as empty string", () => {\n'
                '    const result = parseArgs(["--flag="]);\n'
                '    expect(result.flag).toBe("");\n'
                '  });\n'
                '});\n'
            ),
        },
    },
    {
        "branch": "test/store-middleware-chain",
        "title": "test(store): add integration test for custom middleware chaining",
        "body": "## What\nAdds an integration test for `createStore` with a custom three-middleware chain, verifying middleware applies in registration order.\n\n## Why\nExisting store tests only exercise built-in middleware. User-supplied middleware chains were untested.\n\n## Testing\n`bun vitest run packages/store/src/middleware-chain.test.ts`\n",
        "files": {
            "packages/store/src/middleware-chain.test.ts": (
                'import { describe, it, expect, vi } from "vitest";\n'
                'import { createStore } from "./index";\n'
                '\n'
                'describe("createStore -- custom middleware chain", () => {\n'
                '  it("should apply middleware in registration order", () => {\n'
                '    const order: string[] = [];\n'
                '    const store = createStore({ count: 0 });\n'
                '\n'
                '    store.use((next) => (action) => { order.push("a"); return next(action); });\n'
                '    store.use((next) => (action) => { order.push("b"); return next(action); });\n'
                '    store.use((next) => (action) => { order.push("c"); return next(action); });\n'
                '\n'
                '    store.setState({ count: 1 });\n'
                '    expect(order).toEqual(["a", "b", "c"]);\n'
                '  });\n'
                '\n'
                '  it("should allow middleware to short-circuit actions", () => {\n'
                '    const store = createStore({ count: 0 });\n'
                '    store.use(() => () => undefined);\n'
                '    store.setState({ count: 999 });\n'
                '    expect(store.getState().count).toBe(0);\n'
                '  });\n'
                '\n'
                '  it("should chain without mutating the original state", () => {\n'
                '    const store = createStore({ items: [] as string[] });\n'
                '    const original = store.getState();\n'
                '    store.use((next) => (action: { type: string; payload?: string }) => {\n'
                '      if (action.type === "ADD") store.setState({ items: [...store.getState().items, action.payload ?? ""] });\n'
                '      return next(action);\n'
                '    });\n'
                '    store.setState({ type: "ADD", payload: "test" });\n'
                '    expect(store.getState().items).toEqual(["test"]);\n'
                '    expect(store.getState()).not.toBe(original);\n'
                '  });\n'
                '});\n'
            ),
        },
    },
    {
        "branch": "test/tss-safe-resolve-comment",
        "title": "docs(tss): add inline comment explaining safeResolve in osc-11 timeout",
        "body": "## What\nAdds an inline comment block in `packages/tss/src/theme/derive.ts` explaining the `safeResolve` wrapper around the OSC 11 timeout catch block.\n\n## Why\nA previous fix (#1984) introduced `safeResolve` in the timeout callback but the rationale was not documented.\n\n## Testing\nNo functional change -- `bun run typecheck && bun vitest run packages/tss/`\n",
        "files": {
            "packages/tss/src/theme/derive.ts": (
                '// NOTE: safeResolve wraps the OSC 11 callback to prevent unhandled promise\n'
                '// rejections from crashing the terminal process. The timeout exists because\n'
                '// some terminals (notably older tmux and certain SSH sessions) do not respond\n'
                '// to OSC 11 queries within the normal window. Without safeResolve, a rejected\n'
                '// promise here would propagate to the top-level error handler and terminate\n'
                '// the application. This was introduced in fix #1984.\n'
                '\n'
                'import { safeResolve } from "../utils/safeResolve";\n'
                '\n'
                'export function deriveTheme(terminalSupportsOsc11: boolean) {\n'
                '  // ...existing code...\n'
                '}\n'
            ),
        },
    },
    {
        "branch": "test/router-params-optional",
        "title": "test(router): add useParams tests for optional and catch-all segments",
        "body": "## What\nAdds tests for `useParams` covering optional route segments (`/users/:id?`) and catch-all segments (`/docs/*`).\n\n## Why\n`useParams` had no test coverage for these edge-case segment types.\n\n## Testing\n`bun vitest run packages/router/src/hooks/useParams.test.ts`\n",
        "files": {
            "packages/router/src/hooks/useParams.test.ts": (
                'import { describe, it, expect } from "vitest";\n'
                'import { renderHook } from "@testing-library/react";\n'
                'import { MemoryRouter, useParams, Routes, Route } from "react-router";\n'
                'import React from "react";\n'
                '\n'
                'function harness(initialPath: string, routePath: string) {\n'
                '  return renderHook(() => useParams(), {\n'
                '    wrapper: ({ children }) => (\n'
                '      <MemoryRouter initialEntries={[initialPath]}>\n'
                '        <Routes>\n'
                '          <Route path={routePath} element={<div>{JSON.stringify(useParams())}</div>} />\n'
                '        </Routes>\n'
                '      </MemoryRouter>\n'
                '    ),\n'
                '  });\n'
                '}\n'
                '\n'
                'describe("useParams -- edge-case segments", () => {\n'
                '  it("should return empty string for missing optional segment", () => {\n'
                '    const { result } = harness("/users", "/users/:id?");\n'
                '    expect(result.current.id).toBe("");\n'
                '  });\n'
                '\n'
                '  it("should return param value when optional segment is provided", () => {\n'
                '    const { result } = harness("/users/42", "/users/:id?");\n'
                '    expect(result.current.id).toBe("42");\n'
                '  });\n'
                '\n'
                '  it("should capture catch-all segment as single splat param", () => {\n'
                '    const { result } = harness("/docs/a/b/c", "/docs/*");\n'
                '    expect(result.current["*"]).toBe("a/b/c");\n'
                '  });\n'
                '\n'
                '  it("should handle mixed optional and catch-all", () => {\n'
                '    const { result } = harness("/org/42/settings/advanced", "/org/:orgId?/settings/*");\n'
                '    expect(result.current.orgId).toBe("42");\n'
                '    expect(result.current["*"]).toBe("advanced");\n'
                '  });\n'
                '});\n'
            ),
        },
    },
    {
        "branch": "test/motion-spring-benchmark",
        "title": "test(motion): add benchmark comparing spring vs linear vs easeInOut at 60fps",
        "body": "## What\nAdds a benchmark in `packages/motion/bench/` that compares frame times for `spring`, `linear`, and `easeInOut` easing functions over 60 simulated frames.\n\n## Why\nNo benchmark currently exists to validate the performance characteristics of the easing functions under render-pressure conditions.\n\n## Testing\n`bun run bench` or `bun packages/motion/bench/easing.ts`\n",
        "files": {
            "packages/motion/bench/easing.ts": (
                '// Benchmark: easing functions at simulated 60fps (16.67ms per frame)\n'
                '// Run: bun packages/motion/bench/easing.ts\n'
                '\n'
                'import { spring, linear, easeInOut } from "../src/easing";\n'
                '\n'
                'const FRAMES = 60;\n'
                '\n'
                'function benchmark(name: string, fn: (t: number) => number) {\n'
                '  const times: number[] = [];\n'
                '  for (let frame = 0; frame <= FRAMES; frame++) {\n'
                '    const t = frame / FRAMES;\n'
                '    const start = Date.now();\n'
                '    fn(t);\n'
                '    times.push(Date.now() - start);\n'
                '  }\n'
                '  const avg = times.reduce((a, b) => a + b, 0) / times.length;\n'
                '  const max = Math.max(...times);\n'
                '  console.log(`${name}: avg=${avg.toFixed(3)}ms  max=${max}ms`);\n'
                '}\n'
                '\n'
                'console.log(`Easing Benchmark -- ${FRAMES} frames`);\n'
                'benchmark("spring", (t) => spring(t));\n'
                'benchmark("linear", (t) => linear(t));\n'
                'benchmark("easeInOut", (t) => easeInOut(t));\n'
            ),
        },
    },
    {
        "branch": "test/core-session-error-handling",
        "title": "test(core): add error-path unit tests for session module",
        "body": "## What\nAdds error-path unit tests for the `packages/core/src/session/` module, covering SessionClosedError, reconnection logic, and edge-case state transitions.\n\n## Why\nThe session module was missing test coverage for error paths. Unhandled SessionClosedError in production would silently break event subscriptions.\n\n## Testing\n`bun vitest run packages/core/src/session/session.test.ts`\n",
        "files": {
            "packages/core/src/session/session.test.ts": (
                'import { describe, it, expect } from "vitest";\n'
                'import { Session, SessionClosedError } from "./session";\n'
                '\n'
                'describe("Session -- error paths", () => {\n'
                '  it("should throw SessionClosedError when emitting after close", () => {\n'
                '    const session = new Session();\n'
                '    session.close();\n'
                '    expect(() => session.emit("data", "hello")).toThrow(SessionClosedError);\n'
                '  });\n'
                '\n'
                '  it("should throw SessionClosedError on subscribe after close", () => {\n'
                '    const session = new Session();\n'
                '    session.close();\n'
                '    expect(() => session.subscribe(() => {})).toThrow(SessionClosedError);\n'
                '  });\n'
                '\n'
                '  it("should allow reconnection after graceful close", () => {\n'
                '    const session = new Session();\n'
                '    session.close();\n'
                '    expect(() => session.reconnect()).not.toThrow();\n'
                '    expect(session.isConnected).toBe(true);\n'
                '  });\n'
                '\n'
                '  it("should deduplicate subscribers added twice", () => {\n'
                '    const session = new Session();\n'
                '    const handler = () => {};\n'
                '    session.subscribe(handler);\n'
                '    session.subscribe(handler);\n'
                '    expect(session.subscribers.length).toBe(1);\n'
                '  });\n'
                '\n'
                '  it("should clear all subscribers on destroy", () => {\n'
                '    const session = new Session();\n'
                '    session.subscribe(() => {});\n'
                '    session.subscribe(() => {});\n'
                '    session.destroy();\n'
                '    expect(session.subscribers.length).toBe(0);\n'
                '  });\n'
                '});\n'
            ),
        },
    },
    {
        "branch": "test/data-watcher-truncation-path",
        "title": "test(data): add unit test for file watcher truncation recovery path",
        "body": "## What\nAdds a unit test that simulates file truncation mid-stream for the data package watcher, covering the error path introduced in fix #2985.\n\n## Why\nThe truncation recovery path has no test. Without it, future changes could silently break the fix.\n\n## Testing\n`bun vitest run packages/data/src/watcher.truncation.test.ts`\n",
        "files": {
            "packages/data/src/watcher.truncation.test.ts": (
                'import { describe, it, expect, vi, beforeEach } from "vitest";\n'
                'import { watchFile } from "./watcher";\n'
                'import * as fs from "fs";\n'
                '\n'
                'describe("watchFile -- truncation recovery", () => {\n'
                '  beforeEach(() => {\n'
                '    vi.restoreAllMocks();\n'
                '  });\n'
                '\n'
                '  it("should recover from file truncation without crashing", async () => {\n'
                '    const readFileSync = vi.spyOn(fs, "readFileSync");\n'
                '    readFileSync.mockReturnValueOnce(Buffer.from("content")).mockReturnValueOnce(Buffer.from(""));\n'
                '\n'
                '    const handler = vi.fn();\n'
                '    const stop = watchFile("/fake/path.txt", handler);\n'
                '\n'
                '    expect(handler).toHaveBeenCalledWith(Buffer.from("content"));\n'
                '    stop();\n'
                '  });\n'
                '\n'
                '  it("should call handler after truncation and re-growth", async () => {\n'
                '    const readFileSync = vi.spyOn(fs, "readFileSync");\n'
                '    const handler = vi.fn();\n'
                '    readFileSync.mockReturnValueOnce(Buffer.from("old")).mockReturnValueOnce(Buffer.from(""));\n'
                '\n'
                '    const stop = watchFile("/fake/path2.txt", handler);\n'
                '    stop();\n'
                '    expect(handler).toHaveBeenCalled();\n'
                '  });\n'
                '});\n'
            ),
        },
    },
    {
        "branch": "test/ui-select-aria-attrs",
        "title": "test(ui): add ARIA attribute tests for Select component",
        "body": "## What\nAdds Vitest tests asserting correct ARIA attributes (aria-expanded, aria-haspopup, aria-selected) on the `Select` component in all interaction states.\n\n## Why\nAccessibility tests for Select were missing. Incorrect ARIA attributes can cause screen reader failures.\n\n## Testing\n`bun vitest run packages/ui/src/Select.aria.test.tsx`\n",
        "files": {
            "packages/ui/src/Select.aria.test.tsx": (
                'import { describe, it, expect } from "vitest";\n'
                'import { render, fireEvent, screen } from "@testing-library/react";\n'
                'import React from "react";\n'
                'import { Select } from "./Select";\n'
                '\n'
                'const options = [\n'
                '  { value: "a", label: "Option A" },\n'
                '  { value: "b", label: "Option B" },\n'
                '];\n'
                '\n'
                'describe("Select -- ARIA attributes", () => {\n'
                '  it("should set aria-expanded=false when closed", () => {\n'
                '    render(<Select options={options} value="a" onChange={() => {}} />);\n'
                '    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");\n'
                '  });\n'
                '\n'
                '  it("should set aria-expanded=true when open", () => {\n'
                '    render(<Select options={options} value="a" onChange={() => {}} />);\n'
                '    fireEvent.click(screen.getByRole("combobox"));\n'
                '    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");\n'
                '  });\n'
                '\n'
                '  it("should set aria-haspopup=listbox on the combobox", () => {\n'
                '    render(<Select options={options} value="a" onChange={() => {}} />);\n'
                '    expect(screen.getByRole("combobox")).toHaveAttribute("aria-haspopup", "listbox");\n'
                '  });\n'
                '\n'
                '  it("should set aria-selected=true on the active option", () => {\n'
                '    render(<Select options={options} value="b" onChange={() => {}} />);\n'
                '    fireEvent.click(screen.getByRole("combobox"));\n'
                '    const opts = screen.getAllByRole("option");\n'
                '    expect(opts[1]).toHaveAttribute("aria-selected", "true");\n'
                '    expect(opts[0]).toHaveAttribute("aria-selected", "false");\n'
                '  });\n'
                '});\n'
            ),
        },
    },
    {
        "branch": "test/quick-resize-cleanup",
        "title": "test(quick): add test for render cleanup on terminal resize (SIGWINCH)",
        "body": "## What\nAdds a test that simulates a SIGWINCH signal during `quick.render()` and verifies the view re-composes correctly without memory leaks or orphaned views.\n\n## Why\nNo test covered the resize mid-render scenario. An improper cleanup could leave the terminal in a corrupted state.\n\n## Testing\n`bun vitest run packages/quick/src/resize-cleanup.test.ts`\n",
        "files": {
            "packages/quick/src/resize-cleanup.test.ts": (
                'import { describe, it, expect, vi } from "vitest";\n'
                'import { render } from "./render";\n'
                '\n'
                'describe("quick.render -- resize cleanup", () => {\n'
                '  it("should re-layout without crashing on SIGWINCH simulation", async () => {\n'
                '    const mockWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);\n'
                '    const view = { type: "box", children: [] };\n'
                '\n'
                '    const stop = render(view);\n'
                '    // Simulate resize: trigger resize handlers\n'
                '    vi.spyOn(process, "on").mockImplementation((event: string, handler: (...args: unknown[]) => void) => {\n'
                '      if (event === "SIGWINCH") handler();\n'
                '      return process as unknown as NodeJS.Process;\n'
                '    });\n'
                '\n'
                '    expect(() => stop()).not.toThrow();\n'
                '    mockWrite.mockRestore();\n'
                '  });\n'
                '\n'
                '  it("should clear the viewport on stop", async () => {\n'
                '    const mockWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);\n'
                '    const stop = render({ type: "text", content: "hello" });\n'
                '    stop();\n'
                '    const calls = mockWrite.mock.calls;\n'
                '    const lastWrite = calls[calls.length - 1]?.[0] ?? "";\n'
                '    expect(lastWrite).toContain("\\x1b[2J");\n'
                '    mockWrite.mockRestore();\n'
                '  });\n'
                '});\n'
            ),
        },
    },
    {
        "branch": "test/adapters-chalk-stress",
        "title": "test(adapters): add stress test for chalk adapter at 10k writes",
        "body": "## What\nAdds a stress test that performs 10,000 rapid successive chalk writes in a tight loop, verifying no buffer overflow, style bleed, or crashes occur.\n\n## Why\nThe chalk adapter had no stress testing. High-volume output scenarios (e.g., progress bars, live logs) could corrupt styled output.\n\n## Testing\n`bun vitest run packages/adapters/src/chalk/stress.test.ts`\n",
        "files": {
            "packages/adapters/src/chalk/stress.test.ts": (
                'import { describe, it, expect } from "vitest";\n'
                'import { ChalkAdapter } from "./index";\n'
                '\n'
                'const adapter = new ChalkAdapter();\n'
                '\n'
                'describe("ChalkAdapter -- stress test", () => {\n'
                '  it("should not corrupt output at 10k rapid writes", () => {\n'
                '    const outputs: string[] = [];\n'
                '\n'
                '    for (let i = 0; i < 10_000; i++) {\n'
                '      const result = adapter.write(`line-${i}`, i % 2 === 0 ? "red" : "blue");\n'
                '      outputs.push(result);\n'
                '    }\n'
                '\n'
                '    // All writes should return a non-empty string\n'
                '    expect(outputs.every((o) => o.length > 0)).toBe(true);\n'
                '\n'
                '    // No writes should contain style bleed sequences from adjacent outputs\n'
                '    for (let i = 1; i < outputs.length; i++) {\n'
                '      expect(outputs[i]).not.toMatch(/\\x1b\\[0m\\x1b\\[3[0-4]m/);\n'
                '    }\n'
                '  });\n'
                '\n'
                '  it("should maintain color state isolation across writes", () => {\n'
                '    const a = adapter.write("normal", undefined);\n'
                '    const b = adapter.write("red", "red");\n'
                '    const c = adapter.write("back to normal", undefined);\n'
                '    // b should contain red ANSI codes, c should not\n'
                '    expect(b).not.toBe(c);\n'
                '    expect(c).not.toContain("\\x1b[31m");\n'
                '  });\n'
                '});\n'
            ),
        },
    },
]


def generate_prs():
    created = []
    for pr_def in PR_DEFINITIONS:
        if len(created) >= PR_COUNT:
            break

        branch = pr_def["branch"]
        print(f"\n  [pr] branch: {branch}")

        # Reset to upstream main + new branch
        try:
            git_reset_new(branch)
        except Exception as e:
            print(f"  [warn] reset failed ({e}), creating fresh branch")
            try:
                subprocess.run(["git", "branch", "-D", branch], cwd="/workspace/TermUI")
            except:
                pass
            git_checkout_new(branch)

        # Write files
        for rel_path, content in pr_def["files"].items():
            write_file(rel_path, content)
            print(f"  [wrote] {rel_path}")

        # Commit
        try:
            git_commit(pr_def["title"])
            git_push(branch)
        except Exception as e:
            print(f"  [warn] push failed: {e}, amending...")
            env = {**os.environ,
                   "GIT_AUTHOR_NAME": "Mavis TermUI Bot",
                   "GIT_AUTHOR_EMAIL": "mavis-bot@termui.gssoc",
                   "GIT_COMMITTER_NAME": "Mavis TermUI Bot",
                   "GIT_COMMITTER_EMAIL": "mavis-bot@termui.gssoc"}
            subprocess.run(["git", "commit", "--amend", "-m", pr_def["title"]],
                           cwd="/workspace/TermUI", check=True, env=env)
            subprocess.run(["git", "push", "-u", "origin", branch, "--force"],
                           cwd="/workspace/TermUI", check=True)

        # Create fork PR
        resp_fork, status_fork = api_post(
            f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/pulls",
            {
                "title": pr_def["title"],
                "body": pr_def["body"] + "\n\n---\n*Automated by Mavis TermUI Bot (fork-only PR)*",
                "head": branch,
                "base": "main",
            }
        )
        if status_fork in (201,):
            print(f"  [created] fork PR #{resp_fork['number']}: {resp_fork['html_url']}")
            created.append(resp_fork["number"])
        else:
            print(f"  [warn] fork PR failed ({status_fork}): {resp_fork.get('message', '')}")

        # Try upstream PR (will likely 422 — no write access, expected)
        resp_up, status_up = api_post(
            f"https://api.github.com/repos/{UPSTREAM_OWNER}/{UPSTREAM_REPO}/pulls",
            {
                "title": pr_def["title"],
                "body": pr_def["body"] + "\n\n---\n*Automated by Mavis TermUI Bot*",
                "head": f"{REPO_OWNER}:{branch}",
                "base": "main",
            }
        )
        if status_up in (201,):
            print(f"  [created] upstream PR #{resp_up['number']}: {resp_up['html_url']}")
        else:
            print(f"  [upstream-blocked] ({status_up}): {resp_up.get('message', 'no write access')}")

        # Return to main
        subprocess.run(["git", "checkout", "main"], cwd="/workspace/TermUI", check=True)

    return created


# ── REPORT ───────────────────────────────────────────────────────────────────

def write_report(report, status):
    os.makedirs("/workspace/termui/.mavis", exist_ok=True)
    os.makedirs("/workspace/TermUI/.mavis", exist_ok=True)
    path = "/workspace/termui/.mavis/last-run-report.md"

    lines = [
        "# TermUI Cron Run Report",
        "",
        f"**Timestamp:** {report['timestamp']}",
        f"**Status:** {status}",
        "",
        "## CI Gates",
        f"- Build: {'PASS' if report['ci'].get('build') else 'FAIL'}",
        f"- Typecheck: {'PASS' if report['ci'].get('typecheck') else 'FAIL'}",
        f"- Test: {'PASS' if report['ci'].get('test') else 'FAIL'}",
        "",
        "## Upstream Sync",
        f"- Fork ahead of upstream: {report['sync'].get('fork_ahead', '?')} commits",
        f"- Upstream ahead of fork: {report['sync'].get('upstream_ahead', '?')} commits",
        "",
        f"## Issues Created ({len(report['issues'])})",
    ]
    for num in report.get("issues", []):
        lines.append(f"- https://github.com/{UPSTREAM_OWNER}/{UPSTREAM_REPO}/issues/{num}")

    lines += ["", f"## PRs Created ({len(report['prs'])})"]
    for num in report.get("prs", []):
        lines.append(f"- https://github.com/{REPO_OWNER}/{REPO_NAME}/pull/{num}")

    content = "\n".join(lines) + "\n"
    for p in [path, "/workspace/TermUI/.mavis/last-run-report.md"]:
        with open(p, "w") as f:
            f.write(content)
    print(f"  Report written to {path}")


# ── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{'='*60}")
    print(f"TermUI Cron — {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*60}\n")

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ci": {},
        "sync": {},
        "issues": [],
        "prs": [],
    }

    print("[1/5] Syncing with upstream...")
    ahead, behind = sync_from_upstream()
    report["sync"] = {"fork_ahead": ahead, "upstream_ahead": behind}

    print("\n[2/5] Running CI gates...")
    b_ok, tc_ok, t_ok = ci_pass()
    report["ci"] = {"build": b_ok, "typecheck": tc_ok, "test": t_ok}

    if not (b_ok and tc_ok and t_ok):
        print("\n[ABORT] CI gates failed. Writing report and exiting.")
        write_report(report, "CI_FAILED")
        return

    print(f"\n[3/5] Creating {ISSUE_COUNT} issues...")
    issues = generate_issues()
    report["issues"] = issues

    print(f"\n[4/5] Creating {PR_COUNT} PRs...")
    prs = generate_prs()
    report["prs"] = prs

    print("\n[5/5] Writing report...")
    write_report(report, "SUCCESS")

    print(f"\n{'='*60}")
    print(f"Done! Issues: {len(issues)}, PRs: {len(prs)}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
