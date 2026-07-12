# Testing Best Practices

This guide outlines recommended practices for writing and maintaining tests in TermUI. Following these guidelines helps keep the test suite readable, reliable, and easy to maintain.

---

# General Guidelines

- Keep tests focused on a single behavior.
- Write descriptive test names.
- Avoid unnecessary duplication.
- Prefer readable tests over clever implementations.
- Keep tests deterministic and independent.

---

# Test Naming

Use clear, behavior-focused names.

Good examples:

```ts
test("renders the loading state")
test("increments the counter")
test("throws when value is invalid")
```

Avoid vague names such as:

```ts
test("works")
test("test")
test("check")
```

---

# Arrange–Act–Assert Pattern

Structure tests into three logical sections.

```ts
test("increments counter", () => {
    // Arrange
    const counter = createCounter()

    // Act
    counter.increment()

    // Assert
    expect(counter.value).toBe(1)
})
```

---

# Snapshot Testing

Use snapshot tests only for stable UI output.

```ts
const tree = render(<Counter />)

expect(tree.renderToString()).toMatchSnapshot()
```

Avoid snapshots for rapidly changing output.

---

# Async Testing

Always wait for asynchronous updates.

```ts
await screen.waitFor(() => {
    expect(screen.getByText("Loaded")).toBeTruthy()
})
```

Avoid arbitrary delays like:

```ts
await new Promise(resolve => setTimeout(resolve, 1000))
```

---

# Mocking

Mock only external dependencies.

Examples include:

- Network requests
- File system access
- Timers
- External APIs

Avoid mocking the functionality being tested.

---

# Test Organization

- Keep tests close to the implementation.
- Group related tests with `describe()`.
- Keep helper functions reusable.

Example:

```ts
describe("Button", () => {
    test("renders")

    test("handles click")

    test("supports disabled state")
})
```

---

# Best Practices Checklist

Before submitting a PR, ensure that your tests:

- Cover one behavior per test.
- Have descriptive names.
- Avoid flaky behavior.
- Use appropriate assertions.
- Pass consistently.
- Do not rely on execution order.

---

# Additional Resources

- Read the project's `CONTRIBUTING.md`
- Follow existing testing patterns within the repository.
- Use Vitest best practices when writing new tests.