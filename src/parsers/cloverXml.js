import { counts, summary } from "./normalize.js";

/**
 * Parse Clover XML.
 *
 * Looks for the root `<project>` element's direct `<metrics>` child which already
 * contains aggregate counts:
 *   statements, coveredstatements, methods, coveredmethods,
 *   conditionals, coveredconditionals, elements, coveredelements
 * Lines are derived from `coveredelements / elements` when present, otherwise
 * fall back to statements (Clover sometimes doesn't track lines distinctly).
 *
 * @param {string} text
 * @returns {import("./normalize.js").CoverageSummary}
 */
export function parseCloverXml(text) {
    const projectMatch = text.match(/<project[^>]*>([\s\S]*?)<\/project>/);
    const scope = projectMatch ? projectMatch[1] : text;
    const metricsMatch = scope.match(/<metrics\b([^/>]*)\/?>/);
    if (!metricsMatch) return summary({});

    const attrs = parseAttrs(metricsMatch[1]);
    /** @param {string} k */
    const num = (k) => {
        const v = attrs[k];
        const n = v == null ? NaN : Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const stmts = counts(num("coveredstatements"), num("statements"));
    const fns = counts(num("coveredmethods"), num("methods"));
    const branches = counts(num("coveredconditionals"), num("conditionals"));
    // Lines: prefer explicit elements (statements + conditionals + methods in Clover),
    // but for badge purposes fall back to statements which is the closest analogue.
    const lines =
        attrs.elements != null
            ? counts(num("coveredelements"), num("elements"))
            : stmts;

    return summary({ lines, statements: stmts, branches, functions: fns });
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
