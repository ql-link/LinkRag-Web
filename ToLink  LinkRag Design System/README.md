# ToLink / LinkRag Design System

## Using this system

- **Styles:** link `styles.css` (it `@import`s every token layer under `tokens/` plus the `.art-card` / `.frosted-panel` utilities). All theming is driven by CSS custom properties; add `class="dark"` to a container (or `<html>`) to switch to the VSCode-inspired dark theme.
- **Components:** `Button`, `Badge`, and `Card` are importable React components — load `_ds_bundle.js` and read them off `window.ToLinkLinkRagDesignSystem_fa9960`. See each component's folder under `components/` for the `.d.ts` prop contract and a live thumbnail.
- **Assets:** logos and LLM provider marks live in `assets/`; copy the ones you need into your artifact.
- **UI kits:** `ui_kits/workspace/` recreates the product Dashboard (synced to the LinkRag **dev** branch — `Dashboard.tsx`, `KnowledgeQA`, `KnowledgeGraph`, `RecentUploads`); `ui_kits/marketing/` is a Claude-style editorial landing page. Both wear the current cream/coral/serif visual layer.

## Product Context

**LinkRag** (branded as **ToLink Knowledge Workspace**) is an AI-powered knowledge management platform. Users upload documents (PDF, DOCX, Markdown), which are chunked, vector-indexed, and made searchable through a conversational RAG (Retrieval-Augmented Generation) interface. The product supports multiple LLM providers (OpenAI, Claude, Gemini, Deepseek, Qwen, etc.) and organizes knowledge into datasets.

The interface language is primarily **Chinese (Simplified)**, with English used for system labels, metadata, and breadcrumb-style navigation hints. The product name alternates between **LinkRag** (codebase/logo) and **ToLink** (branding context).

### Core Screens

- **Welcome / Landing** — marketing-style page with auth (login/register), animated workflow demos, feature highlights
- **Home Dashboard** — greeting, quick-action cards, recent files & chats
- **Datasets** — knowledge base grid with CRUD, status badges
- **Chats** — conversation list grid, create dialog with dataset binding
- **Chat Detail** — full-screen conversational Q&A with citation snippets
- **Files** — file list with upload, parse status, dataset association
- **Settings / LLM Config** — provider selection and model configuration
- **Usage** — analytics and usage metrics

### Source Reference

- **Codebase:** `toLink-Web/` (React 19 + Vite + Tailwind CSS 4 + Motion/React)
- **GitHub:** https://github.com/ql-link/LinkRag

---

## CONTENT FUNDAMENTALS

### Tone & Voice

- **Calm, precise, trustworthy.** The product speaks with quiet authority — no exclamation marks, no hype.
- **Chinese-first** body copy: nav labels (首页, 知识库, 对话, 文件), actions (上传文档, 新建对话), status text (解析中, 已启用).
- **English for system metadata:** timestamps, breadcrumb separators, status codes, mono-label annotations ("System Initiated // Node Analysis", "Engine: Gemini-3-Ultra").
- **Uppercase tracking** on all control labels: `text-xs font-bold uppercase tracking-widest` is the universal pattern for nav items, section headers, and button text.
- **No emoji.** Zero emoji in the entire codebase. Iconography is handled exclusively by Lucide line icons.
- **Casing:** Chinese body text is sentence-cased naturally. English labels are ALL CAPS with wide letter-spacing. Never title-case.
- **Greeting pattern:** Time-of-day salutation + user name in serif italic — "下午好，_Alex Chen_"
- **Descriptions are short:** one-line descriptions under card titles, e.g. "导入 PDF、Word、Markdown" or "基于引用片段生成回答"

### Copy Patterns

| Context            | Example                                                       |
| ------------------ | ------------------------------------------------------------- |
| Nav item           | `知识库` `对话` `文件`                                        |
| Quick action title | `上传文档` `知识问答` `管理知识库`                            |
| Quick action desc  | `导入 PDF、Word、Markdown`                                    |
| Mono system label  | `ACTIVE INTELLIGENCE` `KNOWLEDGE VAULT`                       |
| Button             | `创建` `取消` `重试` `查看全部`                               |
| Empty state        | `还没有知识库` / `新建一个知识库后，就可以上传文件并开始问答` |
| Breadcrumb         | `首页 › 知识库`                                               |

---

## VISUAL FOUNDATIONS

> **Restyle note (current direction):** the visual layer has been rebranded to the **Claude (Anthropic) editorial system** — warm **cream canvas**, **coral** primary, **serif display** headlines (upright, negative tracking), and **dark-navy** product-chrome surfaces. The cream + coral pairing is the brand voltage; dark navy is the surface mode for code mockups, footers and featured cards. Legacy `--color-*` variable names are kept and re-mapped onto this palette, so existing components and the UI kit re-skin automatically.

### Color System

Canonical Claude tokens live in `tokens/colors.css`; legacy `--color-*` aliases map onto them.

#### Light (cream canvas)

| Token                              | Value                 | Usage                                                                                                |
| ---------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `--primary`                        | `#cc785c`             | Signature coral — **accent only**: button fills, inline links, thin accent rules, small marks/badges |
| `--primary-active`                 | `#a9583e`             | Press / hover-darker                                                                                 |
| `--canvas`                         | `#faf9f5`             | Default warm-cream page floor                                                                        |
| `--surface-soft`                   | `#f5f0e8`             | Soft bands, dividers                                                                                 |
| `--surface-card`                   | `#efe9de`             | Feature / content cards (one step darker)                                                            |
| `--surface-dark`                   | `#2c2520`             | Warm espresso — code mockups, footer, featured tier                                                  |
| `--ink`                            | `#141413`             | Headlines + primary text (warm off-black)                                                            |
| `--body`                           | `#3d3d3a`             | Default running text                                                                                 |
| `--muted`                          | `#6c6a64`             | Sub-heads, captions                                                                                  |
| `--hairline`                       | `#e6dfd8`             | 1px borders on cream surfaces                                                                        |
| `--accent-teal` / `--accent-amber` | `#5db8a6` / `#e8a55a` | Sparse: status dots, category badges                                                                 |

#### Dark-navy surface mode (`.dark`)

| Token            | Value     | Usage                                    |
| ---------------- | --------- | ---------------------------------------- |
| `--canvas`       | `#181715` | Dark product-chrome floor                |
| `--surface-card` | `#252320` | Elevated card on dark                    |
| `--ink`          | `#faf9f5` | Cream-white text on dark                 |
| `--primary`      | `#cc785c` | Coral accent **stays** (never goes blue) |

**Color rules:** anchor every surface on cream — never pure white or cool gray. **Coral is an accent, not a surface** — use it for button fills, inline links, a 2px accent rule, or a small mark; never as a large/full-bleed color block (a big coral panel reads as loud and unbalanced). When a section needs emphasis, reach for the **dark-navy** surface or a soft cream band — not a coral fill. Don't introduce a fourth surface tone — cream + dark-navy is the surface pair; coral rides on top as the accent.

### Typography

**Substitutes flagged:** the licensed Anthropic faces (Copernicus, StyreneB) are unavailable, so the system ships **Cormorant Garamond** (serif display) and **Inter** (body) via Google Fonts. Swap in real woff2 in `tokens/fonts.css` when licensed.

**Font Stack Hierarchy:**

1. **Display / Serif** — `--font-serif` = `"Cormorant Garamond", "Tiempos Headline", Garamond, serif`. Upright (never italic), weight **500**, negative tracking (-0.02em). The literary editorial voice; used for every display headline via `.display-*` / `.serif-heading`. Never bold.
2. **Body / Sans** — `--font-sans` = `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Humanist sans for body, titles, nav, buttons. Weight 400 paragraphs, 500 labels.
3. **Mono** — `--font-mono` = `"JetBrains Mono", ui-monospace, monospace`. Code blocks, system labels, metadata.

**Type Scale Patterns:**

- Display: `.display-xl` 64 / `.display-lg` 48 / `.display-md` 36 / `.display-sm` 28 — Cormorant serif, 500, negative tracking
- Title: `.title-lg` 22 / `.title-md` 18 / `.title-sm` 16 — Inter 500
- Body: 16px Inter 400, line-height 1.55
- Caption: 13px / 500; uppercase eyebrow: 12px / 500 / 0.125em tracking
- Code: 14px JetBrains Mono
- Display headlines stay serif 500 with negative tracking — the split is unbreakable; bigger serif before bolder weight.

### Layout

**Desktop workspace pattern:**

- Outer padding: `p-4` (16px) with `gap-4` between panels
- Three-column: collapsible left sidebar (72–200px) + resizable center panel + right activity panel (72–240px)
- Chat detail pages go full-width (no sidebar/right panel)

**Sidebar / panels:**

- `--radius-xl` (16px) on the big containers (sidebar, main panel, right panel), solid `--canvas` cream, `1px var(--hairline)` border
- Logo at top (~72px row), nav items in middle, user profile at bottom
- Three-column workspace: nav sidebar (220px) · Knowledge Synthesis Q&A (flex) · graph + vault (340px)

**Cards:**

- **Reach for a card only when the content is interactive or self-contained** \u2014 static columns (features, pricing tiers, CTA) read better as open layout with hairline dividers. See Borders & Dividers.
- When boxed: color-block fill, no frosted glass: `--surface-card` (cream) or `--surface-dark` (navy). Never a coral fill.
- Roundness: `--radius-lg` (12px) for content/product cards, `--radius-md` (8px) for buttons/inputs/inner elements, `--radius-pill` for badges
- No shadow in default state; faint `--shadow-card-hover` lift on interactive cards only

### Backgrounds & Surfaces

- **Color-block first** — depth comes from surface contrast (cream ↔ dark-navy), not gradients or shadow. No gradients anywhere.
- **Surface trinity:** `--canvas` (cream floor) → `--surface-card` (cream cards) → `--surface-dark` (navy product chrome). Alternate cream and dark bands for page pacing.
- **No frosted glass** — the legacy `.art-card` / `.frosted-panel` utilities are now flat cream surfaces.
- **Coral never fills a panel** — it appears only as button fills, links, a thin (1–2px) accent rule, or a small mark. A full-bleed coral block is off-system; emphasize with the **dark-navy** surface or a soft cream band instead.

### Borders & Dividers

- **Prefer open layout over boxes.** Default to grouping content with whitespace and hairline rules (top/side dividers), not bordered/filled card containers. Reserve filled or bordered cards for genuinely interactive or self-contained units (a clickable quick-action, a single product mockup) — don't box static content (feature columns, pricing tiers, CTAs) just to delimit it. Fewer boxes reads calmer and more editorial.
- Universal border when a box IS warranted: `1px var(--hairline)` (light) / `rgba(255,255,255,0.10)` (dark).
- Borders on ALL containers — sidebar, cards, inputs, main panel
- Active nav items get `border border-white/80` (light) or `border-[#434343]` (dark) with `shadow-sm`
- Hover state on cards: `hover:border-primary` (amber/blue)

### Corner Radii

| Element                     | Radius | Class           |
| --------------------------- | ------ | --------------- |
| Hero illustration container | 16px   | `--radius-xl`   |
| Content / product cards     | 12px   | `--radius-lg`   |
| Buttons, inputs, tabs       | 8px    | `--radius-md`   |
| Small inline / dropdowns    | 6px    | `--radius-sm`   |
| Badge accents               | 4px    | `--radius-xs`   |
| Pills, badges, icon btns    | 9999px | `--radius-pill` |

### Shadows

- **Minimal by default.** Cards have no shadow; sidebar gets `shadow-sm`.
- `hover:shadow-lg` on quick-action cards only.
- Dialog overlays: `shadow-2xl` + `bg-black/50 backdrop-blur-sm` backdrop.
- Active nav item: `shadow-sm shadow-text-main/10`

### Hover & Press States

- **Primary button:** darkens to `--primary-active` (`#a9583e`) on hover/press — the one encoded state. Don't add others.
- **Card hover:** subtle shadow lift + `translateY(-2px)`; interactive cards reveal a coral arrow nudge (`ArrowRight`, opacity 0.5 → 1, `translateX(3px)`).
- **Nav / ghost hover:** faint `--surface-soft` wash.
- **Focus:** inputs gain a 3px coral ring (`--shadow-focus-ring`) + coral border.
- **Transitions:** ~140–280ms `--ease-out`; color-block surfaces, not glass.

### Animation & Motion

- **Page transitions:** Framer Motion `AnimatePresence` — fade+slide (`opacity: 0, y: 8` → `opacity: 1, y: 0`) with 220ms easeOut
- **Floating:** `float-slow` (8s) and `float-delay` (10s) ease-in-out infinite — used on welcome page decorative elements
- **Loading:** `animate-spin` on `RefreshCw` and `Loader2` icons
- **Status dots:** `animate-pulse` on active indicator dots
- **Dropdown entry:** `datasetDropdownIn` — translateY(-6px) + scaleY(0.97) → normal
- **Scroll reveal:** IntersectionObserver-triggered `translate-y-10 opacity-0` → `translate-y-0 opacity-100` with 700ms ease-out

### Scrollbar

- 4px width, transparent track, `bg-text-main/10 rounded-full` thumb

---

## ICONOGRAPHY

### Icon System

**Lucide React** (`lucide-react@^0.546.0`) is the exclusive icon library. No other icon fonts, SVG sprites, or custom icon systems. Every icon is imported individually:

Common icons used:

- Navigation: `Home`, `Database`, `MessageSquare`, `FolderOpen`, `Cpu`, `BarChart3`, `Settings`
- Actions: `Plus`, `Search`, `Upload`, `Send`, `ArrowRight`, `ChevronLeft`, `ChevronRight`, `X`
- Status: `Sparkles`, `Loader2`, `RefreshCw`, `AlertCircle`, `ShieldCheck`
- Content: `FileText`, `FileCode2`, `Presentation`, `FileSpreadsheet`
- AI/System: `BrainCircuit`, `BotMessageSquare`, `DatabaseZap`, `SearchCheck`, `Wand2`

**Icon sizing:** Consistently `size={18}` for nav, `size={14-16}` for inline/small, `size={21}` with `strokeWidth={1.8}` for featured card icons, `size={24-30}` for empty states.

**No emoji.** No unicode characters as icons. No custom SVGs for UI elements (only the logo mark uses a PNG).

### Provider Logos

LLM provider logos are SVG files in `assets/providers/`: Anthropic, Claude, Deepseek, Gemini, Grok, Meta, Midjourney, Mistral, Ollama, OpenAI, Qwen, ZAI, Zhipu.

### Brand Mark

The LinkRag logo is a magnifying glass containing a triangular knowledge-graph motif (three connected nodes), with sparkle accents (PNG asset, kept as-is). In the current Claude editorial restyle the **wordmark** is set in the serif display face (`--font-serif`, weight 600) rather than the old mixed-weight sans — see the nav/footer in either UI kit. A small black 4-spoke radial “spike” glyph is used as an inline wordmark prefix on the marketing surface.

Logo files:

- `assets/linkrag-logo-full.png` — full logo with wordmark
- `assets/linkrag-mark-v2.png` — mark only (used in sidebar)
- `assets/linkrag-icon-square.png` — square icon variant
- `assets/favicon-v2.png` — favicon

---

## FILE INDEX

```
├── README.md                  ← this file
├── SKILL.md                   ← agent skill manifest
├── styles.css                 ← root stylesheet — @imports the token layers + global utilities
├── tokens/
│   ├── fonts.css              ← @font-face declarations
│   ├── colors.css             ← color custom properties (light + .dark)
│   ├── typography.css         ← font stacks + semantic type classes
│   └── spacing.css            ← spacing scale, radii, shadows, motion
│
├── components/                ← importable React components (.jsx + .d.ts + live thumbnail)
│   ├── Button/
│   ├── Badge/
│   └── Card/
│
├── fonts/                     ← woff2 font files
│   ├── PlayfairDisplay-*.woff2   (4 weights)
│   ├── NotoSerifSC-*.woff2       (Chinese + Latin)
│   ├── Caveat-*.woff2            (4 weights)
│   ├── ZCOOLXiaoWei-*.woff2     (3 files)
│   └── LXGWWenKai-Regular.woff2
│
├── assets/
│   ├── linkrag-logo-full.png
│   ├── linkrag-mark-v2.png
│   ├── linkrag-mark.png
│   ├── linkrag-icon-square.png
│   ├── favicon.png / favicon-v2.png
│   └── providers/             ← LLM provider SVG logos (13 files)
│
├── preview/                   ← Design System tab spec cards (@dsCard tagged)
│   ├── colors-primary.html · colors-neutral.html · colors-semantic.html · colors-dark.html
│   ├── type-serif-display.html · type-body-mono.html · type-scale.html
│   ├── spacing-radii.html · spacing-shadows.html
│   ├── comp-inputs.html · comp-nav.html · comp-dialogs.html
│   └── brand-logos.html
│
└── ui_kits/
    ├── workspace/             ← product app (synced to LinkRag dev branch)
    │   ├── README.md
    │   ├── index.html         ← 3-column Dashboard: nav · Knowledge Synthesis Q&A · graph + vault
    │   └── Dashboard.jsx      ← Sidebar / KnowledgeQA / KnowledgeGraph / Vault
    └── marketing/            ← Claude-style editorial landing page
        ├── index.html         ← hero · features · dark dev band · pricing · coral CTA · footer
        ├── SectionsTop.jsx
        └── SectionsBottom.jsx

templates/                     ← spin-up starting points (Design Components)
├── landing/
│   ├── Landing.dc.html        ← "Claude-style Landing"
│   └── ds-base.js
└── workspace/
    ├── Workspace.dc.html      ← "Knowledge Workspace" (3-column dashboard)
    └── ds-base.js
```
