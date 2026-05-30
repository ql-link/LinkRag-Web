# ToLink Workspace UI Kit

## Overview

High-fidelity interactive recreation of the LinkRag knowledge workspace application. This is a click-through prototype demonstrating the core screens and interactions.

## Screens

- **Home** — Dashboard with greeting, quick-action cards, recent files/chats
- **Datasets** — Knowledge base grid with create/edit dialogs
- **Chats** — Conversation list with create dialog
- **Files** — File list with upload status and parse controls

## Components

| File                   | Contents                                                                  |
| ---------------------- | ------------------------------------------------------------------------- |
| `SharedComponents.jsx` | Base utilities, Lucide icons, theme context, art-card, mono-label, badges |
| `Sidebar.jsx`          | Collapsible sidebar with nav, theme toggle, user menu                     |
| `Header.jsx`           | Page header with breadcrumb, search, sort controls                        |
| `HomeCards.jsx`        | Quick-action cards, recent files/chats sections                           |
| `ChatList.jsx`         | Chat grid, create-chat dialog                                             |
| `DatasetGrid.jsx`      | Dataset grid, create/edit dataset dialogs                                 |
| `index.html`           | Entry point — assembles all components into interactive app               |

## Usage

Open `index.html` to view the full interactive prototype. Click sidebar items to navigate between screens. All dialogs are functional (create, edit). Theme toggle switches between light/dark modes.

## Design Tokens

All visual tokens come from `../../colors_and_type.css` at the project root.
