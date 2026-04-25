import { counts, summary } from "./normalize.js";

/**
 * Parse Istanbul/v8 detailed coverage-final.json content.
 * Aggregates statement, function, branch, and line counts across all files.
 *
 * @param {string} text
 * @returns {import("./normalize.js").CoverageSummary}
 */
export function parseCoverageFinalJson(text) {
    /** @type {Record<string, FileCoverage>} */
    const data = JSON.parse(text);

    let sCovered = 0,
        sTotal = 0;
    let fCovered = 0,
        fTotal = 0;
    let bCovered = 0,
        bTotal = 0;
    let lCovered = 0,
        lTotal = 0;

    for (const fileKey of Object.keys(data)) {
        const file = data[fileKey];
        if (!file || typeof file !== "object") continue;

        // Statements
        const sMap = file.s ?? {};
        for (const id of Object.keys(sMap)) {
            sTotal++;
            if ((sMap[id] ?? 0) > 0) sCovered++;
        }

        // Functions
        const fMap = file.f ?? {};
        for (const id of Object.keys(fMap)) {
            fTotal++;
            if ((fMap[id] ?? 0) > 0) fCovered++;
        }

        // Branches: each branch has an array of arm hit counts
        const bMap = file.b ?? {};
        for (const id of Object.keys(bMap)) {
            const arms = bMap[id] ?? [];
            for (const hits of arms) {
                bTotal++;
                if ((hits ?? 0) > 0) bCovered++;
            }
        }

        // Lines: group statements by start line
        const stmtMap = file.statementMap ?? {};
        /** @type {Map<number, number>} */
        const lineHits = new Map();
        for (const id of Object.keys(stmtMap)) {
            const loc = stmtMap[id];
            const line = loc?.start?.line;
            if (typeof line !== "number") continue;
            const hits = sMap[id] ?? 0;
            const prev = lineHits.get(line) ?? 0;
            lineHits.set(line, Math.max(prev, hits));
        }
        for (const hits of lineHits.values()) {
            lTotal++;
            if (hits > 0) lCovered++;
        }
    }

    return summary({
        statements: counts(sCovered, sTotal),
        functions: counts(fCovered, fTotal),
        branches: counts(bCovered, bTotal),
        lines: counts(lCovered, lTotal)
    });
}

/**
 * @typedef {Object} Loc
 * @property {{ line: number, column: number | null }} start
 * @property {{ line: number, column: number | null }} end
 */

/**
 * @typedef {Object} FileCoverage
 * @property {Record<string, Loc>} [statementMap]
 * @property {Record<string, unknown>} [fnMap]
 * @property {Record<string, unknown>} [branchMap]
 * @property {Record<string, number>} [s]
 * @property {Record<string, number>} [f]
 * @property {Record<string, number[]>} [b]
 */
