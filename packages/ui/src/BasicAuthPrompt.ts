import { Widget } from "@termuijs/widgets";
import { type Style, type KeyEvent, Screen, caps } from "@termuijs/core";

export interface BasicAuthCredentials {
    username: string;
    password: string;
}

export interface BasicAuthPromptOptions {
    usernameLabel?: string; // default: 'Username:'
    passwordLabel?: string; // default: 'Password:'
    onSubmit?: (credentials: BasicAuthCredentials) => void;
}

export class BasicAuthPrompt extends Widget {
    private _username = "";
    private _password = "";
    private _activeField: "username" | "password" = "username";
    private _opts: BasicAuthPromptOptions;
    private get _maskChar(): string {
        return caps.unicode ? "●" : "*";
    }
    constructor(style?: Partial<Style>, opts?: BasicAuthPromptOptions) {
        super(style);

        this._opts = {
            usernameLabel: "Username:",
            passwordLabel: "Password:",
            ...opts,
        };
    }
    getCredentials(): BasicAuthCredentials {
        return {
            username: this._username,
            password: this._password,
        };
    }
    private onSubmit(): void {
        if (this._activeField === "username") {
            this._activeField = "password";
        } else if (this._activeField === "password") {
            this._opts.onSubmit?.(this.getCredentials());
        }
        this.markDirty();
    }
    private deleteBackward(): void {
        if (this._activeField === "username") {
            this._username = this._username.slice(0, -1);
        } else {
            this._password = this._password.slice(0, -1);
        }
        this.markDirty();
    }
    private insertChar(key: string): void {
        if (this._activeField === "username") {
            this._username += key;
        } else {
            this._password += key;
        }
        this.markDirty();
    }
    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case "enter":
                this.onSubmit();
                break;
            case "backspace":
                this.deleteBackward();
                break;
            default:
                if (event.key.length === 1 && !event.ctrl && !event.alt) {
                    this.insertChar(event.key);
                }
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;
        const username = `${this._opts.usernameLabel} ${this._username}`;
        const masked = this._maskChar.repeat(this._password.length);
        const password = `${this._opts.passwordLabel} ${masked}`;
        screen.writeString(x, y, username);
        if (height > 1) {
            screen.writeString(x, y + 1, password);
        }
    }
}
