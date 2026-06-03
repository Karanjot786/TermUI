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

export { MenuBar } from './MenuBar.js';
export type { MenuBarOptions, MenuBarItem, MenuItem } from './MenuBar.js';

export { Carousel } from './Carousel.js';
export type { CarouselOptions } from './Carousel.js';

export { Modal } from './Modal.js';
export type { ModalOptions } from './Modal.js';

export { Drawer } from './Drawer.js';
export type { DrawerOptions, DrawerPosition } from './Drawer.js';

export { Select } from './Select.js';
export type { SelectOption, SelectOptions } from './Select.js';

export { LinearPrompt } from './LinearPrompt.js';
export type { LinearPromptOption, LinearPromptOptions } from './LinearPrompt.js';

export { Pages } from './Pages.js';
export type { Page, PagesOptions } from './Pages.js';

export { ContentSwitcher } from './ContentSwitcher.js';

export { SnippetPrompt } from './SnippetPrompt.js';
export type { SnippetPromptOptions } from './SnippetPrompt.js';

export { MultiSelect } from './MultiSelect.js';
export type { MultiSelectOption, MultiSelectOptions } from './MultiSelect.js';

export { Tree } from './Tree.js';
export type { TreeNode, TreeOptions } from './Tree.js';

export { SortPrompt } from './SortPrompt.js';
export type { SortPromptOptions } from './SortPrompt.js';

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

export { MaskedInput } from './MaskedInput.js';
export type { MaskedInputOptions } from './MaskedInput.js';

export { PathInput } from './PathInput.js';
export type { PathInputOptions } from './PathInput.js';

export { KeyboardShortcuts } from './KeyboardShortcuts.js';
export type { ShortcutBinding, KeyboardShortcutsOptions } from './KeyboardShortcuts.js';

export { FilePicker } from './FilePicker.js';
export type { FilePickerOptions, FileEntry } from './FilePicker.js';

export { DatePicker } from './DatePicker.js';
export type { DatePickerOptions } from './DatePicker.js';

export { ColorPicker } from './ColorPicker.js';
export type { ColorPickerOptions } from './ColorPicker.js';

export { Accordion } from './Accordion.js';
export type { AccordionOptions, AccordionItem } from './Accordion.js';

export { AppShell } from './AppShell.js';
export type { AppShellOptions } from './AppShell.js';
export { Pagination } from './Pagination.js';
export type { PaginationOptions } from './Pagination.js';
export { Toggle } from './Toggle.js';
export type { ToggleOptions } from './Toggle.js';
export { Checkbox } from './Checkbox.js';
export type { CheckboxOptions } from './Checkbox.js';

export { CheckboxGroup } from './CheckboxGroup.js';
export type {
    CheckboxGroupOption,
    CheckboxGroupOptions,
} from './CheckboxGroup.js';
export { SegmentedControl } from './SegmentedControl.js';
export type { SegmentedControlOptions } from './SegmentedControl.js';

export { Wizard } from './Wizard.js';
export type { WizardStep, WizardOptions } from './Wizard.js';
export { MultilineTextInput } from './MultilineTextInput.js';
export type { MultilineTextInputOptions } from './MultilineTextInput.js';


export { Stepper } from './Stepper.js';
export type { StepperOptions } from './Stepper.js';
