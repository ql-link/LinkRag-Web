# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LinkRag (`tolink-web`) — the web frontend for a RAG knowledge-base product. React 19 + Vite 6 + TypeScript + Tailwind v4. UI copy is Chinese. Talks to a backend at `localhost:8080` (Spring/Sa-Token style auth).

> The root `README.md` is leftover AI Studio template boilerplate (mentions `GEMINI_API_KEY`); no Gemini code exists. Ignore it — the real entry point is the commands and architecture below.

## Commands

```bash
npm run dev          # Vite dev server on port 3000, host 0.0.0.0 (proxies /api → localhost:8080)
npm run build        # production build to dist/
npm run preview      # serve the built bundle
npm run lint         # eslint src/ --max-warnings 0  (warnings fail — keep it clean)
npm run lint:fix     # eslint --fix
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write src/
npm test             # vitest run (one-shot)
npm run test:watch   # vitest watch
```

Run a single test file: `npx vitest run src/lib/api-client.test.ts`
Run tests matching a name: `npx vitest run -t "substring of test name"`

Husky + lint-staged run `eslint --fix --max-warnings 0` and `prettier` on staged `*.{ts,tsx}` pre-commit, so a commit fails on any lint warning.

## Architecture

**Provider stack** (`src/main.tsx`): `BrowserRouter` → `ThemeProvider` → `AuthProvider` → `App` → `ToastProvider`.

**Routing is two-tiered:**

- `src/App.tsx` defines _public_ routes (`/` Welcome, `/blogs`, `/feedback`) plus a catch-all `*` that renders `ProtectedLayout` only when `useAuth().user` exists, otherwise redirects to Welcome.
- `src/layouts/ProtectedLayout.tsx` holds its own nested `<Routes>` for all authenticated app pages (home, datasets, chats, usage, settings, …) and the responsive sidebar/right-panel shell.
- Route path constants live in `src/routes.ts` (`Routes` object) — use these, don't hardcode paths.
- Pages are lazy-loaded via `React.lazy` in both `App.tsx` and `ProtectedLayout.tsx`.

**Auth** (`src/services/auth.ts`, `src/contexts/AuthContext.tsx`): login/register store the access token in `localStorage` under `accessToken`. `AuthContext` loads the user profile on mount and exposes `user`/`loading`/`refreshProfile`/`logout`. A missing/invalid token clears state and routes to Welcome.

**API layer** — all network access goes through `src/lib/api-client.ts`:

- `apiClient.get/post/patch/delete/postForm` wrap `fetch`.
- The token is sent in the `satoken` header (not `Authorization`).
- Responses are a `Result<T>` envelope (`{ code, message, data }`); the client checks `code === 200`, returns `result.data`, and throws `ApiError` otherwise.
- Errors auto-fire a global toast via a handler registered in `App.tsx` (`setToastHandler`). On 401 it clears the token. Use `isAuthError`/`isForbiddenError`/`isConflictError` helpers.
- Default timeout 15s (60s for `postForm` uploads); supports external `AbortSignal`.
- `src/services/*` are thin per-domain wrappers (auth, user, chat, dataset, llm, oss) re-exported from `src/services/index.ts`. Add new endpoints there, not inline in components.

**Theming** (`src/contexts/ThemeContext.tsx`): toggles a `dark` class on `<html>`, persisted to `localStorage` `theme`. Design tokens are defined with Tailwind v4's `@theme` in `src/index.css` (warm palette: `--color-primary` #D4A373, `--color-bg-base`, `--color-text-main`, etc.); dark mode is a set of `.dark` overrides in the same file. There is **no `tailwind.config`** — Tailwind v4 runs via the `@tailwindcss/vite` plugin and CSS-first config. Use semantic token classes (`bg-bg-base`, `text-text-main`, `border-border-subtle`, `art-card`, `mono-label`) rather than raw hex.

**Path alias:** `@/` → `src/` (configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`).

## Gotchas

- **`src/pages/demo/*` and `src/layouts/DemoLayout.tsx` are stale design mockups**, not wired into the router and using a different token set (`bg-bg-*`, `accent-*`) and a non-existent `toggleDarkMode` from ThemeContext. Don't treat them as live code or copy their patterns into real pages.
- ESLint config (`eslint.config.js`): `no-console` allows only `console.warn`/`console.error`; `no-explicit-any` and unused vars are warnings (and warnings fail CI). Prefix intentionally-unused vars with `_`.
- Tests use Vitest + jsdom + Testing Library, globals enabled, setup in `src/test/setup.ts`. Test files: `src/**/*.{test,spec}.{ts,tsx}`.
- `docs/` contains Chinese handover/API/integration design docs worth consulting for backend contract details.
- **Fonts are self-hosted** in `public/fonts/` with manual `@font-face` in `src/styles/fonts.css` (the `@fontsource/*` deps in package.json are not imported). `public/fonts/LXGWWenKai-Regular.woff2` is a **subset** of LXGW WenKai 霞鹜文楷 (500 weight), covering only the characters used on the welcome page, applied via the `welcome-zh` utility (`src/index.css`). If welcome-page headline copy changes, regenerate it:
  ```bash
  python3 -m venv /tmp/fontvenv && /tmp/fontvenv/bin/pip install fonttools brotli
  # rebuild /tmp/subset-text.txt = unique chars on the welcome page, then:
  /tmp/fontvenv/bin/pyftsubset node_modules/@fontsource/lxgw-wenkai/files/lxgw-wenkai-latin-500-normal.woff2 \
    --text-file=/tmp/subset-text.txt --flavor=woff2 --layout-features='*' \
    --output-file=public/fonts/LXGWWenKai-Regular.woff2
  ```
