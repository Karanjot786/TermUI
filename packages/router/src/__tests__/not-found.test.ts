// packages/router/src/__tests__/not-found.test.ts
// Tests for Issue #2120 — 404 fallback behavior
import { describe, it, expect } from 'vitest';
import { render } from '@termuijs/testing';
import { Router } from '../Router';
import { Text } from '@termuijs/widgets';

// ── Minimal test screens ──────────────────────────────────────────────────────
function HomeScreen() { return <Text>Home Screen</Text>; }
function AboutScreen() { return <Text>About Screen</Text>; }
// ─────────────────────────────────────────────────────────────────────────────

const baseConfig = {
  routes: [
    { path: '/', component: HomeScreen },
    { path: '/about', component: AboutScreen },
  ],
};

describe('Router: notFound fallback (Issue #2120)', () => {

  it('renders the matched component for a registered route', () => {
    const t = render(
      <Router config={{ ...baseConfig, initialRoute: '/' }} />
    );
    expect(t.getByText('Home Screen')).toBeTruthy();
    t.unmount();
  });

  it('renders DefaultNotFound for an unregistered route', () => {
    const t = render(
      <Router config={{ ...baseConfig, initialRoute: '/does-not-exist' }} />
    );
    // DefaultNotFound must show the "Route Not Found" title
    expect(t.getByText('Route Not Found')).toBeTruthy();
    // And must display the unmatched path
    expect(t.getByText('/does-not-exist')).toBeTruthy();
    t.unmount();
  });

  it('renders a custom notFound component when config.notFound is provided', () => {
    function CustomNotFound({ path }: { path: string }) {
      return <Text>Custom 404 for {path}</Text>;
    }

    const t = render(
      <Router config={{
        ...baseConfig,
        initialRoute: '/unknown',
        notFound: CustomNotFound,
      }} />
    );
    expect(t.getByText('Custom 404 for /unknown')).toBeTruthy();
    // Confirm the default NotFound is NOT shown
    expect(() => t.getByText('Route Not Found')).toThrow();
    t.unmount();
  });

  it('shows correct unmatched path in DefaultNotFound after navigate()', async () => {
    const t = render(
      <Router config={{ ...baseConfig, initialRoute: '/' }} />
    );

    // Navigate to a route that doesn't exist
    t.navigate('/settings/profile/missing');

    await t.waitFor(() => {
      expect(t.getByText('Route Not Found')).toBeTruthy();
      expect(t.getByText('/settings/profile/missing')).toBeTruthy();
    });
    t.unmount();
  });

  it('DefaultNotFound renders the help text with key hints', () => {
    const t = render(
      <Router config={{ ...baseConfig, initialRoute: '/not-real' }} />
    );
    // The help text line must be visible
    expect(t.getByText('Press Backspace to go back · Press Q to quit')).toBeTruthy();
    t.unmount();
  });
});