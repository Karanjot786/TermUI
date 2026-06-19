// ─────────────────────────────────────────────────────
// @termuijs/ui — Rich Component Library
//
// The shadcn/ui for terminals — 16+ production-ready
// components for building beautiful CLI apps.
// ─────────────────────────────────────────────────────

// ── Re-exports from @termuijs/widgets (base components) ──
// Note: do not augment '@termuijs/widgets' here — it resolves to an untyped module.
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
    ContextMenu,
} from '@termuijs/widgets';

// ── New components ──
export { Slider, RangeInput } from './Slider.js';
export { Divider } from './Divider.js';
export type { DividerOptions } from './Divider.js';

export { ShortcutManager } from "./ShortcutManager.js";
export type { Shortcut as ShortcutManagerItem } from "./ShortcutManager.js";

export { NotificationHistory } from "./NotificationHistory.js";

export type {
    Notification as NotificationHistoryItem,
    NotificationType
} from "./NotificationHistory.js";

export { Spacer } from './Spacer.js';

export { Tabs } from './Tabs.js';
export type { Tab, TabsOptions } from './Tabs.js';

export { MenuBar } from './MenuBar.js';
export type { MenuBarOptions, MenuBarItem, MenuItem as MenuBarItemType } from './MenuBar.js';

export { Menu } from './Menu.js';
export type { MenuItem, MenuOptions } from './Menu.js';

export { Carousel } from './Carousel.js';
export type { CarouselOptions } from './Carousel.js';

export { Modal } from './Modal.js';
export type { ModalOptions } from './Modal.js';

export { Drawer } from './Drawer.js';
export type { DrawerOptions, DrawerPosition } from './Drawer.js';

export { Select } from './Select.js';
export type { SelectOption, SelectOptions } from './Select.js';

export { Combobox } from './Combobox.js';
export type { ComboboxOption, ComboboxOptions } from './Combobox.js';

export { LinearPrompt } from './LinearPrompt.js';
export type { LinearPromptOption, LinearPromptOptions } from './LinearPrompt.js';

export { Pages } from './Pages.js';
export type { Page, PagesOptions } from './Pages.js';

export { ContentSwitcher } from './ContentSwitcher.js';

export { SnippetPrompt } from './SnippetPrompt.js';
export type { SnippetPromptOptions } from './SnippetPrompt.js';

export { MultiSelect } from './MultiSelect.js';
export type { MultiSelectOption, MultiSelectOptions } from './MultiSelect.js';

export { Transfer } from './Transfer.js';
export type { TransferItem, TransferOptions } from './Transfer.js';

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

export { useCommandPalette } from './hooks/useCommandPalette.js';
export type { UseCommandPaletteOptions, UseCommandPaletteReturn } from './hooks/useCommandPalette.js';

export { prompt, NonInteractiveError } from './prompts.js';
export type { TextPromptOptions, ConfirmPromptOptions, SelectPromptOptions } from './prompts.js';

export { NotificationCenter, NotificationStore, notifications, useNotifications } from './NotificationCenter.js';
export type { Notification, NotificationCenterOptions } from './NotificationCenter.js';

export { PasswordInput } from './PasswordInput.js';
export type { PasswordInputOptions } from './PasswordInput.js';

export { NumberInput } from './NumberInput.js';
export type { NumberInputOptions } from './NumberInput.js';

export { TagInput } from './TagInput.js';
export type { TagInputOptions } from './TagInput.js';

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

export { TimePicker } from './TimePicker.js';
export type { TimePickerOptions } from './TimePicker.js';

export { DateRangePicker } from './DateRangePicker.js';
export type { DateRange, DateRangePickerOptions } from './DateRangePicker.js';

export { ColorPicker } from './ColorPicker.js';
export type { ColorPickerOptions } from './ColorPicker.js';

export { Accordion } from './Accordion.js';
export type { AccordionOptions, AccordionItem } from './Accordion.js';

export { AppShell } from './AppShell.js';
export type { AppShellOptions } from './AppShell.js';
export { Pagination } from './Pagination.js';
export type { PaginationOptions } from './Pagination.js';

export { ScalePrompt } from './ScalePrompt.js';
export type { ScalePromptOptions } from './ScalePrompt.js';

export { SegmentedControl } from './SegmentedControl.js';
export type { SegmentedControlOptions } from './SegmentedControl.js';

export { SearchableSelect } from './SearchableSelect.js';
export type { SearchableSelectOption, SearchableSelectOptions } from './SearchableSelect.js';
export { Autocomplete, type AutocompleteOptions } from './Autocomplete.js';
export { Toggle } from './Toggle.js';
export type { ToggleOptions } from './Toggle.js';
export { Switch } from './Switch.js';
export type { SwitchOptions } from './Switch.js';
export { Checkbox } from './Checkbox.js';
export type { CheckboxOptions } from './Checkbox.js';

export { CheckboxGroup } from './CheckboxGroup.js';
export type {
    CheckboxGroupOption,
    CheckboxGroupOptions,
} from './CheckboxGroup.js';


export { ButtonGroup } from './ButtonGroup.js';
export type { ButtonGroupOptions, ButtonGroupItem } from './ButtonGroup.js';
export { Wizard } from './Wizard.js';
export type { WizardStep, WizardOptions } from './Wizard.js';
export { MultilineTextInput } from './MultilineTextInput.js';
export type { MultilineTextInputOptions } from './MultilineTextInput.js';
export { BasicAuthPrompt } from './BasicAuthPrompt.js';
export type { BasicAuthCredentials, BasicAuthPromptOptions } from './BasicAuthPrompt.js';

export { TextArea } from './TextArea.js';
export type { TextAreaOptions } from './TextArea.js';

export { Stepper } from './Stepper.js';
export type { StepperOptions } from './Stepper.js';

export { Announcer, announcer } from './Announcer.js';
export type { AnnouncerOptions, Politeness } from './Announcer.js';
export { ShortcutHelpOverlay } from './components/ShortcutHelpOverlay.js';
export type { Shortcut, ShortcutHelpOverlayProps } from './components/ShortcutHelpOverlay.js';

export { RadioGroup } from './RadioGroup.js';
export type { RadioGroupOption, RadioGroupOptions } from './RadioGroup.js';

export { Rating } from './Rating.js';
export type { RatingOptions } from './Rating.js';
export { ThemeSwitcher } from './ThemeSwitcher.js';
export type { ThemeSwitcherOptions } from './ThemeSwitcher.js';

export { TreeSelect } from './TreeSelect.js';
export type { TreeSelectNode, TreeSelectOptions } from './TreeSelect.js';
export { EmailInput } from './EmailInput.js';
export type { EmailInputOptions } from './EmailInput.js';

export { QuizPrompt } from './QuizPrompt.js';
export type { QuizPromptOptions, QuizQuestion, QuizResult } from './QuizPrompt.js';

export { EditablePrompt } from './EditablePrompt.js';
export type {
    EditablePromptChoice,
    EditablePromptResult,
    EditablePromptOptions,
} from './EditablePrompt.js';


export { SurveyPrompt } from './SurveyPrompt.js';
export type { SurveyPromptOptions, SurveyQuestion } from './SurveyPrompt.js';

export { Breadcrumb } from './Breadcrumb.js';
export type { BreadcrumbItem, BreadcrumbOptions } from './Breadcrumb.js';


export { Disclosure } from './Disclosure.js';
export type { DisclosureOptions } from './Disclosure.js';

export { Listbar } from './Listbar.js';
export type { ListbarOptions, ListbarItem } from './Listbar.js';

export { validateInput } from './validation.js';
export type { InputValidator } from './validation.js';
export { Draggable, Droppable } from './components/DragAndDrop.js';
export type { DraggableProps, DroppableProps } from './components/DragAndDrop.js';

export { Popover } from './Popover.js';
export type { PopoverOptions, PopoverPlacement } from './Popover.js';

export { FormBuilder, useForm } from './components/FormBuilder.js';
export type { FormBuilderProps } from './components/FormBuilder.js';

export { SearchInput } from './SearchInput.js';
export type { SearchInputOptions } from './SearchInput.js';

// -- External Theme / Stylesheet Engine --
export * from '@termuijs/tss';

export type { VimMode } from './vim_modes.js';

export { ChatThread } from './ChatThread.js';
export type { ChatThreadOptions } from './ChatThread.js';
export { TokenUsage } from './TokenUsage.js';
export type { TokenUsageOptions } from './TokenUsage.js';

export { SearchPanel } from "./SearchPanel.js";
export type { SearchPanelOptions } from "./SearchPanel.js";