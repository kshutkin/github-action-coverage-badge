import { counts, summary } from "./normalize.js";

/**
 * Parse LCOV tracefile (lcov.info).
 * Aggregates LF/LH (lines), FNF/FNH (functions), BRF/BRH (branches).
 * LCOV has no separate statement counter; statements mirror lines.
 *
 * @param {string} text
 * @returns {import("./normalize.js").CoverageSummary}
 */
export function parseLcov(text) {
    let lf = 0,
        lh = 0,
        fnf = 0,
        fnh = 0,
        brf = 0,
        brh = 0;

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;
        const idx = line.indexOf(":");
        if (idx < 0) continue;
        const key = line.slice(0, idx);
        const val = Number(line.slice(idx + 1));
        if (!Number.isFinite(val)) continue;
        switch (key) {
            case "LF":
                lf += val;
                break;
            case "LH":
                lh += val;
                break;
            case "FNF":
                fnf += val;
                break;
            case "FNH":
                fnh += val;
                break;
            case "BRF":
                brf += val;
                break;
            case "BRH":
                brh += val;
                break;
        }
    }

    const lines = counts(lh, lf);
    return summary({
        lines,
        statements: lines,
        functions: counts(fnh, fnf),
        branches: counts(brh, brf)
    });
}
