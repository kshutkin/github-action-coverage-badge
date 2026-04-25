/**
 * Render a Shields.io "flat"-style coverage badge as a self-contained SVG string.
 * Output is deterministic (no timestamps, no random ids).
 *
 * Width estimation uses Verdana 11px ≈ 7px per character — close enough for
 * short coverage badges; the value never overflows because we add 10px padding.
 */

const CHAR_WIDTH = 7; // px per char approximation for Verdana 11
const PADDING = 10;
const HEIGHT = 20;

/**
 * @param {string} s
 * @returns {string}
 */
function escapeXml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * @param {string} s
 * @returns {number}
 */
function textWidth(s) {
    // Spread by code-points for safety (no surrogate pairs expected here).
    return [...s].length * CHAR_WIDTH;
}

/**
 * @param {{ label: string, value: string, color: string }} input
 * @returns {string}
 */
export function renderBadge({ label, value, color }) {
    const safeLabel = escapeXml(label);
    const safeValue = escapeXml(value);

    const labelWidth = textWidth(label) + PADDING;
    const valueWidth = textWidth(value) + PADDING;
    const totalWidth = labelWidth + valueWidth;

    // Text positions are at the center of each side (in 1/10 of a px units multiplied by 10 to keep integers in render).
    const labelTextX = (labelWidth / 2) * 10;
    const valueTextX = (labelWidth + valueWidth / 2) * 10;

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${HEIGHT}" role="img" aria-label="${safeLabel}: ${safeValue}">` +
        `<title>${safeLabel}: ${safeValue}</title>` +
        `<linearGradient id="s" x2="0" y2="100%">` +
        `<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>` +
        `<stop offset="1" stop-opacity=".1"/>` +
        `</linearGradient>` +
        `<clipPath id="r"><rect width="${totalWidth}" height="${HEIGHT}" rx="3" fill="#fff"/></clipPath>` +
        `<g clip-path="url(#r)">` +
        `<rect width="${labelWidth}" height="${HEIGHT}" fill="#555"/>` +
        `<rect x="${labelWidth}" width="${valueWidth}" height="${HEIGHT}" fill="${color}"/>` +
        `<rect width="${totalWidth}" height="${HEIGHT}" fill="url(#s)"/>` +
        `</g>` +
        `<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">` +
        `<text aria-hidden="true" x="${labelTextX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${textWidth(label) * 10}">${safeLabel}</text>` +
        `<text x="${labelTextX}" y="140" transform="scale(.1)" fill="#fff" textLength="${textWidth(label) * 10}">${safeLabel}</text>` +
        `<text aria-hidden="true" x="${valueTextX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${textWidth(value) * 10}">${safeValue}</text>` +
        `<text x="${valueTextX}" y="140" transform="scale(.1)" fill="#fff" textLength="${textWidth(value) * 10}">${safeValue}</text>` +
        `</g>` +
        `</svg>`
    );
}

/**
 * Format a percentage for display.
 * @param {number} pct
 * @param {number} precision
 * @returns {string}
 */
export function formatPct(pct, precision) {
    const safe = Math.max(0, Math.min(100, pct));
    const p = Math.max(0, Math.min(6, Math.floor(precision)));
    return `${safe.toFixed(p)}%`;
}
