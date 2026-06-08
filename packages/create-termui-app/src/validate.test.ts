import { describe, it, expect } from "vitest";
import { validateProjectName, validateResolvedPath } from "./validate";

describe("validateProjectName", () => {
    describe("valid names", () => {
        it("accepts lowercase with hyphens", () => {
            expect(validateProjectName("my-app")).toBe("my-app");
        });

        it("accepts lowercase with underscores", () => {
            expect(validateProjectName("my_app")).toBe("my_app");
        });

        it("accepts lowercase with numbers", () => {
            expect(validateProjectName("project1")).toBe("project1");
        });

        it("accepts complex valid names", () => {
            expect(validateProjectName("termui-demo")).toBe("termui-demo");
            expect(validateProjectName("my_project_1")).toBe("my_project_1");
            expect(validateProjectName("a1b2c3")).toBe("a1b2c3");
        });

        it("trims whitespace", () => {
            expect(validateProjectName("  my-app  ")).toBe("my-app");
        });
    });

    describe("invalid names - path traversal", () => {
        it("rejects ../", () => {
            expect(() => validateProjectName("../evil")).toThrow(
                /path separators or traversal/
            );
        });

        it("rejects ../../", () => {
            expect(() => validateProjectName("../../hack")).toThrow(
                /path separators or traversal/
            );
        });

        it("rejects nested ../ patterns", () => {
            expect(() => validateProjectName("../../../etc/passwd")).toThrow(
                /path separators or traversal/
            );
        });

        it("rejects backslash traversal", () => {
            expect(() => validateProjectName("..\\evil")).toThrow(
                /path separators or traversal/
            );
        });
    });

    describe("invalid names - absolute paths", () => {
        it("rejects Unix absolute paths", () => {
            expect(() => validateProjectName("/etc/passwd")).toThrow(
                /absolute path/
            );
        });

        it("rejects Windows absolute paths", () => {
            expect(() => validateProjectName("\\Windows\\System32")).toThrow(
                /absolute path/
            );
        });

        it("rejects drive letters", () => {
            expect(() => validateProjectName("C:\\app")).toThrow(
                /path separators/
            );
        });
    });

    describe("invalid names - path separators", () => {
        it("rejects forward slashes", () => {
            expect(() => validateProjectName("my/app")).toThrow(
                /path separators or traversal/
            );
        });

        it("rejects backslashes", () => {
            expect(() => validateProjectName("my\\app")).toThrow(
                /path separators or traversal/
            );
        });

        it("rejects mixed separators", () => {
            expect(() => validateProjectName("my/app\\test")).toThrow(
                /path separators or traversal/
            );
        });
    });

    describe("invalid names - invalid characters", () => {
        it("rejects uppercase letters", () => {
            expect(() => validateProjectName("MyApp")).toThrow(
                /lowercase letters, numbers/
            );
        });

        it("rejects spaces", () => {
            expect(() => validateProjectName("hello world")).toThrow(
                /lowercase letters, numbers/
            );
        });

        it("rejects special characters", () => {
            expect(() => validateProjectName("project$")).toThrow(
                /lowercase letters, numbers/
            );
            expect(() => validateProjectName("app@test")).toThrow(
                /lowercase letters, numbers/
            );
            expect(() => validateProjectName("my.app")).toThrow(
                /lowercase letters, numbers/
            );
        });

        it("rejects names starting with hyphen", () => {
            expect(() => validateProjectName("-app")).toThrow(
                /lowercase letters, numbers/
            );
        });

        it("rejects names starting with underscore", () => {
            expect(() => validateProjectName("_app")).toThrow(
                /lowercase letters, numbers/
            );
        });
    });

    describe("invalid names - empty or null", () => {
        it("rejects undefined", () => {
            expect(() => validateProjectName(undefined)).toThrow(
                /required/
            );
        });

        it("rejects null", () => {
            expect(() => validateProjectName(null)).toThrow(
                /required/
            );
        });

        it("rejects empty string", () => {
            expect(() => validateProjectName("")).toThrow(
                /cannot be empty/
            );
        });

        it("rejects whitespace-only string", () => {
            expect(() => validateProjectName("   ")).toThrow(
                /cannot be empty/
            );
        });

        it("rejects non-string types", () => {
            expect(() => validateProjectName(123 as unknown)).toThrow(
                /required/
            );
            expect(() => validateProjectName({} as unknown)).toThrow(
                /required/
            );
            expect(() => validateProjectName(null)).toThrow(
                /required/
            );
        });
    });
});

describe("validateResolvedPath", () => {
    const cwd = "/home/user";

    it("allows normal project names", () => {
        expect(() => validateResolvedPath(cwd, "my-app")).not.toThrow();
    });

    it("allows multiple valid names", () => {
        expect(() => validateResolvedPath(cwd, "project-1")).not.toThrow();
        expect(() => validateResolvedPath(cwd, "my_app")).not.toThrow();
    });
});
