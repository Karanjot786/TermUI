import { Widget, Text } from "@termuijs/widgets";

/**
 * Traverses a widget tree recursively and returns all widgets
 * that satisfy the given predicate.
 */
function walkWidgets(
  root: Widget,
  predicate: (widget: Widget) => boolean,
): Widget[] {
  const result: Widget[] = [];
  const stack: Widget[] = [root];

  while (stack.length > 0) {
    const widget = stack.pop()!;

    if (predicate(widget)) {
      result.push(widget);
    }

    const children: Widget[] = [...(widget.children ?? [])];

    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }

  return result;
}

/**
 * Extracts text content from a Text widget.
 * Internal helper used by query functions.
 */
function getTextContent(widget: Widget): string {
  if (widget instanceof Text) {
    return (widget as any)._content ?? "";
  }

  return "";
}

/**
 * Finds the first widget with a matching role attribute.
 * Throws an error if no widget is found.
 */
export function getByRole(tree: Widget, role: string): Widget {
  const match = walkWidgets(
    tree,
    (widget) => Reflect.get(widget, "role") === role,
  )[0];

  if (!match) {
    throw new Error(`Unable to find widget with role "${role}"`);
  }

  return match;
}

/**
 * Finds the first widget with a matching label attribute.
 * Throws an error if no widget is found.
 */
export function getByLabel(tree: Widget, label: string): Widget {
  const match = walkWidgets(
    tree,
    (widget) => Reflect.get(widget, "label") === label,
  )[0];

  if (!match) {
    throw new Error(`Unable to find widget with label "${label}"`);
  }

  return match;
}

/**
 * Queries a widget by matching text content (partial match).
 * Returns null if no widget matches.
 */
export function queryByText(
  tree: Widget,
  text: string,
): Widget | null {
  const match = walkWidgets(tree, (widget) => {
    if (widget instanceof Text) {
      return getTextContent(widget).includes(text);
    }
    return false;
  })[0];

  return match ?? null;
}