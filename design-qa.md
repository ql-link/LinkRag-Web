**Design QA**

- Source visual truth: `/var/folders/hz/b8t5g29j71b5cpf22bvdflgw0000gn/T/codex-clipboard-ec1e314a-01aa-46fb-8d95-2a033d91d452.png`
- Browser-rendered implementation: `/Users/jixu/.codex/visualizations/2026/07/28/019fa90a-06b8-7e31-a856-6e2bd9f9cf6f/welcome-dot-grid-viewport.png`
- Focused implementation crop: `/Users/jixu/.codex/visualizations/2026/07/28/019fa90a-06b8-7e31-a856-6e2bd9f9cf6f/welcome-dot-grid-detail.png`
- Side-by-side comparison: `/Users/jixu/.codex/visualizations/2026/07/28/019fa90a-06b8-7e31-a856-6e2bd9f9cf6f/welcome-dot-grid-comparison.png`
- Viewport: 1280 x 720 CSS px, device scale factor 1.
- Pixel dimensions: source 585 x 336; implementation viewport 1280 x 720; focused implementation crop 585 x 180; comparison board 1194 x 224.
- Density normalization: the source raster was cropped to 585 x 180 for the comparison board; the implementation was captured at the same 585 x 180 pixel size. No resampling was applied.
- State: welcome page `/`, light theme, signed out, scroll position 0.

**Findings**

- No actionable P0, P1, or P2 differences remain for the requested background change.
- Fonts and typography: outside the supplied background-only reference; existing product typography was intentionally preserved and remained visually intact.
- Spacing and layout rhythm: existing page layout was intentionally preserved. The new pattern covers the full 1280 px viewport width and the full 2425.98 px page background without changing content geometry.
- Colors and visual tokens: the light canvas and warm-gray dots match the supplied raster because the repeating 26 x 26 tile is cropped directly from it. The prior gradients, ribbons, large grid, and floating dots are absent.
- Image quality and asset fidelity: the supplied raster is reused as a native-resolution repeating tile, with no interpolation, stretching, placeholder, or code-drawn substitute.
- Copy and content: outside the supplied background-only reference; all existing page copy was preserved.

**Full-view comparison evidence**

- The browser-rendered 1280 x 720 viewport shows a consistent low-contrast beige dotted canvas behind the unchanged welcome-page content.
- DOM and computed-style checks confirmed a 26 x 26 repeating source image across the full page, with zero legacy ribbon or floating-decoration nodes.

**Focused region comparison evidence**

- The side-by-side board compares an unobstructed 585 x 180 source crop with an equal-size browser capture. Dot spacing, scale, background tone, and contrast are visually consistent. A focused crop was required because the source contains only the background motif, while the implementation includes product content.

**Comparison history**

- Pass 1: no P0/P1/P2 mismatch found. The source-derived tile matched the reference without a corrective visual iteration.

**Interaction and runtime checks**

- Tested the `查看功能` control; it scrolled to the workflow section as before.
- Browser console warnings/errors checked: none.
- Automated checks: typecheck, lint, 24 test files / 136 tests, and production build passed.

**Follow-up Polish**

- None required for this scoped change.

final result: passed
