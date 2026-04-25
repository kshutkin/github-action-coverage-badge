import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { detectAndParse } from "./detect.js";
import { discover } from "./discover.js";
import { readInputs, setOutput } from "./inputs.js";
import { parseThresholds, pickColor } from "./badge/color.js";
import { formatPct, renderBadge } from "./badge/svg.js";
import { commitAndForcePush } from "./git.js";

/**
 * @returns {Promise<void>}
 */
export async function run() {
    const inputs = readInputs();
    const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

    if (inputs.style !== "flat") {
        console.warn(`[coverage-badge] style="${inputs.style}" is not supported in v1; rendering 'flat'.`);
    }

    const buckets = parseThresholds(inputs.thresholds);

    console.log(`[coverage-badge] Scanning ${workspace}`);
    console.log(`[coverage-badge] coverage-paths: ${inputs.coveragePaths.join(", ")}`);
    console.log(`[coverage-badge] ignore:         ${inputs.ignore.join(", ")}`);

    const folders = discover(workspace, inputs.coveragePaths, inputs.ignore);
    console.log(`[coverage-badge] Found ${folders.length} candidate folder(s).`);

    /** @type {import("./git.js").BadgeArtifact[]} */
    const artifacts = [];
    /** @type {Array<{ path: string, metric: string, pct: number, color: string, format: string }>} */
    const report = [];

    for (const folder of folders) {
        const detected = detectAndParse(folder.absolute);
        if (!detected) {
            console.warn(`[coverage-badge] No supported coverage file in ${folder.relative}; skipping.`);
            continue;
        }
        const m = detected.summary[inputs.metric];
        const color = pickColor(m.pct, buckets);
        const value = formatPct(m.pct, inputs.precision);
        const svg = renderBadge({ label: inputs.label, value, color });

        artifacts.push({
            relativeDir: folder.relative,
            sourceCoverageDir: folder.absolute,
            badgeSvg: svg
        });
        report.push({
            path: folder.relative,
            metric: inputs.metric,
            pct: Number(m.pct.toFixed(2)),
            color,
            format: detected.format
        });

        console.log(
            `[coverage-badge] ${folder.relative}  format=${detected.format}  ${inputs.metric}=${value}  color=${color}`
        );
    }

    if (artifacts.length === 0) {
        console.log("[coverage-badge] Nothing to do.");
        setOutput("branch", inputs.branch);
        setOutput("commit-sha", "");
        setOutput("badges-json", "[]");
        return;
    }

    if (inputs.dryRun) {
        const out = process.env.COVERAGE_BADGE_DRYRUN_OUT ?? join(workspace, ".coverage-badge-out");
        for (const a of artifacts) {
            const target = join(out, a.relativeDir);
            mkdirSync(dirname(target), { recursive: true });
            mkdirSync(target, { recursive: true });
            writeFileSync(join(dirname(target), "badge.svg"), a.badgeSvg, "utf8");
        }
        console.log(`[coverage-badge] dry-run: wrote ${artifacts.length} badge(s) to ${out}`);
        setOutput("branch", inputs.branch);
        setOutput("commit-sha", "");
        setOutput("badges-json", JSON.stringify(report));
        return;
    }

    if (!inputs.token) {
        throw new Error("'token' input is empty; cannot push to the orphan branch.");
    }

    const result = commitAndForcePush(artifacts, {
        workspace,
        branch: inputs.branch,
        commitMessage: inputs.commitMessage,
        userName: inputs.commitUserName,
        userEmail: inputs.commitUserEmail,
        token: inputs.token
    });

    setOutput("branch", inputs.branch);
    setOutput("commit-sha", result.commitSha ?? "");
    setOutput("badges-json", JSON.stringify(report));
    console.log(
        `[coverage-badge] Pushed ${artifacts.length} badge(s) to '${inputs.branch}' (sha=${result.commitSha ?? "n/a"}).`
    );
}

run().catch((err) => {
    console.error(`[coverage-badge] ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    process.exit(1);
});
