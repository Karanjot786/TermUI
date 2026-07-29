import { describe, it, expect } from "vitest";
import { Session, SessionClosedError } from "./session";

describe("Session -- error paths", () => {
  it("should throw SessionClosedError when emitting after close", () => {
    const session = new Session();
    session.close();
    expect(() => session.emit("data", "hello")).toThrow(SessionClosedError);
  });

  it("should throw SessionClosedError on subscribe after close", () => {
    const session = new Session();
    session.close();
    expect(() => session.subscribe(() => {})).toThrow(SessionClosedError);
  });

  it("should allow reconnection after graceful close", () => {
    const session = new Session();
    session.close();
    expect(() => session.reconnect()).not.toThrow();
    expect(session.isConnected).toBe(true);
  });

  it("should deduplicate subscribers added twice", () => {
    const session = new Session();
    const handler = () => {};
    session.subscribe(handler);
    session.subscribe(handler);
    expect(session.subscribers.length).toBe(1);
  });

  it("should clear all subscribers on destroy", () => {
    const session = new Session();
    session.subscribe(() => {});
    session.subscribe(() => {});
    session.destroy();
    expect(session.subscribers.length).toBe(0);
  });
});
