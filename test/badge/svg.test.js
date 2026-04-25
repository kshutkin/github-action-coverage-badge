import { describe, expect, test } from "bun:test";
import { formatPct, renderBadge } from "../../src/badge/svg.js";

describe("formatPct", () => {
    test("rounds with given precision", () => {
        expect(formatPct(87.6543, 0)).toBe("88%");
        expect(formatPct(87.6543, 1)).toBe("87.7%");
        expect(formatPct(87.6543, 2)).toBe("87.65%");
    });
    test("clamps", () => {
        expect(formatPct(-1, 0)).toBe("0%");
        expect(formatPct(101, 0)).toBe("100%");
    });
});

describe("renderBadge", () => {
    test("produces parseable SVG with both label and value", () => {
        const svg = renderBadge({ label: "coverage", value: "88%", color: "#4c1" });
        expect(svg.startsWith("<svg")).toBe(true);
        expect(svg.endsWith("</svg>")).toBe(true);
        expect(svg).toContain(">coverage<");
        expect(svg).toContain(">88%<");
        expect(svg).toContain('fill="#4c1"');
    });

    test("escapes special characters", () => {
        const svg = renderBadge({ label: "a&b<c", value: '"v"', color: "#000" });
        expect(svg).toContain("a&amp;b&lt;c");
        expect(svg).toContain("&quot;v&quot;");
    });

    test("width grows with longer text", () => {
        const small = renderBadge({ label: "a", value: "1%", color: "#000" });
        const big = renderBadge({ label: "very long label", value: "100%", color: "#000" });
        /** @param {string} s */
        const widthOf = (s) => Number(/width="([\.\d]+)"/.exec(s)?.[1]);
        expect(widthOf(big)).toBeGreaterThan(widthOf(small));
    });

    test("is deterministic", () => {
        const a = renderBadge({ label: "coverage", value: "50%", color: "#dfb317" });
        const b = renderBadge({ label: "coverage", value: "50%", color: "#dfb317" });
        expect(a).toBe(b);
    });
});
