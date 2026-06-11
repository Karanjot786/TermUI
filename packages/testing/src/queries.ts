import { Widget, Text } from "@termuijs/widgets";

/**
 * Depth-first traversal of widget tree.
 * Collects all widgets matching the predicate.
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
 * Safely extracts text content from a Text widget using public API.
 */
function getTextContent(widget: Widget): string {
  if (widget instanceof Text) {
    return widget.getContent?.() ?? "";
  }
  return "";
}

/**
 * Finds the first widget with a matching role.
 * Throws if no matching widget exists.
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
 * Finds the first widget with a matching label.
 * Throws if no matching widget exists.
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
 * Queries widget tree for text match (partial match supported).
 * Returns first match or null if not found.
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