import { appendFileSync } from "node:fs";

/**
 * @typedef {"lines" | "statements" | "branches" | "functions"} Metric
 */

/**
 * @typedef {Object} ActionInputs
 * @property {string} branch
 * @property {string[]} coveragePaths
 * @property {string[]} ignore
 * @property {Metric} metric
 * @property {string} label
 * @property {string} thresholds Raw spec; parsed by badge/color.
 * @property {number} precision
 * @property {string} style
 * @property {string} commitMessage
 * @property {string} commitUserName
 * @property {string} commitUserEmail
 * @property {string} token
 * @property {boolean} dryRun
 */

/** @type {ReadonlyArray<Metric>} */
const VALID_METRICS = ["lines", "statements", "branches", "functions"];

/**
 * @param {string} name
 * @param {string} fallback
 * @returns {string}
 */
function getInput(name, fallback) {
    const envName = "INPUT_" + name.replace(/-/g, "_").toUpperCase();
    const v = process.env[envName];
    return v == null || v === "" ? fallback : v;
}

/**
 * @param {string} v
 * @returns {boolean}
 */
function parseBool(v) {
    return /^(true|1|yes|on)$/i.test(v.trim());
}

/**
 * @returns {ActionInputs}
 */
export function readInputs() {
    const metricRaw = getInput("metric", "branches").trim().toLowerCase();
    if (!VALID_METRICS.includes(/** @type {Metric} */ (metricRaw))) {
        throw new Error(
            `Invalid 'metric' input: "${metricRaw}". Expected one of: ${VALID_METRICS.join(", ")}.`
        );
    }
    const precisionRaw = getInput("precision", "0").trim();
    const precision = Number(precisionRaw);
    if (!Number.isFinite(precision) || precision < 0 || precision > 6) {
        throw new Error(`Invalid 'precision' input: "${precisionRaw}". Expected an integer 0..6.`);
    }
    return {
        branch: getInput("branch", "coverage").trim() || "coverage",
        coveragePaths: splitCsv(getInput("coverage-paths", "**/coverage")),
        ignore: splitCsv(getInput("ignore", "**/node_modules/**")),
        metric: /** @type {Metric} */ (metricRaw),
        label: getInput("label", "coverage"),
        thresholds: getInput(
            "thresholds",
            "50:red,60:orange,70:yellow,80:yellowgreen,90:green,100:brightgreen"
        ),
        precision: Math.floor(precision),
        style: getInput("style", "flat").trim().toLowerCase(),
        commitMessage: getInput("commit-message", "chore: update coverage badges"),
        commitUserName: getInput("commit-user-name", "github-actions[bot]"),
        commitUserEmail: getInput(
            "commit-user-email",
            "41898282+github-actions[bot]@users.noreply.github.com"
        ),
        token: getInput("token", process.env.GITHUB_TOKEN ?? ""),
        dryRun: parseBool(getInput("dry-run", "false"))
    };
}

/**
 * @param {string} csv
 * @returns {string[]}
 */
function splitCsv(csv) {
    return csv
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Append a name=value pair to $GITHUB_OUTPUT (multi-line safe).
 *
 * @param {string} name
 * @param {string} value
 */
export function setOutput(name, value) {
    const file = process.env.GITHUB_OUTPUT;
    if (!file) return;
    if (value.includes("\n")) {
        const delim = `EOF_${Math.random().toString(36).slice(2)}`;
        appendFileSync(file, `${name}<<${delim}\n${value}\n${delim}\n`);
    } else {
        appendFileSync(file, `${name}=${value}\n`);
    }
}
