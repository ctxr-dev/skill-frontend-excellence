# Frontend Excellence Skill (Claude Code, Codex CLI)

[![npm](https://img.shields.io/npm/v/@ctxr/skill-frontend-excellence)](https://www.npmjs.com/package/@ctxr/skill-frontend-excellence)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-Claude%20Code%20%7C%20Codex%20CLI-blue)](https://agentskills.io)

> Supports Claude Code and OpenAI Codex CLI via the open Agent Skills standard. Content-only Markdown: one entry point (`SKILL.md`) plus topical references under `references/`. No runtime, no scripts, no framework assumptions.

A holistic, framework-agnostic playbook for shipping ultra-fast, accessible, search-friendly, visually distinctive web interfaces. Combines Lighthouse mastery, UI/UX patterns, design aesthetics, performance, accessibility, SEO, motion, forms, layout, data visualization, and a 19-phase multi-page audit workflow with widget standardization and geometry sweeps. Every rule is expressed as a principle plus a concrete check, never as a library API, so the guidance applies to vanilla HTML/CSS/JS, React, Vue, Svelte, Astro, Solid, Next.js, Nuxt, SvelteKit, Remix, Qwik, Lit, and Web Components alike.

The skill encodes a single, opinionated bar (see [North Star Targets](#north-star-targets)). Treat any failure as a blocking defect, not a polish task.

## Quick Start

```bash
# Install into your project
npx @ctxr/kit install @ctxr/skill-frontend-excellence
```

Open the project in any Agent Skills-compatible harness. The skill auto-activates from its YAML frontmatter the moment a prompt touches how an interface looks, feels, moves, loads, ranks, or is interacted with. There is no slash command to invoke; the skill is content-only.

## Prerequisites

- An Agent Skills-compatible harness ([Claude Code](https://claude.ai/code) CLI/IDE, or OpenAI Codex CLI)
- A project directory where you want the skill installed. Project-scope installs land at `.agents/skills/skill-frontend-excellence/`; user-scope installs (`--user`) land at `~/.agents/skills/skill-frontend-excellence/`. Discovery-mirror symlinks at `.claude/skills/` (and `~/.codex/skills/` at user scope) are created automatically so both harnesses find the skill without extra configuration.

## Installation

### Manual

```bash
git clone https://github.com/ctxr-dev/skill-frontend-excellence.git /tmp/skill-frontend-excellence
mkdir -p .agents/skills
cp -r /tmp/skill-frontend-excellence .agents/skills/skill-frontend-excellence
```

### Git Submodule

```bash
git submodule add https://github.com/ctxr-dev/skill-frontend-excellence.git \
    .agents/skills/skill-frontend-excellence
```

Pins the skill at a specific commit; update explicitly via `git submodule update --remote`.

## Usage

Agent Skills-compatible harnesses (Claude Code, Codex CLI) surface this skill automatically based on the YAML frontmatter at the top of `SKILL.md`. The `description` field tells the host when to load it: any prompt that touches how an interface looks, feels, moves, loads, ranks, or is interacted with will trigger activation.

When the skill is active, the host reads `SKILL.md` first (the entry point with the North Star Targets, priority stack, workflow, the Multi-Page Polish Loop, and the 35 highest-leverage rules), then loads only the topical reference under `references/` that matches the current work. There is nothing to invoke manually; install the skill and proceed with the task.

For the canonical entry point, read [`SKILL.md`](SKILL.md).

## What's Inside

| File | Use when |
|------|---------|
| [SKILL.md](SKILL.md) | Entry point. North Star Targets, priority stack, workflow, Multi-Page Polish Loop, the 35 highest-leverage rules, self-improvement checklist. |
| [references/lighthouse.md](references/lighthouse.md) | Running a Lighthouse audit, interpreting scores, fixing failing audits, setting up CI gates. |
| [references/performance.md](references/performance.md) | Optimizing assets, JS execution, hydration, render strategy, network, caching, fonts, images. |
| [references/accessibility.md](references/accessibility.md) | WCAG 2.2 AA: semantic HTML, ARIA, keyboard, focus, screen reader, contrast, dynamic type, reduced motion. |
| [references/seo.md](references/seo.md) | Meta tags, headings, structured data, canonicals, sitemaps, robots, internal linking, content quality. |
| [references/ui-ux.md](references/ui-ux.md) | Touch targets, navigation, density, hover/press/focus states, hierarchy, empty/loading/error states. |
| [references/design.md](references/design.md) | Typography, color, spacing, composition, atmosphere, dark/light parity, avoiding generic AI styling. |
| [references/responsive.md](references/responsive.md) | Breakpoints, mobile-first, container queries, fluid typography, safe areas, viewport units. |
| [references/motion.md](references/motion.md) | Timing, easing, principles, reduced-motion, transform-only animation, choreography. |
| [references/forms.md](references/forms.md) | Validation, error placement, autofill, autosave, success/error states, multi-step flows. |
| [references/data-viz.md](references/data-viz.md) | Chart selection, axes, legends, color, accessibility, large datasets. |
| [references/pre-launch.md](references/pre-launch.md) | Final verification gate before declaring a page complete. |
| [references/audit-workflow.md](references/audit-workflow.md) | Auditing or polishing an existing multi-page site against a reference; route-by-route capture, fix, and verify procedure. |
| [references/components.md](references/components.md) | Standardizing repeated widgets, defining component contracts, detecting drift across pages. |
| [references/defects.md](references/defects.md) | Symptom-to-fix lookup for common visible defects and the canonical programmatic geometry sweep. |

## North Star Targets

Every interface should meet these bars before being considered "done". Treat any failure as a blocking defect, not a polish task.

| Category | Mobile target | Desktop target | Source |
|----------|--------------|----------------|--------|
| Lighthouse Performance | >= 95 | >= 99 | Lighthouse |
| Lighthouse Accessibility | 100 | 100 | Lighthouse + axe |
| Lighthouse Best Practices | 100 | 100 | Lighthouse |
| Lighthouse SEO | 100 | 100 | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | < 2.0s | Core Web Vitals |
| Interaction to Next Paint (INP) | < 200ms | < 200ms | Core Web Vitals |
| Cumulative Layout Shift (CLS) | < 0.1 | < 0.05 | Core Web Vitals |
| Time to First Byte (TTFB) | < 800ms | < 600ms | Core Web Vitals |
| First Contentful Paint (FCP) | < 1.8s | < 1.0s | Lighthouse |
| Total Blocking Time (TBT) | < 200ms | < 100ms | Lighthouse |
| Initial JS payload (gzipped) | < 90 KB | < 130 KB | Budget |
| Initial CSS payload (gzipped) | < 25 KB | < 35 KB | Budget |
| Web font payload (per screen) | <= 2 families, <= 4 weights | same | Budget |

These are the universal bar. A given project may consciously relax a budget for a specific surface (e.g., a heavily interactive client-rendered tool that legitimately ships more JS), but the relaxation should be a recorded, justified exception, not a default.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, editing conventions, and the strict style rules (framework-agnostic phrasing, generic placeholders, no em or en dashes).

## Releasing

Releases are PR-gated. Version bumps land on `main` through a review gate like any other change; only the tag push and npm publish are automated.

1. **Actions, Release, Run workflow.** Branch selector: `main` (the workflow refuses any other ref). Version bump: `patch`, `minor`, or `major`.
2. The workflow bumps `package.json` on a fresh `release/v<version>` branch and opens a release PR.
3. Review and merge the PR (the diff is just version fields).
4. On merge, `tag-on-main.yml` detects the version change, creates the annotated `v<version>` tag, and pushes it.
5. The tag push triggers `publish.yml`, which runs validation, verifies tag/version agreement, and publishes to npm via OIDC trusted publishing.

See [GitHub Releases](https://github.com/ctxr-dev/skill-frontend-excellence/releases) for the changelog, and [CHANGELOG.md](CHANGELOG.md) for the in-repo history.

## License

[MIT](LICENSE)
