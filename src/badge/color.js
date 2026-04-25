/**
 * Shields-flat named color palette (matches https://shields.io defaults).
 * @type {Record<string, string>}
 */
export const NAMED_COLORS = {
    brightgreen: "#4c1",
    green: "#97ca00",
    yellowgreen: "#a4a61d",
    yellow: "#dfb317",
    orange: "#fe7d37",
    red: "#e05d44",
    blue: "#007ec6",
    lightgrey: "#9f9f9f",
    grey: "#555",
    gray: "#555"
};

/**
 * @typedef {Object} ThresholdBucket
 * @property {number} upTo  Inclusive upper bound (e.g. 50 means pct < 50 OR pct <= 50? we use pct <= upTo).
 * @property {string} color Named color or hex.
 */

/**
 * Parse a threshold spec like "50:red,60:orange,70:yellow,80:yellowgreen,90:green,100:brightgreen".
 * Buckets are matched by ascending upTo; the first bucket whose upTo >= pct wins.
 *
 * @param {string} spec
 * @returns {ThresholdBucket[]}
 */
export function parseThresholds(spec) {
    /** @type {ThresholdBucket[]} */
    const buckets = [];
    const trimmed = (spec ?? "").trim();
    if (!trimmed) return buckets;
    const parts = trimmed
        .split(/[,\n]/)
        .map((p) => p.trim())
        .filter(Boolean);
    for (const part of parts) {
        const m = part.match(/^(\d+(?:\.\d+)?)\s*:\s*([\w#]+)$/);
        if (!m) {
            throw new Error(`Invalid threshold entry: "${part}". Expected "<number>:<color>".`);
        }
        buckets.push({ upTo: Number(m[1]), color: m[2] });
    }
    buckets.sort((a, b) => a.upTo - b.upTo);
    return buckets;
}

/**
 * Resolve a percentage to a hex color using ascending threshold buckets.
 * Returns the color of the first bucket whose upTo >= pct; if none match, the
 * last bucket's color is used.
 *
 * @param {number} pct
 * @param {ThresholdBucket[]} buckets
 * @returns {string} hex color including leading '#'
 */
export function pickColor(pct, buckets) {
    if (buckets.length === 0) return NAMED_COLORS.lightgrey;
    let chosen = buckets[buckets.length - 1].color;
    for (const b of buckets) {
        if (pct <= b.upTo) {
            chosen = b.color;
            break;
        }
    }
    return resolveColor(chosen);
}

/**
 * @param {string} name Named color or hex (#abc / #aabbcc).
 * @returns {string} Hex color including leading '#'.
 */
export function resolveColor(name) {
    if (!name) return NAMED_COLORS.lightgrey;
    if (name.startsWith("#")) return name;
    const lower = name.toLowerCase();
    return NAMED_COLORS[lower] ?? NAMED_COLORS.lightgrey;
}
