# Solo — Frontend

![Solo](src/logo.png)

A React 19 single-page application for managing clients, projects, time tracking, charge codes, estimates, and invoices. Built as the frontend for the Solo Rails API.

## Tech Stack

- **React** 19
- **React Router** 7 — client-side routing
- **Tailwind CSS** 3 — utility-first styling
- **@dnd-kit** — drag-to-reorder for task groups and tasks
- **Luxon** — date/time handling
- **Create React App** — build tooling

## Getting Started

### Prerequisites

- Node.js 18+
- The [Rails API backend](https://github.com/ianmiddelkamp/solo_backend) running on `http://localhost:3000`

### Install and Run

```bash
npm install
npm start
```

The app runs at `http://localhost:8080` by default.

### API Configuration

The frontend connects to the Rails API at `http://localhost:3000` by default. To point to a different backend:

```bash
REACT_APP_API_URL=http://your-api-host npm start
```

## Pages and Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | — | Redirects to `/clients` |
| `/clients` | ClientList | View all clients |
| `/clients/new` | ClientForm | Create a new client |
| `/clients/:id/edit` | ClientForm | Edit an existing client |
| `/projects` | ProjectList | View all projects |
| `/projects/new` | ProjectForm | Create a new project |
| `/projects/:id/edit` | ProjectForm | Edit project, manage task board (with SOW import), manage attachments |
| `/timesheets` | TimesheetList | View all time entries with filters, sorting, selection, and invoice actions |
| `/timesheets/new` | TimesheetForm | Log a new time entry against a project or charge code |
| `/timesheets/:id/edit` | TimesheetForm | Edit a time entry |
| `/timer` | TimerPage | Start/stop timer, select project and task |
| `/invoices` | InvoiceList | View all invoices with status badges |
| `/invoices/new` | InvoiceForm | Select unbilled entries and generate an invoice |
| `/invoices/:id` | InvoiceDetail | View line items, send, download, or regenerate PDF |
| `/estimates` | EstimateList | View all estimates |
| `/estimates/new` | EstimateForm | Generate an estimate from project tasks |
| `/estimates/:id` | EstimateDetail | View and send an estimate |
| `/charge-codes` | ChargeCodesPage | Manage charge codes for non-project billable time |
| `/settings` | SettingsPage | Configure business profile |

## Project Structure

```
src/
  api/              # API client modules (one per resource)
  components/       # Shared components (Layout, TaskBoard, Timer, dialogs, etc.)
  context/          # TimerContext — shared timer state across pages
  pages/
    auth/
    clients/
    charge-codes/
    estimates/
    invoices/
    projects/
    settings/
    timesheets/
    timer/
  services/
    dialog.js       # Promise-based confirm/alert dialog service
  utils/
    dates.js        # Date formatting and calculation helpers
  index.js
  App.js
```

## API Modules

| Module | Covers |
|--------|--------|
| `clients.js` | CRUD for clients |
| `projects.js` | CRUD for projects |
| `tasks.js` | CRUD and reorder for task groups and tasks |
| `timeEntries.js` | CRUD for time entries — project-scoped and top-level (charge code entries) |
| `chargeCodes.js` | CRUD for charge codes |
| `timer.js` | Start, stop, cancel, get current timer session |
| `rates.js` | Get/set rates for clients and projects |
| `invoices.js` | CRUD, unbilled entry preview, PDF download, regenerate, send |
| `estimates.js` | CRUD, PDF download, regenerate, send |
| `attachments.js` | Upload, list, download, delete project attachments |
| `sowImport.js` | Parse a SOW file via backend AI |
| `businessProfile.js` | Get/update business profile |

## Key Features

### Charge Codes

Charge codes enable billing for work that isn't tied to a specific project — consultations, training, admin, code review, etc. Each code has a short identifier (e.g. `CONSULT`), an optional description, and an optional rate override (falls back to client rate). Managed at `/charge-codes`. Time entries can be logged against a charge code + client instead of a project.

### Timesheets

Filter by client, project, billing status (all / unbilled / invoiced), and optionally hide charge code entries. All columns are sortable. Rows have checkboxes — selecting unbilled entries from the same client activates a **Create Invoice** button that carries the selection directly into the invoice flow. Invoiced entries are locked (no edit or delete).

### Invoice Generation

Two-step flow: select a client and date range, then review all unbilled entries (project and charge code) with checkboxes before generating. Pre-selection is supported when navigating from the timesheets page. The backend validates that submitted entries are not already billed.

### Task Board

Projects have a task board available on the project edit page and the timer page. Task groups can be reordered and tasks can be dragged between groups. Each task has a status selector (To do / In progress / Done) and optional time estimates.

### SOW Import

Upload a `.md`, `.txt`, or `.docx` Statement of Work (or paste text directly) to generate a task group with a flat task list. Preview and edit before importing. Powered by a configurable AI backend — Ollama, Groq, Anthropic, or Gemini.

### Timer Integration

Select a project and task before starting. Starting marks the task as In Progress. Stopping prompts to mark it Done. The active task is shown in the sidebar timer widget.

### Project Attachments

Files can be attached to a project via drag-and-drop or file picker. Downloaded through authenticated streaming.

### Dialog Service

`src/services/dialog.js` provides `confirm()` and `alert()` as Promises, rendering through `DialogProvider`. Used instead of `window.confirm` throughout the app.

## Building for Production

```bash
npm run build
```

Output goes to `build/`. Since this is a single-page app, your web server must serve `index.html` for all routes:

```nginx
location / {
  try_files $uri /index.html;
}
```
