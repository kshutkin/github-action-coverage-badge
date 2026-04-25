import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseCoverageSummaryJson } from "./parsers/coverageSummaryJson.js";
import { parseCoverageFinalJson } from "./parsers/coverageFinalJson.js";
import { parseLcov } from "./parsers/lcov.js";
import { parseCloverXml } from "./parsers/cloverXml.js";
import { parseCoberturaXml } from "./parsers/coberturaXml.js";

/**
 * @typedef {"coverage-summary.json" | "coverage-final.json" | "lcov.info" | "clover.xml" | "cobertura-coverage.xml"} CoverageFormat
 */

/**
 * Detection priority: pre-aggregated summaries first, then detailed forms.
 * @type {ReadonlyArray<{ file: CoverageFormat, parse: (text: string) => import("./parsers/normalize.js").CoverageSummary }>}
 */
const FORMATS = [
    { file: "coverage-summary.json", parse: parseCoverageSummaryJson },
    { file: "coverage-final.json", parse: parseCoverageFinalJson },
    { file: "lcov.info", parse: parseLcov },
    { file: "clover.xml", parse: parseCloverXml },
    { file: "cobertura-coverage.xml", parse: parseCoberturaXml }
];

/**
 * @param {string} folder Absolute path to a coverage folder.
 * @returns {{ format: CoverageFormat, file: string, summary: import("./parsers/normalize.js").CoverageSummary } | null}
 */
export function detectAndParse(folder) {
    for (const fmt of FORMATS) {
        const file = join(folder, fmt.file);
        if (!existsSync(file)) continue;
        const text = readFileSync(file, "utf8");
        return { format: fmt.file, file, summary: fmt.parse(text) };
    }
    return null;
}
