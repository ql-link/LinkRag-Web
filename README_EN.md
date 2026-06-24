<div align="center">

# LinkRag Web

The web frontend for LinkRag — make your knowledge base visual, conversational, and traceable.

</div>

<p align="center">
  <a href="./README.md">简体中文</a> · <b>English</b>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue">
</p>

<p align="center">
  <a href="http://linkrag.cn/"><img alt="Live demo at linkrag.cn" src="https://img.shields.io/badge/Live%20Demo-linkrag.cn-c8a06a?style=for-the-badge&logo=googlechrome&logoColor=white"></a>
</p>

<p align="center">
  <img alt="LinkRag Web architecture: one gateway in, two paths out" src="./docs/assets/sketches/sketch-web-architecture.png" width="840">
</p>

## What is LinkRag Web?

LinkRag is an enterprise-grade RAG system that lets anyone turn their documents into a knowledge base they can talk to. This repository is its **web frontend** — the entry point users actually touch: manage datasets and knowledge files, visualize how documents relate to each other as a graph, and ask traceable, source-grounded AI questions over your knowledge base.

The UI talks to two backends: regular business (login, config, datasets, files, usage) goes through the Java admin service; chat retrieval and generation are streamed **directly from the Python RAG service**, using a short-lived token issued by Java — see [System Boundary](#system-boundary) below.

## Key Features

- **Knowledge graph visualization** — render the relationship network between documents with D3, explorable interactively.
- **Knowledge-base Q&A (RAG)** — retrieval-augmented chat over a dataset; answers stream token by token and trace back to their source files.
- **Dataset & knowledge file management** — upload, organize, and attach files to datasets, with parse-status tracking.
- **Multi-session chat** — a persistent conversation list, with recent chats surfaced on the home page.
- **LLM configuration center** — manage multiple model providers, API keys, and capability switches in settings.
- **Usage statistics** — daily and aggregate call usage.
- **Responsive & dark mode** — works from desktop down to ~360px, with a built-in theme toggle.

## System Boundary

LinkRag follows a "Java admin service + Python RAG engine" split, and this repo is the user-facing frontend that talks to both: every request converges on a single API client, then forks into two lines — carry a token to the Java admin service for regular business, or carry a short-lived pass to stream answers directly from Python (see the architecture sketch at the top).

- **Regular business** — goes through a single `apiClient`, sending the `satoken` header to the Java admin service's `/api/v1/*` (login, datasets, files, model config, usage).
- **Chat recall** — the frontend first asks Java for a short-lived recall session (`POST /api/v1/recall/sessions`; Java checks auth and dataset permission, then issues a token carrying a `streamUrl`), then uses that token to pull the recall/generation SSE stream **directly from Python**. Java is not on this streaming path (see [src/services/recall.ts](src/services/recall.ts), [src/types/api.ts](src/types/api.ts)).

## Tech Stack

| Category      | Choice                                  |
| ------------- | --------------------------------------- |
| Framework     | React 19 + TypeScript                   |
| Build         | Vite 6                                  |
| Styling       | Tailwind CSS 4 (CSS-first, no config)   |
| Routing       | React Router 7                          |
| Visualization | D3                                      |
| Markdown      | react-markdown + remark-gfm + rehype    |
| Animation     | Motion                                  |
| Icons         | lucide-react                            |
| Testing       | Vitest + Testing Library                |
| Quality       | ESLint + Prettier + Husky + lint-staged |

## Quick Start

**Prerequisites:** Node.js 20+, with the [LinkRag-Service](https://github.com/ql-link/LinkRag-Service) backend running locally on port `8080`.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (defaults to http://localhost:3000)
npm run dev
```

The dev server proxies `/api` requests to the backend at `http://localhost:8080` (see [vite.config.ts](vite.config.ts)). Adjust the proxy target if your backend lives elsewhere.

## Scripts

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the dev server             |
| `npm run build`     | Production build to `dist/`      |
| `npm run preview`   | Preview the built bundle locally |
| `npm run lint`      | ESLint check (zero warnings)     |
| `npm run lint:fix`  | ESLint autofix                   |
| `npm run typecheck` | TypeScript type check            |
| `npm run format`    | Prettier format                  |
| `npm run test`      | Run unit tests                   |

## Project Structure

```text
src/
├── components/   # Shared components (knowledge graph, chat, sidebar, …)
├── contexts/     # Global state (Auth / Theme / Toast)
├── layouts/      # Layouts (protected layout, mobile nav, right panel)
├── pages/        # Pages (home / chats / datasets / settings ...)
├── services/     # API wrappers (auth / blog / chat / chunk / dataset / llm / oss / recall / user)
├── lib/          # Utilities and API client (api-client.ts)
├── types/        # Type definitions
└── routes.ts     # Route table
```

## Backend Integration

- Service root: `http://{host}:8080`
- API prefix: `/api/v1`
- Auth header: `satoken: {accessToken}` (note: not `Authorization: Bearer`)
- Chat recall: the frontend pulls the SSE stream directly from Python's `streamUrl` using a session token issued by Java (see [System Boundary](#system-boundary) above)

See [docs/ToLink-前端API文档.md](docs/ToLink-前端API文档.md) for the full interface contract.

## Environment Variables

Build-time `VITE_`-prefixed variables (baked into the static bundle):

| Variable          | Description                 |
| ----------------- | --------------------------- |
| `VITE_GITHUB_URL` | GitHub link shown in the UI |

## Deployment

A multi-stage Docker build serves the SPA static bundle via Nginx:

```bash
# Build the image
docker build -t linkrag-web:latest .

# Start (create the external network tolink-app-net first)
TAG=latest docker compose -f deploy/docker-compose.yml up -d
```

See the [Jenkinsfile](Jenkinsfile) for the CI pipeline.

## Branching & Release

This repo shares the same branch model as the other LinkRag services:

- `dev` — daily integration branch; feature/refactor/chore branches merge here via PR.
- `master` — stable release branch; accepts only release PRs or hotfix PRs, never daily branches directly.
- `feature/<topic>` / `refactor/<topic>` / `chore/<topic>` — daily branches, cut from `dev` and PR'd back into `dev`.
- `release/<version>` — weekly release-prep branch, cut from `dev`, merged into `master` via a release PR.
- `hotfix/<topic>` — cut from `master`, merged back into `master`, then merged or cherry-picked back into `dev`.

Release rules:

- `dev` → `master` release merges must use a normal merge commit; squash merge is forbidden.
- After a release PR lands, tag the version on the resulting merge commit.
- A release PR description must list: included business PRs, database/config/contract changes, test results, and known risks.
- If CI or workflow branch filters are configured explicitly, use `dev, master`.

## Related Repositories

LinkRag is made up of three repositories working together:

| Repository                                                                | Role                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [ql-link/LinkRag](https://github.com/ql-link/LinkRag)                     | Python RAG service: parsing, chunking, vectorization, indexing, recall               |
| [ql-link/LinkRag-Service](https://github.com/ql-link/LinkRag-Service)     | Java admin service: business orchestration, task dispatch, terminal-state collection |
| [ql-link/LinkRag-Web](https://github.com/ql-link/LinkRag-Web) (this repo) | Frontend: knowledge-base management and interaction                                  |

## Documentation

The `docs/` directory holds the frontend API doc, integration plans, and handover docs — useful references for development and integration.

## License

Released under the MIT License.
