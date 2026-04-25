import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseCoverageSummaryJson } from "../../src/parsers/coverageSummaryJson.js";
import { parseCoverageFinalJson } from "../../src/parsers/coverageFinalJson.js";
import { parseLcov } from "../../src/parsers/lcov.js";
import { parseCloverXml } from "../../src/parsers/cloverXml.js";
import { parseCoberturaXml } from "../../src/parsers/coberturaXml.js";

const fixtures = join(import.meta.dir, "..", "fixtures");

/** @param {string} f */
const fx = (f) => readFileSync(join(fixtures, f), "utf8");

describe("parseCoverageSummaryJson", () => {
    test("reads totals", () => {
        const s = parseCoverageSummaryJson(fx("coverage-summary.json"));
        expect(s.lines.pct).toBeCloseTo(80, 5);
        expect(s.statements.pct).toBeCloseTo(75, 5);
        expect(s.branches.pct).toBeCloseTo(75, 5);
        expect(s.functions.pct).toBeCloseTo(90, 5);
    });
});

describe("parseCoverageFinalJson", () => {
    test("aggregates statements/functions/branches/lines", () => {
        const s = parseCoverageFinalJson(fx("coverage-final.json"));
        // statements: 5 total, 3 covered
        expect(s.statements.total).toBe(5);
        expect(s.statements.covered).toBe(3);
        expect(s.statements.pct).toBeCloseTo(60, 5);
        // functions: 2 total, 1 covered
        expect(s.functions.total).toBe(2);
        expect(s.functions.covered).toBe(1);
        // branches: 2 arms total, 1 covered
        expect(s.branches.total).toBe(2);
        expect(s.branches.covered).toBe(1);
        // lines: 4 total, 3 covered (75%)
        expect(s.lines.total).toBe(4);
        expect(s.lines.covered).toBe(3);
        expect(s.lines.pct).toBeCloseTo(75, 5);
    });

    test("0/0 metrics report 100%", () => {
        const s = parseCoverageFinalJson(JSON.stringify({}));
        expect(s.lines.pct).toBe(100);
        expect(s.branches.pct).toBe(100);
    });
});

describe("parseLcov", () => {
    test("aggregates LF/LH FNF/FNH BRF/BRH", () => {
        const s = parseLcov(fx("lcov.info"));
        expect(s.lines.total).toBe(4);
        expect(s.lines.covered).toBe(3);
        expect(s.functions.total).toBe(2);
        expect(s.functions.covered).toBe(1);
        expect(s.branches.total).toBe(2);
        expect(s.branches.covered).toBe(1);
    });
});

describe("parseCloverXml", () => {
    test("reads project metrics", () => {
        const s = parseCloverXml(fx("clover.xml"));
        expect(s.statements.pct).toBeCloseTo(75, 5);
        expect(s.functions.pct).toBeCloseTo(90, 5);
        expect(s.branches.pct).toBeCloseTo(75, 5);
        // lines come from elements: 138/180 ≈ 76.67%
        expect(s.lines.pct).toBeCloseTo((138 / 180) * 100, 5);
    });
});

describe("parseCoberturaXml", () => {
    test("reads aggregate counts and method coverage", () => {
        const s = parseCoberturaXml(fx("cobertura-coverage.xml"));
        expect(s.lines.pct).toBeCloseTo(80, 5);
        expect(s.branches.pct).toBeCloseTo(75, 5);
        expect(s.functions.total).toBe(2);
        expect(s.functions.covered).toBe(1);
    });
});
