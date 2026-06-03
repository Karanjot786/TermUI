// ─────────────────────────────────────────────────────
// @termuijs/widgets — Public API
// ─────────────────────────────────────────────────────

// ── Base ──────────────────────────────────────────────
export { Widget } from './base/Widget.js';
export type { WidgetEvents } from './base/Widget.js';

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
export { ToolCall, ToolApproval } from './display/ToolCall.js';
export type { ToolCallOptions, ToolApprovalOptions, ToolCallStatus } from './display/ToolCall.js';

// ── Virtual Scroll Helpers ────────────────────────────
export { computeRange, computeVariableRange } from './input/virtual-scroll.js';
export type { ScrollRange } from './input/virtual-scroll.js';

// ── Input Widgets ─────────────────────────────────────
export { List } from './input/List.js';
export type { ListItem } from './input/List.js';
export { TextInput } from './input/TextInput.js';
export { VirtualList } from './input/VirtualList.js';
export type { VirtualListOptions } from './input/VirtualList.js';
export { CommandPalette } from './input/CommandPalette.js';
export type { Command, CommandPaletteOptions } from './input/CommandPalette.js';

// ── Data Widgets ──────────────────────────────────────
export { Table } from './data/Table.js';
export type { TableColumn, TableRow, TableOptions } from './data/Table.js';
export { Gauge } from './data/Gauge.js';
export type { GaugeOptions } from './data/Gauge.js';
export { LineGauge } from './data/LineGauge.js';
export type { LineGaugeOptions } from './data/LineGauge.js';
export { Calendar } from './data/Calendar.js';
export type { CalendarOptions } from './data/Calendar.js';
export { Sparkline } from './data/Sparkline.js';
export type { SparklineOptions } from './data/Sparkline.js';
export { StatusIndicator } from './data/StatusIndicator.js';
export type { StatusIndicatorOptions } from './data/StatusIndicator.js';
export { BarChart } from './data/BarChart.js';
export type { Bar, BarGroup, BarChartDirection, BarChartOptions } from './data/BarChart.js';

// ── Layout Widgets ────────────────────────────────────
export { Grid } from './layout/Grid.js';
export type { GridOptions } from './layout/Grid.js';
export { ScrollView } from './layout/ScrollView.js';
export type { ScrollViewOptions } from './layout/ScrollView.js';
export { Center } from './layout/Center.js';
export type { CenterOptions } from './layout/Center.js';
export { Card } from './layout/Card.js';
export type { CardOptions } from './layout/Card.js';
export { Columns } from './layout/Columns.js';
export type { ColumnsOptions } from './layout/Columns.js';

// ── Feedback Widgets ──────────────────────────────────
export { ProgressBar } from './feedback/ProgressBar.js';
export type { ProgressBarOptions } from './feedback/ProgressBar.js';
export { MultiProgress } from './feedback/MultiProgress.js';
export type { ProgressItem, MultiProgressOptions } from './feedback/MultiProgress.js';
export { Spinner, SPINNER_FRAMES } from './feedback/Spinner.js';
export type { SpinnerOptions } from './feedback/Spinner.js';
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

// ── New Display Widgets ───────────────────────────────
export { BigText } from './display/BigText.js';
export type { BigTextOptions } from './display/BigText.js';
export { Gradient } from './display/Gradient.js';
export type { GradientOptions } from './display/Gradient.js';

export { Markdown } from './display/Markdown.js';
export type { MarkdownOptions } from './display/Markdown.js';
export { Badge } from './display/Badge.js';
export type { BadgeOptions, BadgeVariant } from './display/Badge.js';
export { Tag } from './display/Tag.js';
export type { TagOptions, TagVariant } from './display/Tag.js';
export { NotificationBadge } from './display/NotificationBadge.js';
export type { NotificationBadgeOptions, BadgePosition } from './display/NotificationBadge.js';

export { Tooltip } from './display/Tooltip.js';
export type { TooltipOptions } from './display/Tooltip.js';

export { Panel } from './layout/Panel.js';
export { Clock } from './display/Clock.js';
export type { ClockOptions } from './display/Clock.js';

export { QRCodePattern, QRCode } from './display/QRCode.js';
export type { QRCodePatternOptions, QRCodeOptions } from './display/QRCode.js';
export { Stack } from './layout/Stack.js';
export type { StackOptions } from './layout/Stack.js';
export { ScatterPlot } from './data/ScatterPlot.js';
export type { ScatterPlotOptions, ScatterPoint } from './data/ScatterPlot.js';
export { RadarChart } from './data/RadarChart.js';
export type { RadarChartOptions, RadarSeries } from './data/RadarChart.js';

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