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
