# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Three new reference files: `references/audit-workflow.md` (19-phase multi-page audit and polish workflow with capture script and final acceptance gate), `references/components.md` (when to extract, the 11 widget families, component contract checklist, drift detection with collector snippet, CSS patterns that prevent drift), and `references/defects.md` (29-row symptom-to-fix lookup, canonical 9-check programmatic geometry sweep, per-check thresholds).
- Five new "Multi-page consistency" rules in SKILL.md (rules 31 through 35), covering extraction at three instances, no page-local CSS overrides on shared widgets, before-and-after screenshots at canonical viewports, re-render after every fix group on shared widgets, and a clean geometry sweep at `1440x900` and `375x812`.
- New "Multi-Page Polish Loop" section in SKILL.md indexing the 19 phases with deep links into `audit-workflow.md`.
- Six new gates in SKILL.md "Self-Improvement" for multi-page audit work (widget inventory built, baseline and after screenshots at both viewports, geometry sweep clean, drift collector clean, per-route audit table delivered).
- New "Canonical Audit Capture Viewports" subsection in `references/responsive.md` defining `1440x900` (desktop) and `375x812` (mobile) as the standard capture sizes for multi-page polish.
- New "Cross-page consistency" and "Mobile drawer scroll lock" subsections in `references/ui-ux.md`.
- New "Lang, Main, and Skip Link" mini-checklist in `references/accessibility.md`.
- New "Reference Comparison Heuristics" section in `references/design.md` (the 16 visual quality tests).
- New section 17 "Multi-Page Polish Gate" in `references/pre-launch.md` (renumbers the prior 17 to 18).
- New JS-sample policy in `CONTRIBUTING.md` (~30 line cap, standard DOM and CSSOM APIs only, framework-neutral introduction sentence).

### Changed

- Quick Reference in SKILL.md grew from 30 to 35 highest-leverage rules. Rules 1 through 30 keep their existing slots; rules 31 through 35 are appended under the new "Multi-page consistency" sub-heading. Section heading updated.
- "When to Use" in SKILL.md adds the multi-page audit and polish trigger.
- "Workflow" in SKILL.md frames the rendered browser as the source of truth and points readers to the Multi-Page Polish Loop when the work is auditing or polishing an existing site.
- Subsumed `visual-polish-websites` skill: every practice from that skill (operating rules, 19-phase workflow, widget inventory, screenshot-driven evidence, geometry sweep, defect lookup, reference-level heuristics, final acceptance gate) is now covered in the merged skill, with framework-named extraction examples replaced by a single framework-neutral component contract.
- Repositioned as an Agent Skills package supporting both Claude Code and OpenAI Codex CLI (plus any other harness that follows the open Agent Skills standard). README headline, package.json description, and keywords now lead with cross-harness framing rather than Claude-only branding. No content changes: the SKILL.md prose was already provider-neutral.
- Reordered package.json keywords to lead with `agent-skills`, `agents-md`, `codex`, `claude-code` so registry searches for open-standard terms surface this package first.
- Updated git-submodule install path in README from `.claude/skills/` to `.agents/skills/` to match the canonical install topology used by `@ctxr/kit`.
- Declared `publishConfig.access: "public"` so scoped npm publish does not require a trailing `--access public`.

## [0.1.0] - 2026-05-08

### Added

- Initial release. SKILL.md plus 11 reference docs covering Lighthouse mastery, performance optimisation, accessibility (WCAG 2.2 AA), SEO, UI/UX patterns, design aesthetics, responsive layout, motion and animation, forms and feedback, data visualisation, and a pre-launch verification checklist.
