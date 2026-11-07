<p align="center"><strong>Workspaces · Projects · Tasks</strong></p>

# Veltris — Frontend

Angular client for Veltris, a project management tool for teams: workspaces with members, projects with a short key, task boards with drag and drop, and task details with subtasks, comments and a full change history.

- Live: **https://veltris.stackvale.space**
- Backend: [Veltris-Backend](https://github.com/aleksa0206/Veltris-Backend)

## What's inside

- **Overview** — open tasks, overdue, due in the next seven days and completed this week; your tasks grouped by urgency, projects in progress with their progress and recent activity across the workspace.
- **Projects** — a table with status, lead, progress, open and overdue tasks and target date; filter by status, search by name or key, sort. The project key is suggested from the name.
- **Board** — one column per status; drag cards between and within columns, add a task right in a column, filter by text, assignee and priority. Clicking a card opens it in a side panel.
- **Task details** — title and description edited in place, status, priority, assignee and due date, subtasks with one-click completion, and comments mixed with the change history.
- **Members** — roles, removing members, leaving a workspace, invitations by email and pending invitations.
- **Command palette** (`Ctrl/⌘ K`) — jump to any task by title or ID (`WEB-12`), to a project or page, create a project, switch the theme.
- **Account** — personal details and two-factor authentication; several workspaces with a switcher.

## Design

The interface is meant to feel precise and quiet, for people who spend the whole day in it:

- neutral greys, white working surfaces, an ink-coloured primary button and one cobalt accent for focus, selection and progress;
- a light and a dark theme, each designed on its own — in the dark one surfaces get lighter as they come forward and the accent and status colours are lifted, instead of simply inverting the light theme; it follows the system until you choose;
- dense lists and tables with a 13px working size, Geist for the interface and Geist Mono for task IDs and numbers;
- thin borders instead of cards and shadows, small radii, short functional transitions;
- status and priority are told apart by shape, not only by colour;
- on phones (< 900 px) the sidebar becomes a drawer.

All values live in `src/styles/_tokens.scss` (colour roles for both themes, type scale, spacing, borders, radii, shadows, motion, layers and component states); components use only those tokens.

## Tech stack

Angular 22 (standalone components, signals, `rxResource`) · Angular CDK (menus, dialogs, overlays, drag and drop) · SCSS design tokens · Vitest · nginx · Docker

No UI component library and no state library: the look is built from the design tokens, and list and board filters live in the URL.

## Running locally

```bash
npm install
npm start          # http://localhost:4200, expects the API at http://localhost:4000
npm test           # unit tests (Vitest)
npm run build      # production build into dist/
```

Set `FRONTEND_URL=http://localhost:4200` in the backend `.env`. Run `npm run seed` in the backend for a demo workspace and sign in as `ana@veltris.dev` / `password123`, or create an account at `/register`.

## Project structure

```
src/app/
  core/       API contracts and one service per resource, error normalization, auth (session,
              interceptor, guards), change notifications, current workspace, theme
  shared/     UI components (pickers, status and priority indicators, header, side panel, task
              row, dialogs, toast, tooltip, icons), utilities (dates, task texts, formatting)
  layout/     app shell (sidebar, drawer on phones), command palette, auth layout, 403/404
  features/   overview, projects, board, tasks, members, workspace, account, auth
src/styles/   tokens → CSS variables (light and dark), mixins, reset, base primitives
```

## Notable decisions

- **Access token in memory only.** The session is restored through the httpOnly refresh cookie; parallel 401 responses share a single refresh because the backend rotates the refresh token.
- **Changes show at once.** Moving a card or editing a property updates the screen immediately and then reloads from the server; a failed save is rolled back with a message.
- **One task view.** The board's side panel and the task page use the same component, so a field behaves the same wherever it is opened.
- **Reload by topic.** After a write, `Changes.notify('tasks' | 'projects' | 'workspace')` bumps a counter the affected screens depend on.
- **The user's today is sent to the API**, so "overdue" and "due this week" match the user's calendar day.
- Dialogs are loaded lazily, which keeps the initial bundle under 500 kB.

## Deployment

The `Dockerfile` builds the same-origin variant (API under `/api`) and serves it with nginx, which also proxies `/api` to the backend. It is started by the backend's `docker-compose.prod.yaml`.
