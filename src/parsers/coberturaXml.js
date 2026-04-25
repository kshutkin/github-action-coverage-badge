import { counts, summary } from "./normalize.js";

/**
 * Parse Cobertura XML.
 *
 * Strategy:
 *   - Read root `<coverage>` attributes for line-rate / branch-rate / lines-covered / lines-valid /
 *     branches-covered / branches-valid (when present).
 *   - Aggregate per-method counts across all `<method>` elements for functions.
 *
 * @param {string} text
 * @returns {import("./normalize.js").CoverageSummary}
 */
export function parseCoberturaXml(text) {
    const rootMatch = text.match(/<coverage\b([^>]*)>/);
    const rootAttrs = rootMatch ? parseAttrs(rootMatch[1]) : {};

    const linesValid = num(rootAttrs["lines-valid"]);
    const linesCovered = num(rootAttrs["lines-covered"]);
    const branchesValid = num(rootAttrs["branches-valid"]);
    const branchesCovered = num(rootAttrs["branches-covered"]);
    const lineRate = num(rootAttrs["line-rate"]);
    const branchRate = num(rootAttrs["branch-rate"]);

    /** @type {import("./normalize.js").MetricCounts} */
    let lines;
    if (linesValid > 0) {
        lines = counts(linesCovered, linesValid);
    } else {
        // Approximate from rate; total unknown -> use rate * 100 directly via covered=rate*total fallback.
        lines = { covered: 0, total: 0, pct: lineRate * 100 };
    }

    /** @type {import("./normalize.js").MetricCounts} */
    let branches;
    if (branchesValid > 0) {
        branches = counts(branchesCovered, branchesValid);
    } else {
        branches = { covered: 0, total: 0, pct: branchRate * 100 };
    }

    // Functions: count <method ...> occurrences and check each's <line ... hits="N"/>
    let fnTotal = 0,
        fnCovered = 0;
    const methodRe = /<method\b[^>]*>([\s\S]*?)<\/method>/g;
    let m;
    while ((m = methodRe.exec(text)) !== null) {
        fnTotal++;
        const body = m[1];
        // A method is "covered" if any of its lines has hits > 0.
        const lineRe = /<line\b[^>]*hits\s*=\s*"(\d+)"/g;
        let lm;
        let hit = false;
        while ((lm = lineRe.exec(body)) !== null) {
            if (Number(lm[1]) > 0) {
                hit = true;
                break;
            }
        }
        if (hit) fnCovered++;
    }

    return summary({
        lines,
        statements: lines,
        branches,
        functions: counts(fnCovered, fnTotal)
    });
}

/**
 * @param {string | undefined} v
 */
function num(v) {
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : 0;
}

/**
 * @param {string} chunk
 * @returns {Record<string, string>}
 */
function parseAttrs(chunk) {
    /** @type {Record<string, string>} */
    const out = {};
    const re = /([\w-]+)\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(chunk)) !== null) {
        out[m[1]] = m[2];
    }
    return out;
}
