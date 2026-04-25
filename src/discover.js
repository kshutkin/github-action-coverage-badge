import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Tiny glob: supports **, *, ?, and {a,b} alternation. Matches against POSIX-style paths
 * (so callers should normalize separators). The pattern matches the entire path.
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
export function globToRegex(pattern) {
    let out = "^";
    let i = 0;
    while (i < pattern.length) {
        const ch = pattern[i];
        if (ch === "*") {
            if (pattern[i + 1] === "*") {
                // ** -> match anything including '/'
                out += ".*";
                i += 2;
                if (pattern[i] === "/") i++;
            } else {
                // * -> match anything except '/'
                out += "[^/]*";
                i++;
            }
        } else if (ch === "?") {
            out += "[^/]";
            i++;
        } else if (ch === "{") {
            const end = pattern.indexOf("}", i);
            if (end < 0) {
                out += "\\{";
                i++;
            } else {
                const alts = pattern
                    .slice(i + 1, end)
                    .split(",")
                    .map((a) => a.replace(/[.+^$|()\\\[\]]/g, "\\$&"));
                out += "(?:" + alts.join("|") + ")";
                i = end + 1;
            }
        } else if (/[.+^$|()\\\[\]]/.test(ch)) {
            out += "\\" + ch;
            i++;
        } else {
            out += ch;
            i++;
        }
    }
    out += "$";
    return new RegExp(out);
}

/**
 * @param {string} p
 * @returns {string}
 */
function toPosix(p) {
    return p.split(sep).join("/");
}

/**
 * @param {string} pathPosix
 * @param {string[]} patterns
 * @returns {boolean}
 */
function matchesAny(pathPosix, patterns) {
    return patterns.some((p) => globToRegex(p).test(pathPosix));
}

/**
 * @typedef {Object} Discovery
 * @property {string} absolute Absolute folder path.
 * @property {string} relative Repo-relative POSIX path (e.g. "plugin-clean/coverage").
 */

/**
 * Walk `root`, collect directories whose repo-relative POSIX path matches any of `patterns`
 * and does not match any of `ignores`. Stops descending into ignored directories early.
 *
 * @param {string} root
 * @param {string[]} patterns
 * @param {string[]} ignores
 * @returns {Discovery[]}
 */
export function discover(root, patterns, ignores) {
    /** @type {Discovery[]} */
    const results = [];

    /**
     * @param {string} dir Absolute directory path.
     */
    function walk(dir) {
        const rel = toPosix(relative(root, dir));
        if (rel && matchesAny(rel, ignores)) return;
        if (rel && matchesAny(rel, patterns)) {
            results.push({ absolute: dir, relative: rel });
            // Do not descend into a matched coverage folder.
            return;
        }
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (entry.name === ".git") continue;
            const child = join(dir, entry.name);
            let isDir = entry.isDirectory();
            if (entry.isSymbolicLink()) {
                try {
                    isDir = statSync(child).isDirectory();
                } catch {
                    isDir = false;
                }
            }
            if (isDir) walk(child);
        }
    }

    walk(root);
    // Stable order for deterministic output.
    results.sort((a, b) => (a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0));
    return results;
}

/**
 * @param {string} csv comma- or newline-separated globs
 * @returns {string[]}
 */
export function splitGlobs(csv) {
    return (csv ?? "")
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
}
