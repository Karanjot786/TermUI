/** @jsxImportSource @termuijs/jsx */

import { describe, it, expect } from "vitest"
import { render } from "./render.js"
import { Text, Box, Widget } from "@termuijs/widgets"
import { useInput, useState } from "@termuijs/jsx"

function Hello() {
  return <Text>Hello World</Text>
}

function MultiText() {
  return (
    <Box>
      <Text>One</Text>
      <Text>Two</Text>
      <Text>Three</Text>
    </Box>
  )
}

function InputComponent() {
  const [value, setValue] = useState("")

  useInput((input: string) => {
    setValue((prev: string) => prev + input)
  })

  return <Text>{value}</Text>
}

function Counter() {
  const [count, setCount] = useState(0)

  useInput((input: string) => {
    if (input === "+") {
      setCount((prev: number) => prev + 1)
    }
  })

  return <Text>Count: {count}</Text>
}

function Label(props: { text: string }) {
  return <Text>{props.text}</Text>
}

class FakeWidget extends Widget {}

describe("render harness", () => {
  describe("getByText", () => {
    it("returns a matching widget", () => {
      const screen = render(<Hello />)

      expect(screen.getByText("Hello")).toBeTruthy()
      expect(screen.getByText("World")).toBeTruthy()
    })

    it("returns null on miss", () => {
      const screen = render(<Hello />)

      expect(screen.getByText("Missing")).toBeNull()
    })
  })

  describe("getAllByText", () => {
    it("returns all matching widgets", () => {
      const screen = render(<MultiText />)

      const matches = screen.getAllByText("o")

      expect(matches.length).toBeGreaterThan(0)
    })

    it("returns an empty array on miss", () => {
      const screen = render(<MultiText />)

      const matches = screen.getAllByText("Missing")

      expect(matches).toEqual([])
    })
  })

  describe("getAllByType", () => {
    it("returns all widgets of a given type", () => {
      const screen = render(<MultiText />)

      const textWidgets = screen.getAllByType(Text)

      expect(textWidgets.length).toBe(3)
    })

    it("returns an empty array on miss", () => {
      const screen = render(<MultiText />)

      const widgets = screen.getAllByType(FakeWidget)

      expect(widgets).toEqual([])
    })
  })

  describe("fireKey", () => {
    it("delivers key events to rendered components", () => {
      const screen = render(<Counter />)

      expect(screen.renderToString()).toContain("Count: 0")

      screen.fireKey("+")

      expect(screen.renderToString()).toContain("Count: 1")
    })
  })

  describe("typeText", () => {
    it("types text into the component", () => {
      const screen = render(<InputComponent />)

      screen.typeText("hello")

      expect(screen.renderToString()).toContain("hello")
    })
  })

  describe("rerender", () => {
    it("updates the output after a prop change", () => {
      const screen = render(<Label text="Before" />)

      expect(screen.renderToString()).toContain("Before")

      screen.rerender(<Label text="After" />)

      expect(screen.renderToString()).toContain("After")
    })
  })

  describe("waitFor", () => {
    it("waits for assertions to pass", async () => {
      const screen = render(<Counter />)

      setTimeout(() => {
        screen.fireKey("+")
      }, 20)

      await screen.waitFor(() => {
        expect(screen.renderToString()).toContain("Count: 1")
      })
    })

    it("throws on timeout", async () => {
      const screen = render(<Hello />)

      await expect(
        screen.waitFor(
          () => {
            expect(screen.getByText("Never")).toBeTruthy()
          },
          {
            timeout: 50,
            interval: 10,
          },
        ),
      ).rejects.toThrow("waitFor timed out")
    })
  })

  describe("renderToString", () => {
    it("renders the screen buffer as a string", () => {
      const screen = render(<Hello />)

      const output = screen.renderToString()

      expect(output).toContain("Hello World")
    })
  })

  describe("lastFrame", () => {
    it("returns the last rendered frame", () => {
      const screen = render(<Hello />)

      const frame = screen.lastFrame()

      expect(Array.isArray(frame)).toBe(true)
      expect(frame.join("\n")).toContain("Hello World")
    })
  })

  describe("toString", () => {
    it("returns rendered output as a string", () => {
      const screen = render(<Hello />)

      expect(screen.toString()).toContain("Hello World")
    })
  })

  describe("unmount", () => {
    it("unmounts cleanly without crashing", () => {
      const screen = render(<Hello />)

      expect(() => {
        screen.unmount()
      }).not.toThrow()
    })

    it("does not throw after unmount when firing keys", () => {
      const server = render(<Counter />)

      server.unmount()

      expect(() => {
        server.fireKey("+")
      }).not.toThrow()
    })
  })
})