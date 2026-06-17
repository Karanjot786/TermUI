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
}

export function FormBuilder({ onSubmit, children }: FormBuilderProps) {
    const value = {
        submit: () => {
            if (onSubmit) onSubmit();
        }
    };
    return createElement(FormContext.Provider, { value }, children);
}

export function useForm() {
    return useContext(FormContext);
}
