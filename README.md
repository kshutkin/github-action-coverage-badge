# github-action-coverage-badge

A GitHub Action that discovers coverage reports anywhere in your repository, generates a self-contained SVG badge per report, and force-pushes the badges together with the original coverage folders to a configurable orphan branch (default `coverage`). You then reference the badges from your `README.md` using the `raw.githubusercontent.com` URL.

- No build step, no committed `dist/`. Pure ESM JS with JSDoc types.
- Zero runtime dependencies — runs on the default `node20` runtime.
- Bun is used **only for development and tests** (`bun test`).
- Self-contained Shields.io-flat SVGs (no external network calls at runtime).
- Designed to drop into a reusable workflow (e.g. the sibling [`pipeline`](https://github.com/kshutkin/pipeline) repo).

## Supported coverage formats

Detected in this priority order (first match wins per coverage folder):

| Priority | Filename | Producer examples |
| --- | --- | --- |
| 1 | `coverage-summary.json` | Istanbul (`json-summary` reporter) |
| 2 | `coverage-final.json` | Istanbul / Vitest (`v8` provider, default JSON reporter) |
| 3 | `lcov.info` | nyc, c8, jest |
| 4 | `clover.xml` | Vitest (default `v8` clover reporter), nyc |
| 5 | `cobertura-coverage.xml` | jest, nyc |

For each folder the action computes four metrics — `lines`, `statements`, `branches`, `functions` — and renders one badge using whichever metric you select.

## Quickstart

```yaml
# .github/workflows/coverage-badges.yml
name: Coverage badges
on:
    push:
        branches: [main]

jobs:
    badges:
        runs-on: ubuntu-latest
        permissions:
            contents: write
        steps:
            - uses: actions/checkout@v4
              with:
                  fetch-depth: 0
            - run: pnpm install --frozen-lockfile
            - run: pnpm test # produces coverage/ folders
            - uses: kshutkin/github-action-coverage-badge@v1
```

After the first successful run, your repo will have a `coverage` branch with this layout (mirroring the source tree):

```
plugin-clean/
    badge.svg
    coverage/
        coverage-final.json
        clover.xml
        index.html
        ...
plugin-utils/
    badge.svg
    coverage/...
README.md   # auto-generated index
```

Reference a badge from your main `README.md`:

```markdown
![coverage](https://raw.githubusercontent.com/<owner>/<repo>/coverage/plugin-clean/badge.svg)
```

## Inputs

| Name | Default | Description |
| --- | --- | --- |
| `branch` | `coverage` | Orphan branch the action force-pushes to. |
| `coverage-paths` | `**/coverage` | Comma- or newline-separated globs of coverage folders. Supports `**`, `*`, `?`, `{a,b}`. |
| `ignore` | `**/node_modules/**` | Comma- or newline-separated globs to skip during discovery. |
| `metric` | `branches` | One of `lines`, `statements`, `branches`, `functions`. |
| `label` | `coverage` | Left-side label text on the badge. |
| `thresholds` | `50:red,60:orange,70:yellow,80:yellowgreen,90:green,100:brightgreen` | Comma-separated `<upTo>:<color>` pairs. The first bucket whose `upTo >= pct` wins. Colors can be one of `brightgreen`, `green`, `yellowgreen`, `yellow`, `orange`, `red`, `blue`, `lightgrey`, `grey`, or any `#rrggbb` / `#rgb` hex. |
| `precision` | `0` | Decimal places shown on the percentage (0..6). |
| `style` | `flat` | Reserved. Only `flat` is supported in v1. |
| `commit-message` | `chore: update coverage badges` | Commit message for the orphan branch commit. |
| `commit-user-name` | `github-actions[bot]` | Git user name for the commit. |
| `commit-user-email` | `41898282+github-actions[bot]@users.noreply.github.com` | Git user email. |
| `token` | `${{ github.token }}` | Token used to push the orphan branch. Requires `contents: write`. |
| `dry-run` | `false` | If `true`, badges are written into `.coverage-badge-out/` next to the workspace and nothing is pushed. |

## Outputs

| Name | Description |
| --- | --- |
| `branch` | The branch badges were pushed to. |
| `commit-sha` | SHA of the new commit on the orphan branch (empty on dry-run). |
| `badges-json` | JSON array `[{ path, metric, pct, color, format }]` describing every badge generated. |

## Custom thresholds

Threshold buckets are evaluated in ascending order; each bucket is the upper bound (inclusive) for the previous one. So:

```
thresholds: 60:red,80:yellow,100:brightgreen
```

means:
- `pct ≤ 60` → red
- `60 < pct ≤ 80` → yellow
- `80 < pct ≤ 100` → brightgreen
- anything > 100 falls back to the last bucket (brightgreen).

## Permissions

The job that uses this action must have `contents: write`:

```yaml
permissions:
    contents: write
```

## Output layout

For every discovered coverage folder, the badge is written **as a sibling** of that folder, preserving the source repo's path. This avoids any monorepo conventions and prevents filename collisions: each badge sits in its own directory.

A discovered folder at `pkg-a/coverage/` produces:
- `pkg-a/badge.svg` (the badge)
- `pkg-a/coverage/...` (the original coverage report files)

A top-level `README.md` is also generated on the orphan branch listing every badge.

## Local dry-run

Validate from any repo with coverage folders:

```sh
INPUT_DRY_RUN=true GITHUB_WORKSPACE="$PWD" \
  node /path/to/github-action-coverage-badge/src/main.js
```

Badges are written under `.coverage-badge-out/` mirroring the discovered layout.

## Development

```sh
bun install
bun test
bunx tsc -p .   # JSDoc type-check
```

## Troubleshooting

- **No coverage folders found.** Confirm `coverage-paths` matches your layout and that test scripts ran before this action. Check the action log — every candidate folder is logged.
- **`Permission denied` on push.** The workflow needs `permissions: contents: write` and the default `GITHUB_TOKEN` must not be restricted by repo settings.
- **Wrong percentage.** Detection prefers `coverage-summary.json` over detailed forms. If you see different numbers than expected, check the format selected in the action log; you can disable the summary by deleting it before running, or switch metrics with the `metric` input.
- **Badge looks broken.** SVGs use Verdana metrics; if your label is unusually long the rendered width is approximated and may slightly clip. Open an issue with the input/output if this is a problem in practice.

## License

MIT — see [LICENSE](./LICENSE).
