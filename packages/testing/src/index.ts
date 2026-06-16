// ─────────────────────────────────────────────────────
// @termuijs/testing — Public API
// ─────────────────────────────────────────────────────

// ── Render ──
export { createFixture, render } from './render.js';
export type { Fixture, TestInstance, TestRenderOptions } from './render.js';

// ── Virtual Clock ──
export { createVirtualClock } from './virtual-clock.js';
export type { VirtualClock } from '@termuijs/motion';
export { frameSerializer, formatFrame } from './frame-serializer.js';
export { getByRole, getByLabel, queryByText } from "./queries.js";

// ── Snapshots ──
export { SnapshotReporter, diffSnapshots } from './diff.js';
