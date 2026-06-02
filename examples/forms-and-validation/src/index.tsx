import { App, type KeyEvent } from '@termuijs/core';
import { Box, Text, Widget } from '@termuijs/widgets';
import { Form, NumberInput, PasswordInput, Modal } from '@termuijs/ui';

class FormsExampleApp extends Widget {
    private form: Form;
    private ageInput: NumberInput;
    private pwdInput: PasswordInput;
    private modal: Modal;
    
    private errorText: Text;
    
    // 0 = form, 1 = age, 2 = password
    private activeIndex = 0;
    
    constructor() {
        super({ flexDirection: 'column', padding: 1, gap: 1 });

        const title = new Text(' Forms & Validation Example ', {
            bold: true,
            fg: { type: 'named', name: 'cyan' },
        });

        // 1. Text Form
        this.form = new Form([
            { name: 'username', label: 'Username', type: 'text', required: true, validate: (v) => v.length < 3 ? 'Min 3 chars' : null },
            { name: 'email', label: 'Email', type: 'text', required: true, validate: (v) => !v.includes('@') ? 'Invalid email' : null },
        ], {
            onSubmit: () => this.trySubmit()
        });

        // 2. Number Input
        const ageBox = new Box({ flexDirection: 'row', height: 3, gap: 1 });
        ageBox.addChild(new Text('\nAge:      ', { fg: { type: 'named', name: 'cyan' } }));
        this.ageInput = new NumberInput({ width: 20 }, { min: 18, max: 120, placeholder: '18+' });
        ageBox.addChild(this.ageInput);

        // 3. Password Input
        const pwdBox = new Box({ flexDirection: 'row', height: 3, gap: 1 });
        pwdBox.addChild(new Text('\nPassword: ', { fg: { type: 'named', name: 'cyan' } }));
        this.pwdInput = new PasswordInput({ width: 20 }, { placeholder: 'Secret...' });
        pwdBox.addChild(this.pwdInput);

        // Error message area
        this.errorText = new Text('', { fg: { type: 'named', name: 'red' }, height: 2 });

        // Modal for confirmation
        this.modal = new Modal({ title: 'Confirm Clear', width: 40, height: 10 });
        const modalContent = new Box({ flexDirection: 'column', gap: 1 });
        modalContent.addChild(new Text('Are you sure you want to clear the form?'));
        modalContent.addChild(new Text('Press Y to confirm, N to cancel.', { dim: true }));
        this.modal.setContent(modalContent);

        this.addChild(title);
        this.addChild(this.form);
        this.addChild(ageBox);
        this.addChild(pwdBox);
        this.addChild(this.errorText);
        this.addChild(new Text('Controls: [Tab] Next Field | [Shift+Tab] Prev Field | [Enter] Submit | [c] Clear Form | [q] Quit', { dim: true }));
        this.addChild(this.modal);

        this.updateFocus();
    }

    private updateFocus() {
        this.form.isFocused = this.activeIndex === 0;
        this.ageInput.isFocused = this.activeIndex === 1;
        this.pwdInput.isFocused = this.activeIndex === 2;
        this.markDirty();
    }

    trySubmit() {
        let errors: string[] = [];
        
        // Let form validate itself, though we trigger it here manually as well
        this.form.submit();
        
        // Age validation
        if (this.ageInput.numericValue === null) {
            errors.push('Age is required');
        } else if (this.ageInput.numericValue < 18) {
            errors.push('Must be at least 18 years old');
        }

        // Pwd validation
        if (this.pwdInput.rawValue.length < 6) {
            errors.push('Password must be at least 6 characters');
        }

        if (errors.length > 0) {
            this.errorText.setContent('Validation Errors:\n' + errors.join(', '));
            this.errorText.setStyle({ fg: { type: 'named', name: 'red' } });
        } else {
            this.errorText.setContent('Success! Form submitted.');
            this.errorText.setStyle({ fg: { type: 'named', name: 'green' } });
        }
    }

    clearForm() {
        // Clear all fields
        // form does not have a public clear() method, so we would have to recreate or delete text. 
        // We will just clear the inputs we control directly.
        this.ageInput.clear();
        this.pwdInput.clear();
        this.errorText.setContent('');
        this.activeIndex = 0;
        this.updateFocus();
        this.modal.hide();
    }

    handleKey(event: KeyEvent): boolean {
        if (this.modal.visible) {
            if (event.key === 'y' || event.key === 'Y') {
                this.clearForm();
            } else if (event.key === 'n' || event.key === 'N' || event.key === 'escape') {
                this.modal.hide();
            }
            return true; // Consume key
        }

        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false; // Quit
        }

        if (event.key === 'c' && event.ctrl === false) {
            this.modal.show();
            return true;
        }

        if (event.key === 'tab') {
            if (event.shift) {
                this.activeIndex = Math.max(0, this.activeIndex - 1);
            } else {
                this.activeIndex = Math.min(2, this.activeIndex + 1);
            }
            this.updateFocus();
            return true;
        }

        if (event.key === 'enter' || event.key === 'return') {
            this.trySubmit();
            return true;
        }

        // Route keys to the active widget
        if (this.activeIndex === 0) {
            if (event.key === 'up') this.form.prevField();
            else if (event.key === 'down') this.form.nextField();
            else if (event.key === 'backspace') this.form.deleteBack();
            else if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
                this.form.insertChar(event.key);
            }
        } else if (this.activeIndex === 1) {
            this.ageInput.handleKey(event);
        } else if (this.activeIndex === 2) {
            this.pwdInput.handleKey(event);
        }

        return true;
    }

    protected _renderSelf(): void { }
}

async function main() {
    const exampleApp = new FormsExampleApp();

    const app = new App(exampleApp, {
        fullscreen: true,
        title: 'Forms and Validation',
        fps: 30,
    });

    app.events.on('key', (event) => {
        const shouldContinue = exampleApp.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
