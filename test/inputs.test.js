import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { readInputs } from "../src/inputs.js";

const ENV_KEYS = [
    "INPUT_BRANCH",
    "INPUT_COVERAGE_PATHS",
    "INPUT_IGNORE",
    "INPUT_METRIC",
    "INPUT_LABEL",
    "INPUT_THRESHOLDS",
    "INPUT_PRECISION",
    "INPUT_STYLE",
    "INPUT_COMMIT_MESSAGE",
    "INPUT_COMMIT_USER_NAME",
    "INPUT_COMMIT_USER_EMAIL",
    "INPUT_TOKEN",
    "INPUT_DRY_RUN"
];

/** @type {Record<string, string | undefined>} */
const saved = {};

beforeEach(() => {
    for (const k of ENV_KEYS) {
        saved[k] = process.env[k];
        delete process.env[k];
    }
});
afterEach(() => {
    for (const k of ENV_KEYS) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
    }
});

describe("readInputs", () => {
    test("returns defaults", () => {
        const i = readInputs();
        expect(i.branch).toBe("coverage");
        expect(i.metric).toBe("branches");
        expect(i.coveragePaths).toEqual(["**/coverage"]);
        expect(i.ignore).toEqual(["**/node_modules/**"]);
        expect(i.precision).toBe(0);
        expect(i.dryRun).toBe(false);
    });

    test("parses comma-separated globs and bool", () => {
        process.env.INPUT_COVERAGE_PATHS = "a/coverage, b/coverage";
        process.env.INPUT_DRY_RUN = "true";
        const i = readInputs();
        expect(i.coveragePaths).toEqual(["a/coverage", "b/coverage"]);
        expect(i.dryRun).toBe(true);
    });

    test("rejects invalid metric", () => {
        process.env.INPUT_METRIC = "bogus";
        expect(() => readInputs()).toThrow();
    });

    test("rejects invalid precision", () => {
        process.env.INPUT_PRECISION = "-1";
        expect(() => readInputs()).toThrow();
    });
});
