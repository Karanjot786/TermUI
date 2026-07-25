import { describe, expect, it } from 'vitest';
import { Text } from '@termuijs/widgets';
import { getByLabel, getByRole, queryByText } from './index.js';

function createWidgetTree() {
  const root = new Text('root');
  const heading = new Text('Welcome');
  const button = new Text('Save');
  const field = new Text('Email');

  Object.assign(heading, { role: 'heading' });
  Object.assign(button, { role: 'button', label: 'save-action' });
  Object.assign(field, { label: 'email-field' });

  root.addChild(heading);
  root.addChild(button);
  button.addChild(field);

  return { root, button, field, heading };
}

describe('query helpers', () => {
  it('finds the first descendant widget by role', () => {
    const { root, button } = createWidgetTree();

    expect(getByRole(root, 'button')).toBe(button);
  });

  it('finds the first descendant widget by label', () => {
    const { root, field } = createWidgetTree();

    expect(getByLabel(root, 'email-field')).toBe(field);
  });

  it('returns the first matching text widget', () => {
    const { root, button } = createWidgetTree();

    expect(queryByText(root, 'Save')).toBe(button);
  });

  it('returns null when no text match exists', () => {
    const { root } = createWidgetTree();

    expect(queryByText(root, 'missing')).toBeNull();
  });

  it('throws descriptive errors when no role or label matches exist', () => {
    const { root } = createWidgetTree();

    expect(() => getByRole(root, 'missing-role')).toThrow('Unable to find widget with role "missing-role"');
    expect(() => getByLabel(root, 'missing-label')).toThrow('Unable to find widget with label "missing-label"');
  });
});
