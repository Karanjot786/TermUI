export function enableBracketedPaste() {
    process.stdout.write('\x1b[?2004h');
}

export function disableBracketedPaste() {
    process.stdout.write('\x1b[?2004l');
}
