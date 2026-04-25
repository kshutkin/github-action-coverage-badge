import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * @typedef {Object} GitRunOpts
 * @property {string} [cwd]
 * @property {Record<string, string | undefined>} [env]
 */

/**
 * @param {string[]} args
 * @param {GitRunOpts} [opts]
 * @returns {string}
 */
function git(args, opts = {}) {
    return execFileSync("git", args, {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8"
    }).trim();
}

/**
 * @typedef {Object} BadgeArtifact
 * @property {string} relativeDir Repo-relative directory containing the coverage report (POSIX).
 * @property {string} sourceCoverageDir Absolute path to the source coverage folder to copy.
 * @property {string} badgeSvg Rendered SVG content for badge.svg sibling.
 */

/**
 * @typedef {Object} CommitOptions
 * @property {string} workspace Source repo workspace root (absolute).
 * @property {string} branch Target orphan branch.
 * @property {string} commitMessage
 * @property {string} userName
 * @property {string} userEmail
 * @property {string} token GitHub token used for push auth.
 * @property {string} [remote] Remote name; defaults to 'origin'.
 * @property {string} [serverUrl] e.g. https://github.com — defaults to env GITHUB_SERVER_URL or https://github.com.
 * @property {string} [repository] owner/repo — defaults to env GITHUB_REPOSITORY.
 */

/**
 * Force-push the given badges + coverage folders onto an orphan branch.
 *
 * @param {BadgeArtifact[]} artifacts
 * @param {CommitOptions} opts
 * @returns {{ commitSha: string } | { commitSha: null, reason: "no-changes" }}
 */
export function commitAndForcePush(artifacts, opts) {
    const remote = opts.remote ?? "origin";
    const serverUrl = opts.serverUrl ?? process.env.GITHUB_SERVER_URL ?? "https://github.com";
    const repository = opts.repository ?? process.env.GITHUB_REPOSITORY;
    if (!repository) throw new Error("GITHUB_REPOSITORY is not set; cannot determine push URL.");

    const tmpRoot = mkdtempSync(join(tmpdir(), "coverage-badge-"));
    try {
        // Bare-ish working directory for the orphan branch.
        // We use a temporary clone with the source repo as origin, then add an authenticated remote
        // to push against. This avoids interfering with the workspace's working tree.
        const work = join(tmpRoot, "branch");
        mkdirSync(work, { recursive: true });

        // Initialize a fresh repo and seed with the source repo's git directory as remote.
        git(["init", "-q", "-b", opts.branch], { cwd: work });
        git(["config", "user.name", opts.userName], { cwd: work });
        git(["config", "user.email", opts.userEmail], { cwd: work });

        // Stage artifacts.
        for (const a of artifacts) {
            const destDir = join(work, a.relativeDir);
            mkdirSync(destDir, { recursive: true });
            cpSync(a.sourceCoverageDir, destDir, { recursive: true });
            const parent = dirname(destDir);
            mkdirSync(parent, { recursive: true });
            writeFileSync(join(parent, "badge.svg"), a.badgeSvg, "utf8");
        }

        // Add a top-level README and index for discoverability.
        writeFileSync(
            join(work, "README.md"),
            buildIndexReadme(artifacts),
            "utf8"
        );

        git(["add", "-A"], { cwd: work });

        // Detect "no changes vs current remote branch": fetch first.
        const authUrl = `${serverUrl.replace(/\/+$/, "")}/${repository}.git`;
        const headers = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${opts.token}`).toString("base64")}`;
        git(["remote", "add", remote, authUrl], { cwd: work });
        git(["config", `http.${authUrl}/.extraheader`, headers], { cwd: work });

        // Commit (allow empty so force-push always overwrites; if literally no diff, we still push to update HEAD).
        try {
            git(["commit", "-m", opts.commitMessage], { cwd: work });
        } catch {
            // Nothing staged at all — extremely unlikely since we always write README.md
            return { commitSha: null, reason: "no-changes" };
        }

        const sha = git(["rev-parse", "HEAD"], { cwd: work });
        git(["push", "--force", remote, `HEAD:refs/heads/${opts.branch}`], { cwd: work });
        return { commitSha: sha };
    } finally {
        rmSync(tmpRoot, { recursive: true, force: true });
    }
}

/**
 * @param {BadgeArtifact[]} artifacts
 * @returns {string}
 */
function buildIndexReadme(artifacts) {
    const lines = [
        "# Coverage badges",
        "",
        "This branch is force-pushed by [github-action-coverage-badge](https://github.com/kshutkin/github-action-coverage-badge).",
        "Do not commit to it manually.",
        "",
        "## Badges",
        ""
    ];
    for (const a of artifacts) {
        const parent = a.relativeDir.split("/").slice(0, -1).join("/");
        const badgePath = parent ? `${parent}/badge.svg` : "badge.svg";
        lines.push(`- \`${a.relativeDir}\` — ![](./${badgePath})`);
    }
    lines.push("");
    return lines.join("\n");
}
