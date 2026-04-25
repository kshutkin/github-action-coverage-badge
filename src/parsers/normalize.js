/**
 * @typedef {Object} MetricCounts
 * @property {number} covered
 * @property {number} total
 * @property {number} pct  Percentage 0..100. When total is 0, pct is 100.
 */

/**
 * @typedef {Object} CoverageSummary
 * @property {MetricCounts} lines
 * @property {MetricCounts} statements
 * @property {MetricCounts} branches
 * @property {MetricCounts} functions
 */

/**
 * @param {number} covered
 * @param {number} total
 * @returns {MetricCounts}
 */
export function counts(covered, total) {
    const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
    const safeCovered = Number.isFinite(covered) && covered >= 0 ? Math.min(covered, safeTotal) : 0;
    const pct = safeTotal === 0 ? 100 : (safeCovered / safeTotal) * 100;
    return { covered: safeCovered, total: safeTotal, pct };
}

/**
 * @param {Partial<CoverageSummary>} partial
 * @returns {CoverageSummary}
 */
export function summary(partial) {
    return {
        lines: partial.lines ?? counts(0, 0),
        statements: partial.statements ?? counts(0, 0),
        branches: partial.branches ?? counts(0, 0),
        functions: partial.functions ?? counts(0, 0)
    };
}
