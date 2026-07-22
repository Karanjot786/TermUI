import { Widget, Text } from "@termuijs/widgets";

 /**
  * Depth-first traversal of a widget tree.
  * Returns all widgets that match the given predicate.
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
  * Extracts text content from a Text widget using public API.
  * Returns empty string if widget is not a Text node.
  */
function getTextContent(widget: Widget): string {
  if (widget instanceof Text) {
    return widget.getContent?.() ?? "";
  }
  return "";
}

 /**
  * Finds the first widget with a matching role attribute.
  * Throws an error if no matching widget is found.
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
  * Throws an error if no matching widget is found.
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
  * Searches widget tree for a widget containing matching text.
  * Returns first match or null if none found.
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