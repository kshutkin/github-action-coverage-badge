import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { detectAndParse } from "../src/detect.js";

let dir = "";

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "covb-detect-"));
});
afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
});

describe("detectAndParse", () => {
    test("returns null when no supported file", () => {
        expect(detectAndParse(dir)).toBeNull();
    });

    test("prefers coverage-summary.json over coverage-final.json", () => {
        writeFileSync(
            join(dir, "coverage-summary.json"),
            JSON.stringify({
                total: {
                    lines: { covered: 1, total: 1 },
                    statements: { covered: 1, total: 1 },
                    branches: { covered: 0, total: 0 },
                    functions: { covered: 0, total: 0 }
                }
            })
        );
        writeFileSync(join(dir, "coverage-final.json"), JSON.stringify({}));
        const r = detectAndParse(dir);
        expect(r).not.toBeNull();
        expect(r?.format).toBe("coverage-summary.json");
    });

    test("falls back to lcov", () => {
        writeFileSync(join(dir, "lcov.info"), "LF:10\nLH:5\nend_of_record\n");
        const r = detectAndParse(dir);
        expect(r?.format).toBe("lcov.info");
        expect(r?.summary.lines.pct).toBeCloseTo(50, 5);
    });
});
