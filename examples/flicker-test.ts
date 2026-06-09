// ─────────────────────────────────────────────────────
// TermUI — Main Batching / Render Loop Scheduler
// ─────────────────────────────────────────────────────

/**
 * Queues a render pass for the next event loop tick.
 * Ensures high-frequency mutations are batched together.
 * @param {Object} context - The application or renderer instance context
 */
export function queueUpdate(context) {
  if (!context) return;

  // Use a cross-environment scheduling approach
  // If setImmediate is missing from global scope, fallback safely to setTimeout macro-task
  const scheduler = typeof setImmediate !== 'undefined' 
    ? setImmediate 
    : (cb) => setTimeout(cb, 0);

  scheduler(() => {
    // 1. Execute the deferred render pipeline first
    if (typeof context.render === 'function') {
      context.render();
    }

    // 2. Clear dirty flags ONLY after the render pass has safely executed
    if (typeof context.clearDirty === 'function') {
      context.clearDirty();
    }
  });
}