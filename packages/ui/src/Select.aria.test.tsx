import { describe, it, expect } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import React from "react";
import { Select } from "./Select";

const options = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
];

describe("Select -- ARIA attributes", () => {
  it("should set aria-expanded=false when closed", () => {
    render(<Select options={options} value="a" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("should set aria-expanded=true when open", () => {
    render(<Select options={options} value="a" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("should set aria-haspopup=listbox on the combobox", () => {
    render(<Select options={options} value="a" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-haspopup", "listbox");
  });

  it("should set aria-selected=true on the active option", () => {
    render(<Select options={options} value="b" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox"));
    const opts = screen.getAllByRole("option");
    expect(opts[1]).toHaveAttribute("aria-selected", "true");
    expect(opts[0]).toHaveAttribute("aria-selected", "false");
  });
});
