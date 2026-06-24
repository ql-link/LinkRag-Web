# ToLink / LinkRag Design System

## Using this system

- **Styles:** link `styles.css` (it `@import`s every token layer under `tokens/` plus the `.art-card` / `.frosted-panel` utilities). All theming is driven by CSS custom properties; add `class="dark"` to a container (or `<html>`) to switch to the VSCode-inspired dark theme.
- **Components:** `Button`, `Badge`, and `Card` are importable React components — load `_ds_bundle.js` and read them off `window.ToLinkLinkRagDesignSystem_fa9960`. See each component's folder under `components/` for the `.d.ts` prop contract and a live thumbnail.
- **Assets:** logos and LLM provider marks live in `assets/`; copy the ones you need into your artifact.

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

### Color System

#### Light Theme

| Token                   | Value                    | Usage                                                                           |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `--color-primary`       | `#D4A373`                | Warm amber accent — active dots, icon tints, hover borders, selection highlight |
| `--color-bg-base`       | `#F4F1ED`                | Paper beige page background                                                     |
| `--color-text-main`     | `#1A1A1A`                | Near-black primary text                                                         |
| `--color-border-subtle` | `rgba(26,26,26,0.10)`    | Hairline borders on cards, inputs, dividers                                     |
| `--color-bg-card`       | `rgba(255,255,255,0.50)` | Translucent card surface (with backdrop-blur)                                   |
| `--color-bg-frosted`    | `rgba(255,255,255,0.80)` | Sidebar, header frosted glass                                                   |
| `--color-error`         | `#D97373`                | Error states                                                                    |

#### Dark Theme (VSCode-inspired)

| Token                   | Value        | Usage                      |
| ----------------------- | ------------ | -------------------------- |
| `--color-primary`       | `#3B82F6`    | Blue accent replaces amber |
| `--color-bg-base`       | `#1E1E1E`    | VSCode editor background   |
| `--color-bg-frosted`    | `#252526`    | Sidebar/panel surface      |
| `--color-bg-card`       | `#2D2D2D`    | Card/elevated surface      |
| `--color-text-main`     | `#CCCCCC`    | Default text               |
| `--color-border-subtle` | `#3C3C3C`    | Border color               |
| CTA buttons             | `#094771` bg | Dark blue primary buttons  |

### Typography

**Font Stack Hierarchy:**

1. **Body / Sans** — `"Noto Serif SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif` — Despite being named "sans", the primary body font is actually Noto Serif SC, a Chinese serif. This gives the entire interface a bookish, editorial feel.
2. **Serif / Display** — `"Playfair Display", "Noto Serif SC", serif` — Used for page headings via `.serif-heading` class. Always italic, tight tracking (-0.03em).
3. **Mono** — `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace` — `.mono-label` class: 10px, uppercase, tracking-widest. Used for metadata, timestamps, system hints, breadcrumb annotations.
4. **Handwriting** — `"Caveat"` — Available but sparingly used, for annotation-style accents.
5. **Chinese Display** — `"ZCOOL XiaoWei"` — Decorative Chinese serif for special headlines.

**Type Scale Patterns:**

- Page heading: `text-xl serif-heading` (Playfair italic, ~20px)
- Card title: `text-sm font-bold` (~14px, bold)
- Card description: `text-xs` (~12px) at 50-55% opacity
- Mono label: `text-[10px] uppercase tracking-widest font-mono`
- Input placeholder: `text-xs font-bold uppercase tracking-widest`
- Button text: `text-xs font-bold uppercase tracking-wider`
- Greeting: `text-2xl font-semibold` with inline `font-serif italic` for the name

### Layout

**Desktop workspace pattern:**

- Outer padding: `p-4` (16px) with `gap-4` between panels
- Three-column: collapsible left sidebar (72–200px) + resizable center panel + right activity panel (72–240px)
- Chat detail pages go full-width (no sidebar/right panel)

**Sidebar:**

- `rounded-3xl` (24px radius), `bg-white/80 backdrop-blur-md`, `border border-border-subtle`
- Logo at top (h-20), nav items in middle, user profile + theme toggle at bottom
- Collapsible: full → 72px icon-only mode

**Cards:**

- `art-card` class: `bg-white/50 backdrop-blur-sm border border-border-subtle` — translucent, frosted
- Roundness: `rounded-2xl` (16px) for cards, `rounded-xl` (12px) for inner elements, `rounded-lg` (8px) for badges
- No heavy shadows in default state; `shadow-sm` on sidebar only; `hover:shadow-lg` on action cards

### Backgrounds & Surfaces

- **No gradients** — flat paper tone with transparency layers
- **No images/textures** in the workspace — welcome page uses subtle CSS grid lines (`background-image: linear-gradient(...)` at 3.5–5% opacity)
- **Frosted glass** (backdrop-blur) is the signature surface treatment: sidebar, headers, right panel
- **Transparency layering:** `bg-white/80` → `bg-white/50` → `bg-white/40` → `bg-white/20` → `bg-bg-base/30` for depth hierarchy

### Borders & Dividers

- Universal border: `border border-border-subtle` (rgba(26,26,26,0.10) light / #3c3c3c dark)
- Borders on ALL containers — sidebar, cards, inputs, main panel
- Active nav items get `border border-white/80` (light) or `border-[#434343]` (dark) with `shadow-sm`
- Hover state on cards: `hover:border-primary` (amber/blue)

### Corner Radii

| Element                  | Radius | Class          |
| ------------------------ | ------ | -------------- |
| Sidebar, main panel      | 24px   | `rounded-3xl`  |
| Cards, dialogs, inputs   | 16px   | `rounded-2xl`  |
| Icon containers, buttons | 12px   | `rounded-xl`   |
| Badges, small controls   | 8px    | `rounded-lg`   |
| Pills, tags              | 9999px | `rounded-full` |

### Shadows

- **Minimal by default.** Cards have no shadow; sidebar gets `shadow-sm`.
- `hover:shadow-lg` on quick-action cards only.
- Dialog overlays: `shadow-2xl` + `bg-black/50 backdrop-blur-sm` backdrop.
- Active nav item: `shadow-sm shadow-text-main/10`

### Hover & Press States

- **Card hover:** `hover:border-primary` (warm amber border appears), `hover:shadow-lg` on action cards
- **Arrow reveal:** `ArrowRight` icon at `opacity-0` → `group-hover:opacity-100 group-hover:translate-x-1` — subtle rightward nudge
- **Icon hover:** `group-hover:scale-110` on nav icons
- **Nav hover:** `hover:bg-primary/5 hover:text-text-main` (very faint amber tint)
- **Button hover:** `hover:opacity-90` for primary buttons, `hover:bg-primary/5` for ghost buttons
- **No press/active states** defined — hover is the primary interaction signal
- **Transitions:** `transition-all duration-300` on cards/nav, `transition-colors` on buttons

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

The LinkRag logo is a magnifying glass containing a triangular knowledge-graph motif (three connected nodes), with sparkle accents. Colors: dark slate (#3D4F5F) frame, amber (#D4A373) nodes/sparkles, teal (#7BA5A0) node. The wordmark reads "LinkRAG" in a mixed-weight sans: "Link" in dark charcoal bold, "RAG" in teal.

Logo files:

- `assets/linkrag-logo-full.png` — full logo with wordmark
- `assets/linkrag-mark-v2.png` — mark only (used in sidebar)
- `assets/linkrag-mark-dark.png` — dark chrome mark variant
- `assets/linkrag-icon-square.png` — square icon variant
- `assets/favicon-light.png` / `assets/favicon-dark.png` — transparent favicon variants for light and dark browser chrome

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
    └── workspace/
        ├── README.md
        ├── index.html         ← full interactive prototype
        ├── Sidebar.jsx
        ├── Header.jsx
        ├── HomeCards.jsx
        ├── ChatList.jsx
        ├── DatasetGrid.jsx
        └── SharedComponents.jsx
```
