<p align="center"><strong>Workspaces · Projects · Tasks</strong></p>

# Veltris — Frontend

Angular client for Veltris, a project management tool for teams: workspaces with members, projects with a short key, task boards with drag and drop, task details with subtasks, comments and a full change history — in a light and a dark theme.

- Backend: [Veltris-Backend](https://github.com/aleksa0206/Veltris-Backend)

## Screens

- **Workspace overview** — key numbers (open, overdue, due in the next 7 days, completed this week) as one strip, your open tasks grouped by urgency, projects in progress with their progress, and recent activity across the workspace.
- **Projects** — a data table with status, lead, progress, open and overdue counts and target date; filter by status, search by name or key, sort, paginate. Create and edit projects in a modal; the key is suggested from the name.
- **Board** — one column per status, cards with identifier, priority, due date, subtask progress, comments and assignee. Drag and drop between and within columns (saved as a single request), quick add per column, filters by text, assignee and priority (kept in the URL). Clicking a card opens it in a side panel.
- **Task details** — title and description edited in place, a property rail (status, priority, assignee, due date, project, reporter, dates), subtasks with one-click completion, and a timeline that merges comments with the change history.
- **Command palette** (`Ctrl/⌘ K`) — jump to any task by title or identifier (`WEB-12`), any project or page, create a project, switch theme, sign out.
- Sign-in with optional two-factor authentication, sign-up (creates your first workspace), password reset, account page; several workspaces with a switcher.

## Design system — "Quiet Precision"

Built for enterprise project work: dense, calm and exact rather than decorative.

- **Tokens** (`src/styles/_tokens.scss`): semantic colour roles (canvas, surface, raised, sunken; text levels; primary, accent, states; status and priority hues), type scale with a 13px working size, 4px spacing scale, hairline borders, radii up to 8px, theme-specific elevation, motion durations and easings, z-index layers and component states. Components never use raw values.
- **Two themes, designed separately.** Light uses neutral greys, an ink primary action and a cobalt accent. Dark is not an inversion: surfaces lighten as they come forward, borders carry the separation, accent and status hues are lifted and desaturated, the primary action inverts to light ink, and shadows only frame overlays. The theme follows the system until the user picks one, and is applied before the first paint.
- **Meaning before colour.** Status icons differ in shape (dashed, empty, half, three-quarter, filled check, filled cross) and priority in bar count, so they work in greyscale and for colour-blind users; overdue dates are red and say "3d overdue".
- **Typography**: Geist for the interface, Geist Mono for identifiers and figures.
- **Components** (`src/app/shared/ui`, `src/app/layout`): sidebar with workspace switcher, header with breadcrumbs, buttons, inputs, select menus (`app-picker` and the task pickers), dropdown menus, data table, task rows, board cards, status and priority indicators, modals, side panel, tooltips, notifications, command palette.

## Tech stack

Angular 22 (standalone components, signals, `rxResource`, `linkedSignal`) · Angular CDK (menus, dialogs, overlays, drag and drop, focus trap) · SCSS design tokens · Vitest · nginx · Docker

No UI component library and no state library: list and board state live in the URL, server state in resources that reload by topic.

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
  shared/     UI components (pickers, indicators, header, side panel, task row, dialogs, toast,
              tooltip, icons), utilities (dates, task texts, formatting), editors
  layout/     app shell (sidebar, drawer on small screens), command palette, auth layout
  features/   overview, projects, board, tasks (detail, timeline, dialog), workspace, account, auth
src/styles/   tokens → CSS variables (light and dark), mixins, reset, base primitives
```

## Notable decisions

- **Access token in memory only.** The session is restored through the httpOnly refresh cookie; parallel 401 responses share a single refresh because the backend rotates the refresh token.
- **Optimistic, but honest.** Board moves and property edits update the screen immediately, then reload from the server; a failed save rolls back and says why.
- **One task view, two places.** The board's side panel and the task page render the same component, so a field never behaves differently depending on where it was opened.
- **Reload by topic.** After a write, `Changes.notify('tasks' | 'projects' | 'workspace')` bumps a counter the affected resources depend on.
- **The user's today is sent to the API**, so "overdue" and "due this week" match the user's calendar day.
- Dialogs are loaded lazily, which keeps the initial bundle under 500 kB.

## Deployment

The `Dockerfile` builds the same-origin variant (API under `/api`) and serves it with nginx, which also proxies `/api` to the backend. It is started by the backend's `docker-compose.prod.yaml`.
