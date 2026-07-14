// ─────────────────────────────────────────────────────
// @termuijs/widgets — Public API
// ─────────────────────────────────────────────────────

// ── Base ──────────────────────────────────────────────
export { Widget, _resetWidgetIdCounter } from './base/Widget.js';
export type { WidgetEvents } from './base/Widget.js';
export type { RenderStats } from './base/Widget.js';

// ── Display Widgets ───────────────────────────────────
export { Box } from './display/Box.js';
export { Text } from './display/Text.js';
export type { TextProps } from './display/Text.js';
export { LogView } from './display/LogView.js';
export type { LogViewOptions } from './display/LogView.js';
export { Tree } from './display/Tree.js';
export type { TreeNode, TreeOptions } from './display/Tree.js';
export { JSONView, jsonToTree } from './display/JSONView.js';
export type { JSONViewOptions, JSONNodeData, JSONNodeType } from './display/JSONView.js';
export { DiffView } from './display/DiffView.js';
export type { DiffLine, DiffViewOptions } from './display/DiffView.js';
export { StreamingText } from './display/StreamingText.js';
export type { StreamingTextOptions } from './display/StreamingText.js';
export { ChatMessage } from './display/ChatMessage.js';
export type { ChatMessageOptions, MessageRole } from './display/ChatMessage.js';
export { ChatThread } from './display/ChatThread.js';
export type { ThreadMessage } from './display/ChatThread.js';
export { TypingIndicator } from './display/TypingIndicator.js';
export type { TypingIndicatorOptions } from './display/TypingIndicator.js';
export { ToolCall, ToolApproval } from './display/ToolCall.js';
export type { ToolCallOptions, ToolApprovalOptions, ToolCallStatus } from './display/ToolCall.js';
export { Canvas } from './display/Canvas.js';
export { FPSCounter } from './display/FPSCounter.js';
export type { FPSCounterOptions } from './display/FPSCounter.js';
export { Pty } from './display/Pty.js';
export type { PtyOptions } from './display/Pty.js';
export { PerformanceOverlay } from './display/PerformanceOverlay.js';

// ── Virtual Scroll Helpers ────────────────────────────
export { computeRange, computeVariableRange } from './input/virtual-scroll.js';
export type { ScrollRange } from './input/virtual-scroll.js';

// ── Spring Scroll Helper ─────────────────────────────
export { calculateSpringScroll } from './scroll.js';
export type { ScrollSpringState } from './scroll.js';

// ─────────────────────────────────────────────────────



// ── Input Widgets ─────────────────────────────────────
export { List } from './input/List.js';
export type { ListItem, ListProps } from './input/List.js';
export { useListState } from './data/ListState.js';
export type { ListState } from './data/ListState.js';
export { VirtualList } from './input/VirtualList.js';
export type { VirtualListOptions } from './input/VirtualList.js';
export { CommandPalette } from './input/CommandPalette.js';
export type { Command, CommandPaletteOptions } from './input/CommandPalette.js';
export { Button } from './input/Button.js';
export type { ButtonOptions, ButtonVariant } from './input/Button.js';
export { Checkbox } from './input/Checkbox.js';
export type { CheckboxOptions } from './input/Checkbox.js';

export { Slider } from "./input/Slider.js";
export type { SliderOptions } from "./input/Slider.js";
export { RangeInput } from "./input/RangeInput.js";
export type { RangeInputOptions } from "./input/RangeInput.js";
export { TextInput } from './input/TextInput.js';
export type { VimMode } from './input/vim.js';
export { Knob } from "./input/Knob.js";
export type { KnobOptions } from "./input/Knob.js";
export { PinInput } from "./input/PinInput.js";
export type { PinInputOptions } from "./input/PinInput.js";
export { ContextMenu } from './input/ContextMenu.js';
export type { ContextMenuItem } from './input/ContextMenu.js';
export { FileExplorer } from './FileExplorer.js';
export type { FileExplorerOptions, FileItem } from './FileExplorer.js';

// ── Data Widgets ──────────────────────────────────────
export { Table } from './data/Table.js';
export type { TableColumn, TableRow, TableOptions, TableProps } from './data/Table.js';
export { useTableState } from './data/TableState.js';
export type { TableState } from './data/TableState.js';
export { TreeTable } from './data/TreeTable.js';
export type { TreeTableColumn, TreeTableRow, TreeTableOptions } from './data/TreeTable.js';
export { Gauge } from './data/Gauge.js';
export type { GaugeOptions } from './data/Gauge.js';
export { LineGauge } from './data/LineGauge.js';
export type { LineGaugeOptions } from './data/LineGauge.js';
export { Meter } from './data/Meter.js';
export type { MeterOptions } from './data/Meter.js';
export { BrailleCanvas } from './data/BrailleCanvas.js';
export type { BrailleCanvasOptions } from './data/BrailleCanvas.js';
export { Calendar } from './data/Calendar.js';
export type { CalendarOptions } from './data/Calendar.js';
export { Sparkline } from './data/Sparkline.js';
export type { SparklineOptions } from './data/Sparkline.js';
export { StatusIndicator } from './data/StatusIndicator.js';
export type { StatusIndicatorOptions } from './data/StatusIndicator.js';
export { BarChart } from './data/BarChart.js';
export type { Bar, BarGroup, BarChartDirection, BarChartOptions } from './data/BarChart.js';

export { Histogram } from './data/Histogram.js';
export type { HistogramOptions } from './data/Histogram.js';

export { StackedBarChart } from './data/StackedBarChart.js';
export type { StackedBarChartOptions, StackedSeries } from './data/StackedBarChart.js';

export { GanttChart } from './data/GanttChart.js';
export type { GanttChartOptions, GanttTask } from './data/GanttChart.js';

// ── Layout Widgets ────────────────────────────────────
export { Grid, GridItem } from './layout/Grid.js';
export type { GridOptions, GridItemOptions } from './layout/Grid.js';
export { ScrollView } from './layout/ScrollView.js';
export type { ScrollViewOptions } from './layout/ScrollView.js';
export { Center } from './layout/Center.js';
export type { CenterOptions } from './layout/Center.js';
export { Card } from './layout/Card.js';
export type { CardOptions } from './layout/Card.js';
export { Masonry } from './layout/Masonry.js';
export type { MasonryOptions } from './layout/Masonry.js';
export { Columns } from './layout/Columns.js';
export type { ColumnsOptions } from './layout/Columns.js';
export { Dock } from './layout/Dock.js';
export type { DockOptions, DockItem, DockEdge } from './layout/Dock.js';
export { Divider } from './layout/Divider.js';
export type { DividerOptions, DividerOrientation } from './layout/Divider.js';
export { AspectRatio } from './layout/AspectRatio.js';
export type { AspectRatioOptions } from './layout/AspectRatio.js';
export { DraggableWidget, DroppableWidget, DragState } from './layout/DragAndDrop.js';
export type { DraggableOptions, DroppableOptions } from './layout/DragAndDrop.js';
export { Fill } from './layout/Fill.js';
export type { FillOptions } from './layout/Fill.js';
export { SplitPane } from './layout/SplitPane.js';
export type { SplitPaneOptions, SplitDirection } from './layout/SplitPane.js';

// ── Feedback Widgets ──────────────────────────────────
export { ProgressBar } from './feedback/ProgressBar.js';
export type { ProgressBarOptions } from './feedback/ProgressBar.js';
export { ProgressCircle } from './display/ProgressCircle.js';
export type { ProgressCircleOptions, ProgressCircleSize } from './display/ProgressCircle.js';
export { MultiProgress } from './feedback/MultiProgress.js';
export type { ProgressItem, MultiProgressOptions } from './feedback/MultiProgress.js';
export { Spinner, SPINNER_FRAMES } from './feedback/Spinner.js';
export type { SpinnerOptions } from './feedback/Spinner.js';
export { LoadingDots } from './feedback/LoadingDots.js';
export type { LoadingDotsOptions } from './feedback/LoadingDots.js';
export { TaskList } from './feedback/TaskList.js';
export type { TaskItem, TaskStatus, TaskListOptions } from './feedback/TaskList.js';
export { Scrollbar } from './feedback/Scrollbar.js';
export type { ScrollbarOrientation, ScrollbarOptions } from './feedback/Scrollbar.js';

export { Skeleton } from './feedback/Skeleton.js';
export type { SkeletonOptions } from './feedback/Skeleton.js';
export { StatusMessage } from './feedback/StatusMessage.js';
export type { StatusMessageOptions, StatusVariant } from './feedback/StatusMessage.js';
export { Banner } from './feedback/Banner.js';
export type { BannerOptions } from './feedback/Banner.js';
export { Alert } from './feedback/Alert.js';
export type { AlertOptions } from './feedback/Alert.js';

export { EmptyState } from './feedback/EmptyState.js';
export type { EmptyStateOptions } from './feedback/EmptyState.js';

export { Callout } from './feedback/Callout.js';
export type { CalloutVariant, CalloutOptions } from './feedback/Callout.js';

// ── New Data Widgets ──────────────────────────────────
export { KeyValue } from './data/KeyValue.js';
export type { KeyValuePair, KeyValueOptions } from './data/KeyValue.js';
export { Sidebar } from './data/Sidebar.js';
export type { SidebarItem, SidebarOptions } from './data/Sidebar.js';
export { LineChart } from './data/LineChart.js';
export type { LineChartOptions } from './data/LineChart.js';
export { AreaChart } from './data/AreaChart.js';
export type { AreaChartOptions } from './data/AreaChart.js';
export { HeatMap } from './data/HeatMap.js';
export type { HeatMapOptions } from './data/HeatMap.js';
export { Definition } from './data/Definition.js';
export type { DefinitionPair, DefinitionOptions } from './data/Definition.js';
export { Hexdump } from './data/Hexdump.js';
export type { HexdumpOptions } from './data/Hexdump.js';
export { BulletChart } from './data/BulletChart.js';
export type { BulletChartOptions, BulletRange } from './data/BulletChart.js';

// ── New Display Widgets ───────────────────────────────
export { Breadcrumbs } from './display/Breadcrumbs.js';
export type { BreadcrumbsOptions } from './display/Breadcrumbs.js';
export { Avatar } from './display/Avatar.js';
export type { AvatarOptions } from './display/Avatar.js';

export { BigText } from './display/BigText.js';
export type { BigTextOptions } from './display/BigText.js';
export { Gradient } from './display/Gradient.js';
export type { GradientOptions } from './display/Gradient.js';

export { Markdown } from './display/Markdown.js';
export type { MarkdownOptions } from './display/Markdown.js';
export { Code } from './display/Code.js';
export type { CodeOptions } from './display/Code.js';
export { Badge } from './display/Badge.js';
export type { BadgeOptions, BadgeVariant } from './display/Badge.js';
export { Kbd } from './display/Kbd.js';
export type { KbdOptions } from './display/Kbd.js';
export { Tag } from './display/Tag.js';
export type { TagOptions, TagVariant } from './display/Tag.js';
export { Placeholder } from './display/Placeholder.js';
export type { PlaceholderOptions } from './display/Placeholder.js';
export { Watermark } from './display/Watermark.js';
export type { WatermarkOptions } from './display/Watermark.js';
export { NotificationBadge } from './display/NotificationBadge.js';
export type { NotificationBadgeOptions, BadgePosition } from './display/NotificationBadge.js';

export { Carousel } from './display/Carousel.js';
export type { CarouselOptions } from './display/Carousel.js';

export { Tooltip } from './display/Tooltip.js';
export type { TooltipOptions } from './display/Tooltip.js';


export { Panel } from './layout/Panel.js';
export type { PanelOptions } from './layout/Panel.js';
export { Clock } from './display/Clock.js';
export type { ClockOptions } from './display/Clock.js';

export { Link } from './display/Link.js';
export type { LinkOptions } from './display/Link.js';

export { ShortcutBar } from './display/ShortcutBar.js';
export type { ShortcutItem, ShortcutBarOptions } from './display/ShortcutBar.js';

export { Accordion } from './display/Accordion.js';
export type { AccordionSection, AccordionOptions } from './display/Accordion.js';

export { Stepper } from './display/Stepper.js';
export type { StepperStep, StepperOptions, StepStatus, StepperOrientation } from './display/Stepper.js';


// ── Missing layout elements restored ──
export { QRCodePattern, QRCode } from './display/QRCode.js';
export type { QRCodePatternOptions, QRCodeOptions } from './display/QRCode.js';
export { Stack } from './layout/Stack.js';
export type { StackOptions } from './layout/Stack.js';
export { ScatterPlot } from './data/ScatterPlot.js';
export type { ScatterPlotOptions, ScatterPoint } from './data/ScatterPlot.js';
export { RadarChart } from './data/RadarChart.js';
export type { RadarChartOptions, RadarSeries } from './data/RadarChart.js';
export { Stat } from './data/Stat.js';
export type { StatOptions } from './data/Stat.js';

export { CandlestickChart } from './data/CandlestickChart.js';
export type { CandlestickChartOptions, Candle } from './data/CandlestickChart.js';
export { Timer } from './display/Timer.js';
export type { TimerOptions } from './display/Timer.js';
export { Stopwatch } from './display/Stopwatch.js';
export type { StopwatchOptions } from './display/Stopwatch.js';
export { OrderedList } from './display/OrderedList.js';
export type { OrderedListItem, OrderedListOptions } from './display/OrderedList.js';
export { Typewriter } from './display/Typewriter.js';
export type { TypewriterOptions } from './display/Typewriter.js';

export { Timeline } from './display/Timeline.js';
export type { TimelineItem, TimelineStatus } from './display/Timeline.js';

export { Marquee } from './display/Marquee.js';
export type { MarqueeDirection, MarqueeOptions } from './display/Marquee.js';
export { DataGrid } from './data/DataGrid.js';
export type { DataGridColumn, DataGridRow, DataGridOptions, SortDirection } from './data/DataGrid.js';
export { ScrollAcceleration } from './layout/scroll-acceleration.js';
export { PieChart } from './data/PieChart.js';
export type { PieSlice, PieChartOptions } from './data/PieChart.js';

export {
    BarColumn,
    TextColumn,
    TimeColumn,
    SpeedColumn,
    PercentageColumn,
} from './feedback/ProgressColumn.js';

export type {
    ProgressColumnDefinition,
    ProgressColumnProps,
} from './feedback/ProgressColumn.js';
export { Progress } from './feedback/Progress.js';


export type {
    ProgressProps,
    ProgressTask,
} from './feedback/Progress.js';
export * from './display/Highlight.js';

// ── Additional Display Widgets ────────────────────────
export { ThinkingBlock } from './display/ThinkingBlock.js';
export type { ThinkingBlockOptions } from './display/ThinkingBlock.js';
export { Collapsible } from './display/Collapsible.js';
export type { CollapsibleOptions } from './display/Collapsible.js';
export { Digits } from './display/Digits.js';
export type { DigitsOptions } from './display/Digits.js';
export { DirectoryTree } from './display/DirectoryTree.js';
export type { DirectoryTreeOptions } from './display/DirectoryTree.js';
export { UnorderedList } from './display/UnorderedList.js';
export type { UnorderedListOptions } from './display/UnorderedList.js';
export { Rule } from './display/Rule.js';
export type { RuleOrientation, RuleOptions } from './display/Rule.js';
