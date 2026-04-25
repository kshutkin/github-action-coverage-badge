import { counts, summary } from "./normalize.js";

/**
 * Parse Istanbul-style coverage-summary.json (already aggregated).
 *
 * Schema example:
 * { "total": { "lines": {"total":N,"covered":C,"skipped":S,"pct":P}, ... }, "<file>": {...} }
 *
 * @param {string} text
 * @returns {import("./normalize.js").CoverageSummary}
 */
export function parseCoverageSummaryJson(text) {
    const data = JSON.parse(text);
    const total = data?.total;
    if (!total || typeof total !== "object") {
        return summary({});
    }

    /** @param {{ covered?: number, total?: number } | undefined} m */
    const pick = (m) => counts(m?.covered ?? 0, m?.total ?? 0);

    return summary({
        lines: pick(total.lines),
        statements: pick(total.statements),
        branches: pick(total.branches),
        functions: pick(total.functions)
    });
}
