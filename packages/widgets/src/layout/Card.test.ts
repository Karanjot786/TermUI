import { describe, it, expect } from "vitest";
import { Screen } from "@termuijs/core";
import { Card } from "./Card.js";

describe("Card", () => {
    it("renders a border around its content", () => {
        const card = new Card();

        card.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5,
        });

        const screen = new Screen(20, 5);
        card.render(screen);

        expect(screen.back[0][0].char).toBe("┌");
        expect(screen.back[0][19].char).toBe("┐");
        expect(screen.back[4][0].char).toBe("└");
        expect(screen.back[4][19].char).toBe("┘");
    });

    it("renders without throwing when title is provided", () => {
        const card = new Card({}, { title: "Settings" });

        card.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5,
        });

        const screen = new Screen(20, 5);

        expect(() => card.render(screen)).not.toThrow();
    });

    it("updates title via setTitle without throwing", () => {
        const card = new Card();

        card.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5,
        });

        card.setTitle("Profile");

        const screen = new Screen(20, 5);

        expect(() => card.render(screen)).not.toThrow();
    });
});