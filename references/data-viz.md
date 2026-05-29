---
title: Data Visualization
purpose: Chart selection, axes, color, accessibility for charts and tables, Canvas vs SVG vs WebGL rubric, timezone and DST handling, annotations, streaming chart performance, geographic projections.
load-when:
  task-keywords: [chart, data viz, axis, legend, colorblind, Canvas, SVG, WebGL, timezone, DST]
  symptoms: [contrast fail, slow page, slow interaction]
prereq: SKILL.md
related: [accessibility.md, responsive.md, motion.md, performance.md]
size: ~555 lines
---

# Data Visualization

Framework-agnostic guidance on charts, tables, and data-dense interfaces. Library-agnostic; the same principles apply to D3, Chart.js, Recharts, ECharts, Highcharts, Vega-Lite, and others.

## The Hierarchy of Data Display

When showing data, walk this list. The first that fits is the right choice.

1. **One number with context.** "$48,231 monthly recurring revenue" beats a chart with one data point.
2. **Comparison or ranking** (top 5, top 10). A list with bars beats a pie chart.
3. **Trend over time.** A line chart.
4. **Distribution.** Histogram, box plot.
5. **Composition.** Stacked bar, treemap.
6. **Relationship between two variables.** Scatter plot.
7. **Geographic.** Map.
8. **Detailed records.** Table.

If you reach for a chart and a table or summary number works, use the simpler thing.

## Choosing the Right Chart

| Data | Best chart | Avoid |
|------|-----------|-------|
| Single value | Stat card with sparkline | Chart |
| Trend over time | Line chart | Pie chart |
| Compare 2-10 categories | Bar chart (horizontal if labels long) | Pie chart |
| Compare 10-30 categories | Horizontal bar | Vertical bar (cramped on mobile) |
| Compare > 30 categories | Top N + "Other" or table | Bar chart with all |
| Composition (parts of whole, 2-5 categories) | Pie or donut | Pie with > 5 |
| Composition over time | Stacked area | Pie carousel |
| Distribution | Histogram or box plot | Bar chart of raw values |
| Two-variable relationship | Scatter plot | Two side-by-side bar charts |
| Multiple metrics over time | Multi-line, small multiples | Stacked line (hides individual values) |
| Geographic | Choropleth map | Pie chart |
| Hierarchical composition | Treemap or sunburst | Stacked bar |
| Funnel (sequential drop-off) | Funnel chart | Bar chart |
| Network / relationships | Graph / network diagram | Table |

### Pie/donut rules

- Maximum 5 categories. Beyond that, switch to bar.
- Sum to 100%.
- Order by size (largest first, clockwise from 12 o'clock).
- Direct-label slices when space allows; legend if not.
- Don't 3D pie. Ever.
- Don't compare two pies side by side; use a stacked bar.

### Bar chart rules

- Bar baseline at zero. Always.
- Vertical bars for short labels, horizontal for long.
- Order by value (descending) unless there's a natural order (months, ranks).
- Spacing between bars: about 30-40% of bar width.
- Categorical x-axis on horizontal; numerical on vertical.

### Line chart rules

- Time on the x-axis.
- Multiple lines: maximum 5 before they tangle.
- Distinct color or dash pattern per line.
- Direct-label lines at the right end where space allows.
- Connect data points; don't put markers on every point unless you want emphasis.

## Axes

### Labels

- Always label both axes.
- Include units in the axis label or as a suffix on tick labels ("$", "%", "ms").
- Don't rotate labels 90 degrees on horizontal bars; just go horizontal-bar layout.
- Auto-skip labels when they overlap (every other, or larger interval).

### Ticks

- Use round numbers (10, 20, 50, 100), not 7, 23, 47.
- 4-7 ticks per axis is usually right.
- Y-axis baseline at zero for bar charts. Truncating the y-axis exaggerates differences.
- For dramatic small variations, add a "broken axis" indicator (zigzag) to be honest about it.

### Time axis

- Match granularity to the time range:
  - < 1 day: hours
  - 1-30 days: days
  - 1-12 months: weeks or months
  - 1-5 years: months or quarters
  - > 5 years: years
- Allow user to change granularity (day/week/month).
- Show the date format consistent with the user's locale.

#### Timezone and DST handling

Time-series charts get timezone wrong more often than any other single thing. The discipline:

- **Store every timestamp in UTC.** Server, database, transport layer, JSON payload, log line, exported CSV: all UTC. A timestamp without a timezone is a defect; a timestamp in "local server time" is a worse defect.
- **Display in the user's local timezone.** Use the browser's `Intl.DateTimeFormat` with `timeZone` defaulting to the user's `Intl.DateTimeFormat().resolvedOptions().timeZone`. For dashboards where the timezone is meaningful (operations, finance), expose a timezone picker and persist the choice.
- **Use ISO 8601 with a timezone offset.** `2026-03-08T07:00:00Z` (UTC) or `2026-03-08T02:00:00-05:00` (with offset) parses unambiguously in every runtime. `2026-03-08 02:00:00` (no offset) silently falls back to the local timezone, which is the local timezone of WHICHEVER MACHINE PARSES IT. That is how a server-generated timestamp ends up displayed three hours off.
- **DST creates the "missing hour" gap.** In the US, on the spring-forward Sunday, the clock jumps from `01:59:59` to `03:00:00` local time. A bar chart bucketed by local hour has an empty `02:00` bucket. A line chart with hourly ticks shows a gap. Two strategies: bucket by UTC and label by local (the bucket boundaries are even; the labels show the jump), or bucket by local and explicitly draw the DST transition as a vertical reference line so users see why the chart looks unusual.
- **The "extra hour" gap is the reverse.** Fall-back day has 25 hours, with `01:00` to `02:00` happening twice. Sum-by-day operations double-count that hour. Always sum from UTC.
- **Axis ticks across DST boundaries.** A "every 6 hours" tick on a UTC-bucketed local-labelled axis lands at unfamiliar wall-clock times across DST. A "every 6 hours local" tick on a UTC axis lands at uneven UTC offsets. Pick the one that matches the user's mental model (operations: UTC ticks; analytics: local ticks).

### Number formatting

- Locale-aware via `Intl.NumberFormat`.
- Compact notation for large numbers: `1.2M`, `4.7K`.
- Currency: respect locale and currency code.
- Percentages: 1 decimal (`23.4%`) for finance, no decimals (`23%`) for categorical.

## Color in Charts

### Single series

- Use the brand primary or a single neutral.
- Add a slight gradient (top to bottom) only on filled area charts; never on bar charts (looks gimmicky).

### Multiple series

- Sequential (ordered, e.g., low to high values): single hue, light to dark. Use a perceptually uniform scale (viridis, magma).
- Diverging (centered, e.g., positive vs negative): two-hue diverging palette (blue-white-red).
- Categorical (no order, e.g., Series A vs Series B vs Series C): qualitative palette, distinct hues. Use a colorblind-safe palette.

### Colorblind-safe palettes

Avoid red/green pairs alone. Use:

- Tol's "bright" palette: blue, red, green, yellow, cyan, purple, gray (distinguishable in most colorblind types).
- ColorBrewer's "Set2" or "Dark2".
- Always supplement color with shape/pattern/label so meaning isn't lost.

### Pattern alongside color

For stacked bars or pies, use a subtle hatching/dot pattern in addition to color. Color carries the primary signal, pattern carries redundancy:

```css
.series-a { fill: var(--color-1); }
.series-b { fill: var(--color-2); background-image: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px); }
```

### Contrast against background

Data marks (bars, lines) need at least 3:1 contrast against the chart background. Text labels need 4.5:1.

In dark mode, lighten the data marks. Don't just keep light-mode colors.

## Legends

- Always show a legend for multi-series charts.
- Place near the chart, not detached below a scroll fold.
- Order matches data (largest to smallest, or alphabetical).
- For interactive charts, legends are clickable to toggle series visibility.
- Direct labeling (label at the line/bar) often beats a separate legend.

## Tooltips

- Show on hover (desktop) or tap (mobile).
- Show the exact value (numeric labels are too small for crowded charts; tooltips fill in).
- Label which series, the x value, and the y value.
- Anchor near the cursor; don't make the user scan.
- Persist long enough to read (don't dismiss on tiny mouse movement).

```
[X-axis label, e.g., March 12]
Series A: 12,400 (+18%)
Series B:  8,200 (-3%)
```

For accessibility, tooltip content must be reachable via keyboard (focus on data point reveals tooltip).

## Direct Labeling

For small datasets, label values directly on the chart instead of forcing the eye to travel to an axis:

- Bar chart with 3-5 bars: put the value on or above each bar.
- Line chart: put the value at the rightmost point of each line.
- Pie chart: put values inside slices (or outside with a leader line if too small).

## Annotations and Reference Lines

Charts that show context (a target, a threshold, a deploy event, an anomaly) tell a story; raw data alone often does not. Five annotation types and how to layer each:

- **Threshold bands.** A shaded horizontal region marking the acceptable range (SLA 99 to 100 percent, page load good zone 0 to 2.5s). Drawn as a low-opacity `<rect>` BEHIND the data marks. Label the band, not just the boundary.
- **Target lines.** A single horizontal reference line showing the goal. Dashed, distinct color, label at the right end ("Target: 250ms"). The line sits BEHIND the data marks; the label sits ABOVE or to the side so it never overlaps.
- **Deploy or event markers.** Vertical lines at meaningful x-values (a deploy, a campaign launch, an incident). Color and dash pattern differ from data lines. Label rotated 90 degrees along the line OR a small icon at the top with a tooltip on hover.
- **Anomaly callouts.** A circle plus arrow plus short text pointing at a specific data point ("Spike: payment system outage"). Visible from the static chart; tooltip on hover for the full story.
- **Range brackets.** A horizontal bracket spanning an x-axis range (a period of degraded performance, a holiday season). Label at the top of the bracket.

Layering rule: data marks always on top; annotations behind. The exception is labels, which sit above data marks to stay readable. Annotations carry their own contrast budget (3:1 against the chart background) and their own color budget (distinct from any data series color). A target line that uses the same color as a data series is a defect; the eye reads them as one.

Build annotations from a structured list (source of truth) so the chart and the underlying data pipeline can never disagree.

## Maps and Geographic Projections

Every flat map of a round Earth distorts something. The choice of projection determines what is distorted and how badly. The defect: shipping a Mercator world map for a statistical comparison and accidentally making Greenland look bigger than Africa.

- **Mercator.** Preserves shape and direction; massively inflates area at high latitudes (Greenland appears the size of Africa; Russia looks larger than the entire African continent). Use ONLY for street maps and navigation, where shape and direction are the question. Never for statistical comparisons across latitudes.
- **Equal Earth.** Preserves area; mild shape distortion. The modern default for world-scale choropleths and heatmaps. Designed in 2018 specifically for statistical maps.
- **Albers Equal Area.** Preserves area; designed for a specific region (Albers USA, Albers Europe). The standard projection for US state-level and country-level statistical maps. Comes pre-tuned in most viz libraries.
- **Robinson and Winkel Tripel.** Compromise projections that distort everything slightly rather than one thing badly. Robinson is the National Geographic default; Winkel Tripel is now the National Geographic Society default. Use when neither shape nor area is the primary question.
- **Orthographic.** A view of the Earth as a sphere from a fixed viewpoint. Use for animated globe views or hero illustrations; not for analysis.

Match the projection to the use case: street map, Mercator; statistical world map, Equal Earth; US statistical map, Albers USA; aesthetic globe, Orthographic. Name the projection in code (`d3.geoEqualEarth()`, not "the default projection"); the default in most libraries is Mercator, which is rarely what a statistical chart wants.

## Animation

### Entrance animation

- Bars rise from the baseline, 400-600ms staggered by 30-50ms per bar.
- Lines draw from left to right, 600-800ms total.
- Pies sweep from 12 o'clock clockwise, 800-1000ms.

### Update animation

When data changes:

- Animate from old to new values, 300-500ms.
- Use ease-out.
- Animate the path's `d` attribute or use a library helper for smooth transitions.

### When to disable

- `prefers-reduced-motion: reduce`: skip entrance animation; show data immediately.
- Live-updating data views: no animation on every refresh; just update.
- Print: no animation.

```js
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
chart.options.animation = reduced ? false : { duration: 600, easing: 'easeOutQuart' };
```

## Accessibility

### Screen readers

Charts are inherently visual. Provide a text alternative:

- Concise summary near the chart describing the key insight (one sentence stating the trend or comparison the chart shows).
- A data table either inline or in a `<details>` toggle, with the same data the chart shows.
- For complex charts, use `aria-describedby` to link the chart to a longer description.

```html
<figure>
  <figcaption>Chart caption describing what is plotted</figcaption>
  <div class="chart" role="img" aria-labelledby="chart-summary">
    <svg>...</svg>
  </div>
  <p id="chart-summary">
    One sentence stating the key insight the chart conveys, in plain language, with the headline numbers.
  </p>
  <details>
    <summary>View data table</summary>
    <table>
      ...
    </table>
  </details>
</figure>
```

### Keyboard

- Interactive elements (data points, legend items) must be focusable.
- Arrow keys navigate between data points (left/right for adjacent, up/down for series).
- Enter/Space activates (toggles legend, drills down).
- Esc closes any popover or expanded view.

### Touch targets

Interactive chart elements (data points, legend toggles) need at least 44x44 touch area. For dense charts, expand the hit area beyond the visual element:

```html
<circle cx="100" cy="50" r="4" />
<circle cx="100" cy="50" r="22" fill="transparent" pointer-events="all" />
```

The visible dot is 4px; the touch target is 22px (44px diameter).

## Responsive Charts

### Reflow at small widths

Charts must adapt or simplify on small screens:

- Vertical bars become horizontal bars (long labels easier).
- Multi-line charts collapse to top-N or to small multiples.
- Pie charts stack labels below.
- Axis ticks reduce to 3-5 from 7-10.

### Container query

Charts that appear in different layout slots benefit from container queries:

```css
.chart-container { container-type: inline-size; }

@container (max-width: 480px) {
  .chart .legend { display: none; }
  .chart .axis-label { font-size: 0.75rem; }
}
```

### Re-render on resize

For SVG-based charts, listen to resize and re-render with new dimensions. Throttle to 100-200ms.

## Loading and Error States

### Loading

- Show a skeleton or shimmer matching the chart's eventual shape.
- Don't show a blank axis frame; that looks broken.

### Empty data

- Show a message: "No data for this period yet."
- Optionally a placeholder chart (greyed out) with the message overlaid.
- Action: "Try a different range" or "Connect data source".

### Error

- Show an error message with retry: "Couldn't load chart. Retry?"
- Don't show a broken/clipped chart.

## Large Datasets

For 1000+ data points:

- **Aggregate.** Group by hour/day/week to reduce point count.
- **Sample.** Show every Nth point.
- **Summarize.** Show the trend; provide drill-down for detail.
- **Virtualize.** For long tables, only render visible rows.
- **Server-side processing.** Aggregate on the server; ship summarized data.
- **Web Workers.** For client-side heavy aggregation, move work off the main thread.

Anti-pattern: shipping 50,000 points to a `<canvas>` chart and expecting smooth interaction.

### Canvas vs SVG vs WebGL: rendering rubric

Pick the renderer by data-point count first, then by interaction model.

| Renderer | Data point ceiling | Interaction model | Accessibility | Use when |
|----------|-------------------|------------------|---------------|----------|
| SVG | About 500 nodes | DOM-native: each mark is an element, click and hover are free | Each `<rect>` or `<circle>` is a DOM node, focusable, screen-reader addressable | Bar charts, small line charts, charts with rich per-mark interaction (tooltip, click-to-drill, focus-to-announce), charts that need to be inspectable in DevTools |
| Canvas | About 100,000 points | Pixel-based: hit-testing requires a hit-region map or a quadtree; no DOM cost | Inherently inaccessible; pair with a `<table>` fallback or a `role="img"` plus `aria-label` summary | Time-series with thousands of points, scatter plots with dense clouds, heatmaps |
| WebGL | Above 100,000 points or when shaders are needed | Pixel-based, GPU-accelerated; same hit-testing problem as Canvas plus GPU memory budget | Same accessibility problem as Canvas; same fallback story | Million-point scatter, real-time streaming dashboards with many series, anything that needs per-mark shading (instanced rendering, density estimation) |

Rule of thumb:

- **Under 500 marks: SVG.** The DOM tax is negligible, interaction is free, accessibility is best.
- **500 to 100,000 marks: Canvas.** SVG starts dropping frames at hover; Canvas stays smooth. Add a quadtree for hover hit-testing.
- **Above 100,000 marks or shader effects: WebGL.** Use a library that handles the WebGL boilerplate (deck.gl, regl-based wrappers). Expect to write your own picking pipeline.

Hybrid is common: render the data layer in Canvas or WebGL for speed, render the axes, legends, and overlay annotations in SVG on top so they are accessible. The two layers share a coordinate system.

## Tables

### Anatomy

```html
<table>
  <caption>Table caption describing the data</caption>
  <thead>
    <tr>
      <th scope="col">Row category</th>
      <th scope="col">Metric A</th>
      <th scope="col">Metric B</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Row label</th>
      <td>4,200,000</td>
      <td>+12%</td>
    </tr>
    ...
  </tbody>
</table>
```

- `<caption>` describes the table.
- `<th scope="col">` for column headers, `<th scope="row">` for row headers.
- For complex tables (multi-level headers), use `headers="..."` to associate cells with their headers.

### Visual rules

- Tabular figures (`font-variant-numeric: tabular-nums`) for numeric columns.
- Right-align numbers, left-align text, center-align symbols/icons.
- Subtle row dividers (low-contrast borders) rather than alternating row colors. Alternating colors look dated and reduce readability.
- Sticky header for long tables (`position: sticky` on `<thead>`).
- Hover state on rows for navigability.

### Sorting

- Click column header to sort ascending; click again for descending.
- Show current sort direction with an arrow icon.
- Use `aria-sort="ascending|descending|none"` on the column header.
- Multi-column sort: hold Shift to add additional sorts.

### Filtering

- Per-column filters: dropdown, search, range slider depending on data type.
- Active filters visible as chips above the table.
- "Clear all" link.

### Selection

- Checkbox per row.
- Select-all checkbox in the header (with indeterminate state for partial selection).
- Show count of selected rows.
- Bulk actions appear when rows selected.

### Pagination vs infinite scroll

- **Pagination** for tables: predictable, accessible, supports deep linking.
- **Infinite scroll** for activity feeds: low-stakes, sequential reading.
- Don't mix.

### Mobile tables

For wide tables on small screens:

- **Horizontal scroll** with sticky first column (the row identifier).
- **Card view**: each row becomes a card, fields as label/value pairs.
- **Collapse**: show a few key columns, expand row to see all.

```css
.table-scroll {
  overflow-x: auto;
  scrollbar-width: thin;
}

.table-scroll table {
  min-inline-size: 720px;
}
```

## Stat Cards / KPI Tiles

For data summaries, the most important number gets a stat card:

```
[ Stat Card ]
[ Label: short description of the metric ]
[ Value: the formatted number, largest type ]
[ Change: direction icon + delta vs comparison period ]
[ Sparkline: subtle line chart of recent history ]
```

Rules:

- Label first (small, muted).
- Value largest (display type).
- Change indicator with direction icon and color (green up, red down). Pair with text so color isn't the only signal.
- Optional sparkline. Subtle (single neutral color), no axis.
- Optional click affordance to drill down.

## Real-Time Updates

For live-updating data:

- Update without animation (or very subtle pulse on changed values).
- Don't shift other content. New rows arrive at the top with a brief highlight.
- Allow pause/resume so users can read without flicker.
- Show last-updated timestamp.

### Streamed chart performance

A chart that receives 100 messages a second from a WebSocket and re-renders on every message will pin the main thread and stutter. Four techniques to keep the chart smooth at high stream rates:

- **rAF-coalesce updates.** Buffer incoming events; redraw once per `requestAnimationFrame`. The screen refreshes at 60 Hz (or 120 Hz on high-refresh displays); rendering faster than that wastes CPU and creates jank. Per frame: drain the buffer, push points into the data structure, redraw once.

  ```js
  let pending = [];
  let scheduled = false;

  socket.addEventListener('message', (event) => {
    pending.push(JSON.parse(event.data));
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(flush);
    }
  });

  function flush() {
    scheduled = false;
    for (const point of pending) ringBuffer.push(point);
    pending = [];
    renderChart(ringBuffer);
  }
  ```

- **Ring buffers for fixed-size sliding windows.** A live chart shows the last N seconds or last N points. Use a ring buffer (a fixed-size array with a head pointer) so the data structure does not grow unbounded. Old points fall off the back as new points push on the front; the chart re-renders from the buffer's current view.
- **Off-screen Canvas via OffscreenCanvas plus transfer to main.** Move the rendering work to a Web Worker. The worker holds an `OffscreenCanvas`, draws into it, and the main thread composites the result. The main thread stays responsive for user input (panning, hovering, clicking the pause button) even while data arrives at full rate.
- **Cap update rate to display refresh.** If the data rate is 1000 messages a second and the display is 60 Hz, render at 60 Hz; throttle further (30 Hz, 15 Hz) when the chart is off-screen, in a background tab (`document.visibilityState === 'hidden'`), or when the user is interacting with a different region.

The four techniques compose: rAF-coalesce caps the render rate, ring buffers cap the data size, OffscreenCanvas moves the work off-main-thread, visibility-driven throttling drops to background-rate.

## Common Data Viz Mistakes

- Pie chart with > 5 categories.
- Bar chart with truncated y-axis (exaggerates differences).
- Line chart with too many series tangling.
- 3D charts.
- Tooltip showing only a value with no series/x-axis context.
- Color-only encoding (red good / red bad without text or icon).
- Chart that's a bar chart on desktop and a different chart entirely on mobile (jarring).
- Chart with no axis labels.
- Chart with no units.
- Chart that loads with a flicker (no skeleton, then sudden content).
- Animation that runs on every data refresh (every 5s in a live data view).
- Chart in dark mode with light-mode colors.
- Inaccessible chart with no text alternative.
- Tables without sorting or filtering on data-heavy views.
- Tables with row colors so loud they distract from data.
- Numbers without locale formatting (US format in a German UI).
- Tooltip that doesn't work on touch.

## Self-Healing for Data Viz

Before declaring work complete:

- [ ] Right chart for the data
- [ ] Bar charts have zero baseline
- [ ] Pies have <= 5 categories
- [ ] Axes labeled with units
- [ ] Colorblind-safe palette
- [ ] Color is never the only signal (paired with shape/pattern/label)
- [ ] Legend shown and accessible
- [ ] Tooltip works on hover AND tap
- [ ] Chart has text alternative (summary or table)
- [ ] Interactive elements keyboard-accessible
- [ ] Touch targets >= 44x44
- [ ] Responsive: simplifies/reflows on small screens
- [ ] Loading skeleton matches eventual layout
- [ ] Empty state has a message and action
- [ ] Error state has retry
- [ ] Numbers locale-formatted
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Tested in light AND dark mode
- [ ] Tables: sorting, sticky header, mobile-adaptive

## See Also

- [accessibility.md](accessibility.md) for chart and table accessibility
- [responsive.md](responsive.md) for chart reflow patterns
- [motion.md](motion.md) for chart animation
