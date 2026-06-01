import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { DevServer } from "./server.js"
import { existsSync } from "node:fs"

// Create a helper to construct mock child processes
function createMockSubprocess() {
  return {
    kill: vi.fn(),
    send: vi.fn(),
    exitCode: null,
    signalCode: null,
    killed: false,
    exited: Promise.resolve(0),
  }
}

// Setup top-level mock definitions for the Bun global and fs module
vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
}))

describe("DevServer", () => {
  let mockChild: any

  beforeEach(() => {
    vi.useFakeTimers()
    mockChild = createMockSubprocess()

    // Stub global Bun environment
    global.Bun = {
      spawn: vi.fn(() => mockChild),
    } as any

    vi.mocked(existsSync).mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("should spawn the correct entry file when started", () => {
    const server = new DevServer({
      rootDir: "./project",
      entry: "src/index.tsx",
    })

    server.start()

    expect(global.Bun.spawn).toHaveBeenCalledTimes(1)
    expect(global.Bun.spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        cmd: ["bun", "src/index.tsx"],
        cwd: expect.stringContaining("project"),
      })
    )
    expect(server.isRunning).toBe(true)
  })

  it("should auto-detect standard entry file configurations if none are provided", () => {
    vi.mocked(existsSync).mockImplementation((path: any) => path.endsWith("src/main.ts"))

    const server = new DevServer({
      rootDir: "./project",
    })

    server.start()

    expect(global.Bun.spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        cmd: ["bun", expect.stringContaining("src/main.ts")],
      })
    )
  })

  it("should route structural incoming devtools messages safely via the IPC socket handler", () => {
    let capturedIpcHandler: ((msg: any) => void) | undefined

    global.Bun.spawn = vi.fn((options: any) => {
      capturedIpcHandler = options.ipc
      return mockChild
    }) as any

    const server = new DevServer({
      rootDir: "./project",
      entry: "index.ts",
    })

    server.start()

    // Safeguard check that the IPC lifecycle callback was linked
    expect(capturedIpcHandler).toBeDefined()

    // Fire simulated events down the channel pipeline
    capturedIpcHandler!({
      type: "devtools",
      event: "render-tree",
      data: "active",
    })

    expect(server.devtools.events.length).toBeGreaterThan(0)
    expect(server.devtools.events[0]).toEqual(
      expect.objectContaining({
        type: "render-tree",
        detail: '"active"',
      })
    )
  })

  it("should debounce rapid change triggers, send an IPC reload message, and respawn the subprocess", async () => {
    const onReloadSpy = vi.fn()
    const server = new DevServer({
      rootDir: "./project",
      entry: "index.ts",
      onReload: onReloadSpy,
      debounce: 200,
    })

    server.start()

    // Extract the inner onChange reference to simulate watcher notifications manually
    const watcherInstance = (server as any)._watcher
    
    // Simulate rapid, successive file changes
    watcherInstance._onChangeCallbacks.forEach((cb: any) => cb({ filename: "App.tsx", type: "tsx" }))
    watcherInstance._onChangeCallbacks.forEach((cb: any) => cb({ filename: "index.css", type: "tss" }))

    // Fired right away on immediate change discovery
    expect(onReloadSpy).toHaveBeenCalledTimes(2)
    expect(server.reloadCount).toBe(2)

    // Advance right into the middle of the debounce cycle
    vi.advanceTimersByTime(100)
    expect(mockChild.send).not.toHaveBeenCalled()

    // Reach full debounce window threshold to trigger process turnaround logic
    await vi.advanceTimersByTimeAsync(100)
    expect(mockChild.send).toHaveBeenCalledWith({ type: "reload" })

    // Move past the internal grace-period wait loop
    await vi.advanceTimersByTimeAsync(200)

    // Complete the full respawn timeline delay loop
    await vi.advanceTimersByTimeAsync(100)
    expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM")
    expect(global.Bun.spawn).toHaveBeenCalledTimes(2) // Initial run + restart respawn
  })

  it("should cleanly tear down subprocesses and timers upon stopping", () => {
    const server = new DevServer({
      rootDir: "./project",
      entry: "index.ts",
    })

    server.start()
    server.stop()

    expect(server.isRunning).toBe(false)
    expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM")
  })
})