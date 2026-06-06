export {};

declare global {
  // allows globalThis["anything"] without TS7017
  interface GlobalThis {
    [key: string]: any;
  }
}