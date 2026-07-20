// ─────────────────────────────────────────────────────
// @termuijs/quick — Public API
// ─────────────────────────────────────────────────────

// ── Builder ───────────────────────────────────────────
export { app, AppBuilder } from './app.js';

// ── Layout ────────────────────────────────────────────
export { row, col, grid, stack, spacer, toWidget } from './layout.js';
export type { LayoutChild } from './layout.js';

// ── Widget Shorthands ─────────────────────────────────
export {
    text,
    gauge,
    table,
    list,
    input,
    sparkline,
    status,
    logView,
    // Sprint 1.5/2 additions
    tree,
    skeleton,
    gridWidget,
    barChart,
    progressBar,
    spinner,
    // Sprint 3 additions
    jsonView,
    diffView,
    streamingText,
    chatMessage,
    toolCall,
    commandPalette,
    multiProgress,
} from './widgets.js';

export type {
    QuickTextOptions,
    QuickGaugeOptions,
    QuickTableRow,
    QuickListOptions,
    QuickInputOptions,
    QuickSparklineOptions,
    QuickStatusOptions,
    QuickLogViewOptions,
    // Sprint 1.5/2 additions
    QuickTreeOptions,
    QuickSkeletonOptions,
    QuickGridOptions,
    QuickBarChartOptions,
    QuickProgressBarOptions,
    QuickSpinnerOptions,
    TreeNode,
    BarGroup,
    BarChartOptions,
    // Sprint 3 additions
    QuickJSONViewOptions,
    QuickDiffViewOptions,
    QuickToolCallOptions,
    QuickCommand,
    DiffLine,
    ToolCallStatus,
} from './widgets.js';

// ── Store (re-exported for convenience) ───────────────
export { batch } from '@termuijs/store';

// ── Reactive ──────────────────────────────────────────
export { resolve, isReactive } from './reactive.js';
export type { Reactive } from './reactive.js';

// ── JSX Hooks (re-exported for convenience) ───────────
export {
    useAsync,
    useKeymap,
    useMotion,
} from '@termuijs/jsx';
export type { AsyncState, KeyBinding, MotionPreferences } from '@termuijs/jsx';

// ── Notification Hook (from @termuijs/ui) ─────────────
export { useNotifications } from '@termuijs/ui';
export type { Notification } from '@termuijs/ui';

// ── Theme Hook (from @termuijs/tss) ───────────────────
export { useTheme } from '@termuijs/tss';

// ── Data Hooks (from @termuijs/data) ──────────────────
export {
    useCpu,
    useMemory,
    useDisk,
    useNetwork,
    useTopProcesses,
    useSystemInfo,
    useHttpHealth,
} from '@termuijs/data';
export type {
    CpuMetrics,
    MemoryMetrics,
    DiskMetrics,
    NetworkMetrics,
    SystemInfo,
} from '@termuijs/data';
