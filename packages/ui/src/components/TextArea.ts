import { createElement } from '@termuijs/jsx';

export interface TextAreaProps {
    value?: string;
    onChange?: (value: string) => void;
    width?: number | string;
    height?: number | string;
}

export function TextArea({ value = '', onChange, width, height }: TextAreaProps) {
    return createElement(
        'text',
        {
            style: {
                width,
                height,
                border: 'single',
                overflow: 'scroll'
            }
        },
        value
    );
}
