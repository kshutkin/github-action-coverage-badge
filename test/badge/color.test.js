import { describe, expect, test } from "bun:test";
import { NAMED_COLORS, parseThresholds, pickColor, resolveColor } from "../../src/badge/color.js";

describe("parseThresholds", () => {
    test("parses default spec", () => {
        const b = parseThresholds("50:red,60:orange,70:yellow,80:yellowgreen,90:green,100:brightgreen");
        expect(b.length).toBe(6);
        expect(b[0]).toEqual({ upTo: 50, color: "red" });
        expect(b[5]).toEqual({ upTo: 100, color: "brightgreen" });
    });

    test("trims whitespace and accepts newlines", () => {
        const b = parseThresholds(" 50:red \n 100:green ");
        expect(b).toEqual([
            { upTo: 50, color: "red" },
            { upTo: 100, color: "green" }
        ]);
    });

    test("rejects bad entries", () => {
        expect(() => parseThresholds("foo")).toThrow();
        expect(() => parseThresholds("50red")).toThrow();
    });
});

describe("pickColor", () => {
    const buckets = parseThresholds("50:red,80:yellow,100:brightgreen");

    test("matches first bucket whose upTo >= pct", () => {
        expect(pickColor(0, buckets)).toBe(NAMED_COLORS.red);
        expect(pickColor(50, buckets)).toBe(NAMED_COLORS.red);
        expect(pickColor(50.0001, buckets)).toBe(NAMED_COLORS.yellow);
        expect(pickColor(80, buckets)).toBe(NAMED_COLORS.yellow);
        expect(pickColor(100, buckets)).toBe(NAMED_COLORS.brightgreen);
    });

    test("falls back to last bucket when pct exceeds all", () => {
        expect(pickColor(150, buckets)).toBe(NAMED_COLORS.brightgreen);
    });

    test("empty buckets default to lightgrey", () => {
        expect(pickColor(50, [])).toBe(NAMED_COLORS.lightgrey);
    });
});

describe("resolveColor", () => {
    test("hex passthrough", () => {
        expect(resolveColor("#abcdef")).toBe("#abcdef");
    });
    test("named", () => {
        expect(resolveColor("brightgreen")).toBe(NAMED_COLORS.brightgreen);
    });
    test("unknown -> lightgrey", () => {
        expect(resolveColor("definitelyNotAColor")).toBe(NAMED_COLORS.lightgrey);
    });
});
