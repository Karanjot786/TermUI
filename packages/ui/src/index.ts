// ─────────────────────────────────────────────────────
// @termuijs/ui — Rich Component Library
//
// The shadcn/ui for terminals — 16+ production-ready
// components for building beautiful CLI apps.
// ─────────────────────────────────────────────────────

// ── Re-exports from @termuijs/widgets (base components) ──
export {
    Box,
    Text,
    Table,
    List,
    TextInput,
    Gauge,
    Sparkline,
    StatusIndicator,
    LogView,
    ProgressBar,
    Spinner,
    Widget,
} from '@termuijs/widgets';

// ── New components ──
export { Divider } from './Divider.js';
export type { DividerOptions } from './Divider.js';

export { Spacer } from './Spacer.js';

export { Tabs } from './Tabs.js';
export type { Tab, TabsOptions } from './Tabs.js';

export { Modal } from './Modal.js';
export type { ModalOptions } from './Modal.js';

export { Select } from './Select.js';
export type { SelectOption, SelectOptions } from './Select.js';

export { MultiSelect } from './MultiSelect.js';
export type { MultiSelectOption, MultiSelectOptions } from './MultiSelect.js';

export { Tree } from './Tree.js';
export type { TreeNode, TreeOptions } from './Tree.js';

export { Toast } from './Toast.js';
export type { ToastType, ToastMessage, ToastOptions } from './Toast.js';

export { ConfirmDialog } from './ConfirmDialog.js';
export type { ConfirmDialogOptions } from './ConfirmDialog.js';

export { Form } from './Form.js';
export type { FormField, FormOptions } from './Form.js';

export { CommandPalette } from './CommandPalette.js';
export type { Command, CommandPaletteOptions } from './CommandPalette.js';

export { prompt, NonInteractiveError } from './prompts.js';
export type { TextPromptOptions, ConfirmPromptOptions, SelectPromptOptions } from './prompts.js';

export { NotificationCenter, NotificationStore, notifications, useNotifications } from './NotificationCenter.js';
export type { Notification, NotificationCenterOptions } from './NotificationCenter.js';

export { PasswordInput } from './PasswordInput.js';
export type { PasswordInputOptions } from './PasswordInput.js';

export { NumberInput } from './NumberInput.js';
export type { NumberInputOptions } from './NumberInput.js';

export { PathInput } from './PathInput.js';
export type { PathInputOptions } from './PathInput.js';

export { KeyboardShortcuts } from './KeyboardShortcuts.js';
export type { ShortcutBinding, KeyboardShortcutsOptions } from './KeyboardShortcuts.js';

export { FilePicker } from './FilePicker.js';
export type { FilePickerOptions, FileEntry } from './FilePicker.js';

export { AppShell } from './AppShell.js';
export type { AppShellOptions } from './AppShell.js';
export { Pagination } from './Pagination.js';
export type { PaginationOptions } from './Pagination.js';
