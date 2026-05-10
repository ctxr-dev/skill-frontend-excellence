# Contributing to skill-frontend-excellence

This is a content-only skill: every change is to a Markdown file under `SKILL.md` or `references/`. There is no runtime to wire up, no FSM to author, no corpus to rebuild. The discipline lives in the prose.

## Local Setup

```bash
git clone https://github.com/ctxr-dev/skill-frontend-excellence.git
cd skill-frontend-excellence
npm install
```

`npm install` pulls in `markdownlint-cli2` and sets up the Husky pre-commit hook, which runs the validators (markdown lint plus the em/en dash guard) before every commit.

## Editing

The two files you will touch:

- `SKILL.md` (entry point, North Star Targets, priority stack, the 35 highest-leverage rules, multi-page polish loop)
- `references/<topic>.md` (deep dives: lighthouse, performance, accessibility, seo, ui-ux, design, responsive, motion, forms, data-viz, pre-launch, audit-workflow, components, defects)

After every edit, run:

```bash
npm run validate
```

This runs:

- `markdownlint-cli2` over `SKILL.md` and `references/**/*.md`
- `node scripts/check-no-dashes.mjs` to reject em (U+2014) and en (U+2013) dashes

Both must pass before commit. The pre-commit hook enforces this.

## Style Rules

These are strict. Failing any of them is a defect, like a failing test.

- **Framework-agnostic.** Express every rule as a principle plus a concrete check. Never name a library API (no `useEffect`, no `getServerSideProps`, no `<Image />`). When a rule is naturally tied to a platform feature (Service Workers, `<picture>`, `font-display`), name the standard, not the framework that wraps it.
- **Generic placeholders only.** No project-specific brands, products, or domain names (no Acme, no Stripe, no example.com plot devices that imply a real product). Use `your-app`, `your-domain`, `Product Name`, or omit the example entirely.
- **No em or en dashes.** Use commas, colons, parentheses, or line breaks. The repo enforces this via `scripts/check-no-dashes.mjs`. (Yes, every contributor hits this once.)
- **Consistent voice.** Match the existing references: short declarative sentences, lists over prose where possible, every rule actionable. Avoid hedge words ("perhaps", "might be", "tends to") when a concrete threshold exists.
- **Concrete thresholds win.** Prefer "contrast >= 4.5:1" over "good contrast", "<= 90 KB gzipped" over "small bundle", "44x44pt" over "comfortable touch targets".
- **One H1 per file, sequential headings.** No skipped levels. The skill itself follows the rules it teaches.
- **JS code samples in references are illustrations, not deliverables.** Keep each in the 30 to 50 line range; longer snippets are smelly and fragment into smaller pieces. Use only standard DOM and CSSOM APIs (`document.querySelectorAll`, `getComputedStyle`, `getBoundingClientRect`, etc.) plus standard Node modules where the snippet runs the browser (e.g., `fs`, `path`, `puppeteer`). Introduce every browser-automation snippet with the framework-neutral phrasing "Run from a headless browser of your choice (Puppeteer, Playwright, or equivalent)". Do not name a test runner, build tool, or component library inside the snippet itself beyond the launcher line. Even when a pattern is naturally associated with one framework, the reference must phrase it as a principle plus check, not a library API.

## Commits

Conventional commit messages are documented convention; commitlint is not enforced. Examples:

```text
feat(performance): add resource hints decision matrix
fix(accessibility): correct contrast threshold for large text
docs(readme): clarify submodule install path
chore(lint): bump markdownlint-cli2
```

Types in use: `feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `test`. Scope is the affected file or topic (e.g., `performance`, `seo`, `readme`).

## Pull Requests

Open PRs against `main`. CI runs `npm run validate` and must pass. Keep PRs focused: one topical reference, or one cross-cutting principle, per PR. Larger restructures get their own PR with a brief rationale in the description.

## Releasing (Maintainers Only)

The release flow is PR-gated; the bot does not push to `main` directly.

1. **Actions, Release, Run workflow.** Branch: `main` (any other ref is rejected). Version bump: `patch`, `minor`, or `major`.
2. The workflow bumps `package.json` on a `release/v<version>` branch and opens a release PR.
3. Review and merge the PR.
4. `tag-on-main.yml` detects the version change on the merge commit, creates the annotated `v<version>` tag, and pushes it.
5. The tag push triggers `publish.yml`, which validates and publishes to npm via OIDC trusted publishing.

Full operator walkthrough (including troubleshooting for stale tags, non-main dispatches, and the "Allow GitHub Actions to create and approve pull requests" org-level policy) lives in the [Releasing section of the README](README.md#releasing).
