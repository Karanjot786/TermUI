import { Widget, Text } from "@termuijs/widgets";

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

    const children: Widget[] = (widget as any)._children ?? [];

    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }

  return result;
}

function getTextContent(widget: Widget): string {
  if (widget instanceof Text) {
    return (widget as any)._content ?? "";
  }

  return "";
}

export function getByRole(
  tree: Widget,
  role: string,
): Widget {
  const match = walkWidgets(
    tree,
    (widget) => Reflect.get(widget, "role") === role,
  )[0];

  if (!match) {
    throw new Error(`Unable to find widget with role "${role}"`);
  }

  return match;
}

export function getByLabel(
  tree: Widget,
  label: string,
): Widget {
  const match = walkWidgets(
    tree,
    (widget) => Reflect.get(widget, "label") === label,
  )[0];

  if (!match) {
    throw new Error(`Unable to find widget with label "${label}"`);
  }

  return match;
}

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