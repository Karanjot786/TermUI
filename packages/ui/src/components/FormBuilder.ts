import { createElement, createContext, useContext } from '@termuijs/jsx';
import type { VNode } from '@termuijs/jsx';

export interface FormContextValue {
    submit: () => void;
}

export const FormContext = createContext<FormContextValue>({
    submit: () => {},
});

export interface FormBuilderProps {
    onSubmit?: () => void;
    children?: VNode | VNode[];
    showResetButton?: boolean;
    resetButtonText?: string;
}

export function FormBuilder({ onSubmit,
   children,
   showResetButton = false,
   resetButtonText = "Reset"
 }: FormBuilderProps) {
    const value = {
        submit: () => {
            if (onSubmit) onSubmit();
        }
    };
    const allChildren = children
      ? (Array.isArray(children) ? children : [children])
      : [];

    if (showResetButton) {
      allChildren.push(
        createElement("button", {
          type: "reset"
        }, resetButtonText)
      );
    }
    return createElement(FormContext.Provider, { value }, allChildren);
}

export function useForm() {
    return useContext(FormContext);
}