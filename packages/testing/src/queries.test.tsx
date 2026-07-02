/** @jsxImportSource @termuijs/jsx */

import { describe, expect, it } from "vitest";
import { Box, Text } from "@termuijs/widgets";
import { render } from "./render.js";
import { getByRole, getByLabel, queryByText } from "./queries.js";

function Hello() {
  return <text>Hello World</text>;
}
function FakeA11yWidget(props: { role?: string; label?: string }) {
  const box = new Box();

  if (props.role !== undefined) {
    Reflect.set(box, "role", props.role);
  }

  if (props.label !== undefined) {
    Reflect.set(box, "label", props.label);
  }

  return box;
}

describe("queries helpers", () => {
  it("getByRole finds matching widget", () => {
    const screen = render(<FakeA11yWidget role="button" />);

    const widget = getByRole(screen.container, "button");

    expect(widget).toBeTruthy();
    expect(Reflect.get(widget, "role")).toBe("button");
  });

  it("getByRole throws when missing", () => {
    const screen = render(<FakeA11yWidget role="button" />);

    expect(() => {
      getByRole(screen.container, "link");
    }).toThrow();
  });

  it("getByLabel finds matching widget", () => {
    const screen = render(<FakeA11yWidget label="Email" />);

    const widget = getByLabel(screen.container, "Email");

    expect(widget).toBeTruthy();
    expect(Reflect.get(widget, "label")).toBe("Email");
  });

  it("getByLabel throws when missing", () => {
    const screen = render(<FakeA11yWidget label="Email" />);

    expect(() => {
      getByLabel(screen.container, "Password");
    }).toThrow();
  });

  it("queryByText returns widget when found", () => {
    const screen = render(<Hello />);

    const widget = queryByText(screen.container, "Hello");

    expect(widget).not.toBeNull();
  });

  it("queryByText returns null when missing", () => {
    const screen = render(<Hello />);

    const widget = queryByText(screen.container, "Missing");

    expect(widget).toBeNull();
  });
});