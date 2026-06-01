import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { FileWatcher } from "./watcher.js"
import { watch, existsSync } from "node:fs"
import { EventEmitter } from "node:events"

// Explicitly mock the native file system module
vi.mock("node:fs", () => {
  return {
    watch: vi.fn(),
    existsSync: vi.fn(() => true),
  }
})

describe("FileWatcher", () => {
  let mockWatcherEmitter: EventEmitter

  beforeEach(() => {
    vi.useFakeTimers()
    mockWatcherEmitter = new EventEmitter()
    vi.mocked(watch).mockReturnValue(mockWatcherEmitter as any)
    vi.mocked(existsSync).mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("should successfully register and execute onChange events for a valid .tsx file", () => {
    const watcher = new FileWatcher(["./src"])
    const changeSpy = vi.fn()

    watcher.onChange(changeSpy)
    watcher.start()

    // Simulate node:fs watch firing a change event
    mockWatcherEmitter.emit("change", "change", "index.tsx")

    // Fast-forward beyond the 100ms debounce window
    vi.advanceTimersByTime(100)

    expect(changeSpy).toHaveBeenCalledTimes(1)
    expect(changeSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filename: "index.tsx",
        type: "tsx",
      })
    )
  })

  it("should bundle multiple rapid file changes into a single debounced notification", () => {
    const watcher = new FileWatcher(["./src"])
    const changeSpy = vi.fn()

    watcher.onChange(changeSpy)
    watcher.start()

    // Fire events in rapid succession
    mockWatcherEmitter.emit("change", "change", "App.tsx")
    vi.advanceTimersByTime(40)
    mockWatcherEmitter.emit("change", "change", "App.tsx")
    vi.advanceTimersByTime(40)
    mockWatcherEmitter.emit("change", "change", "App.tsx")

    // Not fired yet since 100ms total hasn't passed since the last hit
    expect(changeSpy).not.toHaveBeenCalled()

    // Complete the debounce window
    vi.advanceTimersByTime(100)

    expect(changeSpy).toHaveBeenCalledTimes(1)
  })

  it("should classify extensions correctly into tsx, tss, or config categories", () => {
    const watcher = new FileWatcher(["./src"])
    const changeSpy = vi.fn()

    watcher.onChange(changeSpy)
    watcher.start()

    // Test tss structure
    mockWatcherEmitter.emit("change", "change", "styles.tss")
    vi.advanceTimersByTime(100)
    expect(changeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ type: "tss" }))

    // Test configuration string structure
    mockWatcherEmitter.emit("change", "change", "termui.config.json")
    vi.advanceTimersByTime(100)
    expect(changeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ type: "config" }))
  })

  it("should ignore unsupported or random file extensions", () => {
    const watcher = new FileWatcher(["./src"])
    const changeSpy = vi.fn()

    watcher.onChange(changeSpy)
    watcher.start()

    mockWatcherEmitter.emit("change", "change", "image.png")
    vi.advanceTimersByTime(200)

    expect(changeSpy).not.toHaveBeenCalled()
  })

  it("should bubble file system watcher stream errors up to onError handlers", () => {
    const watcher = new FileWatcher(["./src"])
    const errorSpy = vi.fn()

    watcher.onError(errorSpy)
    watcher.start()

    const dummyError = new Error("Watch stream pipeline crashed")
    mockWatcherEmitter.emit("error", dummyError)

    expect(errorSpy).toHaveBeenCalledWith(dummyError)
  })

  it("should cleanly clean up all active abort controllers and clear timers on stop", () => {
    const watcher = new FileWatcher(["./src"])
    const changeSpy = vi.fn()

    watcher.onChange(changeSpy)
    watcher.start()

    mockWatcherEmitter.emit("change", "change", "index.tsx")
    watcher.stop()

    vi.advanceTimersByTime(100)
    expect(changeSpy).not.toHaveBeenCalled()
  })
})