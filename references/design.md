# Design Aesthetics

Framework-agnostic guidance on building interfaces that look intentional, distinctive, and considered. The opposite of generic AI-generated styling.

## The Generic AI Look (and how to avoid it)

A specific aesthetic has emerged from AI-generated frontends. Avoid all of these signatures:

- **Inter (or Geist, or Space Grotesk) on pure white** with `text-slate-600` body text
- **Purple-to-pink linear gradients** on hero CTAs
- **Glassmorphism without context**: `backdrop-blur` cards floating on a colorful background
- **Centered-everything layouts**: hero text centered, three feature cards centered, centered CTA
- **Three-card pricing grid** with the middle card "highlighted" via gradient border
- **Lucide icons in 1.5px outline** at 20px above every section heading
- **A "trusted by" logo strip** with five evenly-spaced grayscale logos
- **A vague abstract gradient background** with low opacity blobs
- **Lorem-style placeholder copy** that says nothing specific
- **`text-balance` on every heading** with no concern for what's balanced
- **A FAQ section using `<details>`** as the last block before the footer
- **Footer with five columns of links** that nobody clicks

If your page reads like the list above, restart with an actual aesthetic direction.

## Pick a Direction (and commit)

Before designing, pick ONE aesthetic lane and execute it precisely. Bold maximalism and refined minimalism both work; the key is intentionality, not intensity.

### Aesthetic lanes (pick one)

| Lane | Personality |
|------|------------|
| **Refined minimal** | Quiet, generous whitespace, muted palette, distinctive type |
| **Editorial** | Magazine-like, serif display, asymmetric grids, considered photography |
| **Brutalist** | Raw, unstyled-feeling, monospace, hard borders, no shadows |
| **Maximalist / chaotic** | Layered textures, decorative elements, generous color, dense |
| **Retro-futuristic** | 80s/90s aesthetic, neon, CRT scan lines, monospace, deep blacks |
| **Organic / natural** | Soft curves, earthy palette, hand-drawn elements, pastels |
| **Industrial / utilitarian** | Engineering-feeling, technical drawings, fixed-width type, schematic |
| **Luxury / refined** | Restrained, elegant serifs, high contrast, generous space |
| **Playful / toy-like** | Bright, rounded, illustrated, animated micro-interactions |
| **Geometric / Bauhaus** | Primary colors, geometric shapes, grid-driven, sans-serif |
| **Magazine / softlit** | Pastel surfaces, large photography, warm shadows, lifestyle |
| **Cyberpunk / dark futurist** | Deep saturated darks, hard accent colors, glitch elements |

For each, commit to:

- One typeface family for headings, one for body (sometimes the same)
- A constrained palette (one dominant, 1-2 accents, neutral scale)
- Specific elevation/shadow language
- Specific border-radius scale
- Specific motion language

## Typography

Type is the single largest carrier of personality. Choosing fonts is the most consequential design decision.

### Type pairing

Pair a **distinctive display face** with a **refined body face**. Or use one excellent variable font for both.

Anti-pattern: pairing two similar sans-serifs. They fight without contrasting.

### Body face requirements

- Optimized for screens (hinted, generous x-height).
- Multiple weights available (regular, medium, semibold, bold minimum).
- Decent at small sizes (14-16px).
- Wide language coverage if you serve multiple locales.
- Variable font preferred (one file replaces 3-5 weights).

### Display face requirements

- Distinctive at large sizes.
- Less constrained on rendering quality (used 24-96px).
- Has personality. If your hero heading could be the logo of any other product, the type is too generic.

### Pairings that work (examples by lane)

| Lane | Display | Body |
|------|---------|------|
| Refined minimal | Söhne, Suisse Int'l, GT America | Söhne, Inter Display |
| Editorial | GT Sectra, Tiempos Headline, Fraunces (variable) | Source Serif, Tiempos Text, Newsreader |
| Brutalist | Söhne Mono, JetBrains Mono, Berkeley Mono | Söhne Mono, IBM Plex Mono |
| Maximalist | Migra, Pangea, Editorial New | Inter, Söhne |
| Retro-futuristic | VT323, Press Start 2P, IBM Plex Mono | IBM Plex Mono, Space Mono |
| Organic | Fraunces (variable), Saol, Reckless | Söhne, Untitled Sans |
| Industrial | Söhne Mono, Berkeley Mono | Söhne Mono |
| Luxury | Tiempos Headline, GT Sectra Display, Saol | Tiempos Text, GT America |
| Playful | Migra, Editorial New, ABC Diatype | Söhne, Untitled Sans |
| Bauhaus | Neue Haas Grotesk, Söhne, Inter | Same |
| Magazine | Tiempos Headline, GT Sectra, Newsreader | Newsreader, Source Serif |
| Cyberpunk | JetBrains Mono, Departure Mono, Berkeley Mono | Same |

If you don't have access to commercial faces, equivalent open-source options work:

- **Sans (refined)**: Inter Display, Manrope, Public Sans, Geist
- **Sans (characterful)**: Outfit, Bricolage Grotesque, Bagoss Standard
- **Serif (refined)**: Newsreader, Source Serif 4, Lora, Crimson Pro
- **Serif (display)**: Fraunces (variable), DM Serif Display, Playfair Display
- **Mono**: JetBrains Mono, IBM Plex Mono, Geist Mono, Departure Mono, VT323
- **Display / unusual**: Bagoss Condensed, Migra, Editorial New (paid), Bricolage Grotesque (variable, free)

Two families and four weights is the budget. Variable fonts let you stretch this without paying the byte cost.

### Type scale

Don't pick sizes by feel. Build a scale.

| Modular ratio | Use |
|--------------|-----|
| 1.125 (major second) | Dense UI, data-heavy surfaces |
| 1.2 (minor third) | Default for routine application UI |
| 1.25 (major third) | Generous, spacious layouts |
| 1.333 (perfect fourth) | Editorial, dramatic |
| 1.5 (perfect fifth) | Luxury, very dramatic |

Generate the scale once, use it everywhere. A common 1.25 scale at base 16px:

`12.8 -> 16 -> 20 -> 25 -> 31.25 -> 39 -> 48.8 -> 61 -> 76.3`

Round to whole pixels for crispness.

### Display type rules

- Tighter line height (1.0-1.2).
- Negative letter-spacing (-0.01em to -0.03em).
- Heavier weight at large sizes; medium or bold at very large feels right.
- Allow display headings to break the grid, overlap, or extend into margins for visual interest.

### Body type rules

- 16px minimum.
- 1.5-1.75 line height for paragraphs.
- 60-75 character line length.
- Default letter-spacing.
- Regular (400) for body, Medium (500) for UI labels, Semibold (600) for emphasis.

### Tabular figures

For prices, percentages, timers, data tables: use tabular figures (`font-variant-numeric: tabular-nums`). This prevents column shift between renders.

```css
.price, .stat {
  font-variant-numeric: tabular-nums;
}
```

### `text-wrap`

Modern CSS supports better text wrapping:

- `text-wrap: balance` for headings (browser balances lines for visual symmetry; works for short text).
- `text-wrap: pretty` for paragraphs (avoids orphans / one-word lines at the bottom).

Use `balance` only on H1/H2 (not on every heading). Use `pretty` on long-form copy.

## Color

### Palette construction

Start from purpose, not preference.

1. **Background neutral.** Light mode and dark mode need separate planning. Light: usually `#FAFAFA`, `#FFFFFF`, or a faint warm/cool tint. Dark: `#0A0A0B`, `#111`, or a colored dark (e.g., navy `#0B1020`).
2. **Foreground neutral.** Maximum contrast against background. Light mode: `#0A0A0B`. Dark mode: `#FAFAFA`. Add muted variants by reducing opacity (`rgba(...)` over the surface) or by mixing toward the background.
3. **Surface scale.** 3-5 elevation levels: background, surface, surface-elevated, surface-overlay, surface-modal. Each step lighter (in dark mode) or with more shadow (in light mode).
4. **Brand primary.** One color. Saturated enough to read on both backgrounds. Check both light and dark mode contrast.
5. **One or two accents.** Used sparingly for highlights, links, decorative elements. Should harmonize with the primary.
6. **Semantic colors.** Success (green), warning (amber/yellow), danger (red), info (blue). Each at 4.5:1 against surfaces.
7. **A neutral scale.** 9-12 stops between background and foreground (`50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`). Pick a neutral with a tint (slightly warm: `stone`; slightly cool: `slate`; colored: `zinc` or `gray`). Avoid pure neutral (`gray`) for character.

### Color philosophy

- **Dominant + sharp accents > evenly-distributed.** A timid palette where every color gets equal screen real estate reads as generic. Pick a dominant (the brand) and let it occupy 60-80% of accent area. Use accents (10-30%) for key calls. Reserve neutrals (the rest) for surfaces and text.
- **The 60-30-10 rule.** Roughly 60% neutral, 30% secondary, 10% accent. Adjust per page type.
- **Dark mode is its own design.** Don't invert. Pick darker, desaturated brand variants. A primary at `#5B5DEF` in light might become `#7376F5` in dark for proper contrast.
- **Saturation for hierarchy.** Higher saturation reads as more important. Use desaturated variants for less important elements.

### Color ratios (light mode)

| Element | Foreground | Background | Ratio |
|---------|-----------|------------|-------|
| Body text | `#0a0a0b` | `#ffffff` | 20:1 (AAA) |
| Body muted | `#525860` | `#ffffff` | 7:1 (AAA large) |
| Body subtle | `#71757b` | `#ffffff` | 4.6:1 (AA) |
| Borders | `#e4e4e7` | `#ffffff` | 1.4:1 (decorative; not text) |

### Color ratios (dark mode)

| Element | Foreground | Background | Ratio |
|---------|-----------|------------|-------|
| Body text | `#fafafa` | `#0a0a0b` | 19:1 (AAA) |
| Body muted | `#a1a1aa` | `#0a0a0b` | 7:1 (AAA large) |
| Body subtle | `#71717a` | `#0a0a0b` | 4.5:1 (AA) |
| Borders | `#27272a` | `#0a0a0b` | 1.4:1 (decorative) |

Dark mode borders are typically `rgba(255,255,255,0.08-0.12)` for subtle separation. Pure dark borders (`#000`) are invisible.

### Gradients

If you use gradients:

- **Mesh gradients** (multiple radial gradients overlaid) read more designed than two-stop linear gradients.
- **Subtle**: 2-3 stops with similar luminosity.
- **Avoid**: pure purple-to-pink at 45deg. It's the AI-generated cliche.
- **Brand-aware**: gradients should use brand-adjacent colors (analogous on the color wheel).

### Atmosphere

Solid color backgrounds are fine, but distinctive interfaces add atmosphere:

- Subtle film grain (1-3% opacity noise overlay).
- Soft radial gradient behind hero (off-center, low intensity).
- Decorative blur shapes positioned outside the main content (subtle, 5-10% opacity).
- Subtle dot or grid pattern (4-8% opacity).
- Off-page large type ghost letters (the brand name as decorative background).

Atmosphere should be subtle. If it competes with content, dial it down.

## Spacing and Composition

### Whitespace

Generous whitespace reads as confident and high-end. Cramped whitespace reads as utilitarian and dense.

Match whitespace to the lane:

- **Refined minimal / luxury**: very generous (sections separated by 96-128px).
- **Editorial**: rhythmic, varied (some tight, some open).
- **Maximalist**: tight, deliberate density.
- **Brutalist**: irregular; whitespace is a tool, not a default.

### Grids

A grid is a constraint. Picking one and breaking it intentionally is the point.

- **12-column** is the most flexible default; works for almost everything.
- **8-column** for tighter, denser layouts.
- **3, 5, 7** for editorial or asymmetric layouts.
- **No grid (bento, irregular)** for deliberately distinctive layouts.

### Asymmetry and grid-breaking

Symmetry is safe and a little boring. Breaking the grid creates visual interest:

- A heading that overlaps a column boundary.
- An image that bleeds off the page edge.
- A diagonal flow rather than horizontal rows.
- An element rotated 1-3 degrees.

Use sparingly. One grid-break per section, not every section.

### Bento grid

A modular grid where cards have variable spans (e.g., one large hero card, two half-width cards, four quarter-width cards). Effective for showing multiple features at varying weights. Don't overdo it; bento is its own style and doesn't fit every brand.

### Vertical rhythm

Lines of text should align to a baseline grid. Set `line-height` so multiples of it create natural rhythm.

If your scale is 16px body / 24px line-height, then a 4 or 8 px spacing scale will align naturally to the rhythm.

## Elevation and Shadow

Shadows convey depth, not decoration. Use a consistent shadow scale.

### Light mode

| Level | Shadow |
|-------|--------|
| Resting card | `0 1px 2px 0 rgba(0,0,0,0.04)` |
| Hover card | `0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)` |
| Modal / overlay | `0 24px 48px -8px rgba(0,0,0,0.18), 0 12px 24px -8px rgba(0,0,0,0.10)` |
| Popover | `0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.06)` |

### Dark mode

Shadows in dark mode often look fake. Prefer:

- Lighter borders to indicate elevation (instead of dark shadows).
- Subtle glow (1px outset shadow with a low-alpha brand color or white).
- Higher surface luminance for elevated elements (each elevation step is slightly lighter).

### Anti-patterns

- Drop shadows on every element.
- Shadows in random directions (some bottom-right, some bottom-left).
- Shadows with strong opacity (0.5+) that look like gameplay UI.

### Border radius

Pick a scale: `0`, `4px`, `8px`, `12px`, `16px`, `24px`, `9999px` (pill).

Match to the lane:

- **Brutalist**: 0 throughout.
- **Refined minimal**: 8-12px on cards, 6-8px on buttons, full pill on tags.
- **Playful**: 16-24px on everything.
- **Luxury**: 0-4px (sharper).

Pick a scale. Use it consistently.

## Iconography

### Sources

| Source | Style |
|--------|-------|
| **Lucide** | Refined outline, 1.5px stroke, 24x24 grid. Free, open-source. |
| **Heroicons** | Outline + Solid + Mini. By the Tailwind team. Free. |
| **Phosphor** | Six weights from thin to fill. Many use cases. Free. |
| **Iconoir** | Slightly more characterful outline. Free. |
| **Tabler** | Largest free set, 24x24, 2px stroke. |
| **Feather** | Original 24x24 outline (predecessor to Lucide). |
| **Remix Icon** | Many domains covered. Free. |
| **Iconjar / Streamline / Untitled UI Icons** | Premium, distinctive. |

Pick one set and stay. Don't mix.

### Custom icons

For brand-distinctive UI, design a small custom icon set in your distinctive style. Even 6-8 custom icons used in heroes/sections elevates a page beyond "Lucide on white".

## Imagery and Illustration

### Photography

- High quality, brand-relevant, original where possible.
- Consistent treatment (color grade, contrast, crop ratio).
- Avoid generic stock (the smiling business team in front of a window).
- Subjects diverse, contexts varied.
- Portrait photography: directional lighting, intentional background.
- Product photography: clean, consistent, scaled.

### Illustration

- Custom > stock illustration packs.
- Consistent style across the product (one illustrator's hand, or one style guide).
- Match to the brand. Cheerful illustrations don't fit a serious tool.
- Don't over-illustrate. One key illustration is more memorable than 12 mediocre ones.

### 3D

3D rendered objects/scenes are powerful when:

- They match the brand.
- They're rendered at high quality.
- They serve a purpose (a "tour" of a product, a metaphor).

Anti-pattern: a generic 3D blob or low-poly mascot dropped in for visual interest.

## Motion and Atmosphere

(See [motion.md](motion.md) for the full motion guide.)

Aesthetic uses of motion:

- One well-orchestrated entrance animation on page load (staggered reveals, hero parallax) creates more delight than scattered micro-interactions everywhere.
- Subtle ambient motion (a slow gradient shift, a hero element drifting 1-2px) gives the page life without distraction.
- Hover states with surprise (button text shifts forward, icon swaps direction, card lifts and tilts).

Match motion intensity to the lane:

- **Brutalist**: minimal motion. Snap transitions.
- **Refined minimal**: subtle, slow, considered.
- **Playful**: spring-physics, generous, characterful.
- **Cyberpunk**: glitch, scan, jitter.

## Layout Patterns That Read as "Designed"

Versus the AI default of "centered three cards over hero text with gradient":

- **Asymmetric hero** with the heading on the left and a visual on the right (or vice versa).
- **Editorial split** with content on the left third, large image on the right two-thirds.
- **Bento grid features** with variable card sizes.
- **Side-scrolling features** with a fixed left column and horizontally scrolling cards on the right.
- **Diagonal flow** sections (alternating left-aligned and right-aligned content).
- **Overlapping hero elements** where the visual partially covers the heading.
- **Decorative type** as a section divider (a giant ghost letterform behind the section).
- **Sticky aside with active section indicator** (long content with side nav).
- **Horizontal timeline** for narrative content.
- **Step-by-step mockup** showing the product changing state across the page.

## Dark Mode

### Don't invert

Inverting a light-mode design rarely works. Plan dark mode as its own design pass.

### Surfaces

- Background: deep, slightly tinted (not pure black, not pure gray). E.g., `#0B0B0F` or `#0F1117`.
- Surfaces are slightly lighter than the background (not the inverse of light mode).
- Multiple elevation levels by lightening, not by shadow.

### Brand color in dark

The brand primary often needs to be lighter and slightly desaturated in dark mode. Test contrast.

### Imagery

Photography in dark mode often needs a slight darken or color grade to feel cohesive. Illustrations may need dark-mode variants.

### State indicators

Borders, focus rings, hover states all need separate planning in dark mode.

## Brand Expression

The hardest design decision: how much brand to show.

### Restraint

Apple-like products are mostly neutral with brand appearing rarely (logo, accent CTAs). Lets product content be the hero.

### Expression

Notion or Linear: brand color in CTAs and key surfaces, decorative brand elements present but not dominant.

### Saturation

Indie or DTC: brand expressed everywhere, high saturation, distinctive type. The product is the brand.

Pick a level and commit. Mid-level brand expression often reads as confused.

## Voice

Visual design and verbal voice must match.

- **Refined**: precise, considered, never gimmicky.
- **Editorial**: thoughtful, well-written, references.
- **Playful**: human, warm, occasionally winking.
- **Industrial**: technical, accurate, terse.
- **Cyberpunk**: edgy, punchy, knows the audience.

Mismatched voice and visual is the biggest tell that a design is unfinished.

## Atmospheric Details

These are the small things that elevate a "fine" design to "considered".

- A custom cursor on a hero or feature surface (used sparingly; never globally).
- Hover-reveal of a hidden detail (a tiny annotation appearing on a chart hover).
- A delightful 404 page with a working interaction.
- A hand-coded animation in the empty state (not a stock Lottie).
- A custom illustration in the onboarding.
- A unique scroll-progress indicator.
- A custom selection color matching the brand.
- A signature link underline (animated thickness, custom dash, or position).
- Custom error illustrations.
- Carefully written microcopy with personality.

A brand is the sum of its details. The design ecosystem reads "considered" when at least 5-10 of these details exist.

## Reference Comparison Heuristics

When polishing an existing site against a reference (live URL, design export, prior production), use these tests to judge whether the audited surface meets the reference's level of discipline. Each test is a yes-or-no judgment supported by captured screenshots at both audit viewports.

1. First viewport has a clear hierarchy and does not feel accidental.
2. The brand or product is visible immediately when relevant.
3. The next section peeks intentionally rather than crowding the hero.
4. Repeated cards in a row align on top edges, bottom edges, and CTA baselines.
5. Text blocks have readable line lengths and consistent rhythm.
6. Labels, eyebrows, and badges use one visual language.
7. Buttons use one size system and one radius system.
8. Icons sit optically centered, not just mathematically centered.
9. Borders are subtle and consistent.
10. Shadows support hierarchy but do not muddy the palette.
11. Alternate background bands feel deliberate.
12. Mobile layout feels designed, not merely stacked.
13. Footer spacing is calmer than the body, with no stray gaps or cramped links.
14. Empty states, legal pages, and 404 pages share the same polish as marketing pages.
15. Same-family widgets look like members of one system across pages.
16. Variants are recognizably intentional, not accidental drift.

A site at reference level passes every test. A site at "fine" level fails three or more. Authoritative use lives in the multi-page polish workflow at [audit-workflow.md](audit-workflow.md) Phase 16; this section is a lookup for design review outside that workflow.

## Common Design Mistakes

- Two similar sans-serifs paired (no contrast).
- Centered everything (nothing leads the eye).
- Equal-weight feature cards (no hierarchy).
- Random spacing values (no rhythm).
- Mixing icon styles (loses cohesion).
- Drop shadows in random directions.
- Multiple gradient buttons of different colors.
- Light mode and dark mode designed at the same time as inversions.
- Decoration that distracts from content.
- Stock illustrations from the same pack everyone uses.
- A surface where every section has the same layout (visual monotony).
- A surface where every section has a different layout (visual chaos).

## Self-Healing for Design

Before declaring work complete:

- [ ] One aesthetic lane chosen and visible throughout
- [ ] Maximum 2 type families, 4 weights, distinctive choices
- [ ] One dominant color, 1-2 accents, semantic tokens defined
- [ ] Spacing scale chosen and used consistently
- [ ] Border-radius scale chosen and used consistently
- [ ] Shadow/elevation scale chosen and used consistently
- [ ] Iconography from one source, one stroke width, consistent sizes
- [ ] Light AND dark mode designed independently
- [ ] Motion language consistent (timing, easing, scope)
- [ ] At least one section breaks the safe centered layout
- [ ] At least 3-5 atmospheric details that wouldn't appear in an AI-default page
- [ ] Voice matches visual

## See Also

- [ui-ux.md](ui-ux.md) for the functional rules
- [motion.md](motion.md) for motion language
- [responsive.md](responsive.md) for layout systems
