import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discover, globToRegex, splitGlobs } from "../src/discover.js";

describe("globToRegex", () => {
    test("** matches across slashes", () => {
        const re = globToRegex("**/coverage");
        expect(re.test("a/b/coverage")).toBe(true);
        expect(re.test("coverage")).toBe(true);
        expect(re.test("a/coverage/inside")).toBe(false);
    });

    test("* does not match slash", () => {
        const re = globToRegex("pkg-*/coverage");
        expect(re.test("pkg-a/coverage")).toBe(true);
        expect(re.test("pkg-a/b/coverage")).toBe(false);
    });

    test("alternation", () => {
        const re = globToRegex("{a,b}/coverage");
        expect(re.test("a/coverage")).toBe(true);
        expect(re.test("b/coverage")).toBe(true);
        expect(re.test("c/coverage")).toBe(false);
    });
});

describe("splitGlobs", () => {
    test("comma + newline + trim", () => {
        expect(splitGlobs(" a, b\n  c ")).toEqual(["a", "b", "c"]);
    });
});

describe("discover", () => {
    let root = "";
    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), "covb-disc-"));
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    /** @param {string[]} parts */
    const touch = (...parts) => {
        const p = join(root, ...parts);
        mkdirSync(p.replace(/\/[^/]+$/, ""), { recursive: true });
        writeFileSync(p, "");
    };

    test("finds nested coverage folders, ignores node_modules", () => {
        mkdirSync(join(root, "pkg-a", "coverage"), { recursive: true });
        touch("pkg-a", "coverage", "x.txt");
        mkdirSync(join(root, "pkg-b", "coverage"), { recursive: true });
        touch("pkg-b", "coverage", "y.txt");
        mkdirSync(join(root, "node_modules", "x", "coverage"), { recursive: true });
        touch("node_modules", "x", "coverage", "z.txt");

        const found = discover(root, ["**/coverage"], ["**/node_modules/**"]);
        expect(found.map((f) => f.relative)).toEqual(["pkg-a/coverage", "pkg-b/coverage"]);
    });

    test("does not descend into a matched coverage folder", () => {
        mkdirSync(join(root, "pkg", "coverage", "coverage"), { recursive: true });
        const found = discover(root, ["**/coverage"], []);
        expect(found.map((f) => f.relative)).toEqual(["pkg/coverage"]);
    });
});
