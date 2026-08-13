# Solo — Rails API Backend

<img width="966" height="446" alt="image" src="https://github.com/user-attachments/assets/302b6845-4345-405b-b4d2-4a6116572f50" />


A Rails 8 API-only backend for Solo, a freelance invoicing and time tracking application. Handles clients, projects, charge codes, time tracking, task management, estimates, invoice generation with PDF output, file attachments, SOW import via AI, and email delivery.

**Frontend:** React/TypeScript SPA in [`frontend/`](frontend/) — served by the Docker stack on port 5173.

## Tech Stack

- **Ruby** 3.4 / **Rails** 8.1
- **PostgreSQL** 17 (self-hosted via Docker in both production and development)
- **Redis** + **Sidekiq** — background job processing
- **Prawn** — PDF generation
- **Active Storage** — file storage (PDFs, project attachments)
- **Action Mailer** + **letter_opener_web** (dev) — email delivery
- **Ollama** (via Docker) — local AI for SOW parsing

## Environments

Two isolated environments with separate databases and credentials.

| | Development | Production |
|---|---|---|
| Database | `invoice_dev` (Docker) | `invoice_prod` (Docker, self-hosted) |
| PostgreSQL port | 5432 (host-published for local tools) | 5432 (internal to the compose network only) |
| Rails env | `development` | `production` |
| Email | letter_opener_web | SMTP (configure separately) |
| Compose file | `docker-compose.yml` | `docker-compose.yml` + `docker-compose.prod.yml` |
| Env file | `.env` | `.env.prod` |

## Getting Started

### Prerequisites

- Docker and Docker Compose
- `.env` file based on `.env.example`

```bash
cp .env.example .env
```

Fill in values before starting.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY_BASE` | Rails secret key | required |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `invoice_dev` |
| `DB_USER` | PostgreSQL username | required |
| `DB_PASS` | PostgreSQL password | required |
| `SOW_PROVIDER` | AI provider for SOW import (`ollama`, `groq`, `anthropic`, `gemini`) | `ollama` |
| `SOW_API_KEY` | API key (not needed for ollama) | — |
| `SOW_OLLAMA_HOST` | Ollama service URL | `http://ollama:11434` |
| `SOW_OLLAMA_MODEL` | Model to use with Ollama | `phi3:mini` |

### Build and Run

```bash
docker compose up -d
```

This starts all services. On first run the frontend container installs its dependencies (~1 min before the UI is ready).

| Service | URL |
|---------|-----|
| Rails API | http://localhost:3000 |
| React frontend | http://localhost:5173 |
| Letter Opener (dev email) | http://localhost:3000/letter_opener |

### First Run — Pull the AI Model

On first startup, pull the Ollama model (one-time, ~2.3GB):

```bash
docker compose exec ollama ollama pull phi3:mini
```

The model is stored in a named Docker volume and persists across restarts.

### Database Setup (first run)

```bash
docker compose exec web bundle exec rails db:migrate db:seed
```

### Update User Credentials

```bash
docker compose exec web bundle exec rails console
User.first.update(email: "you@example.com", name: "Your Name", password: "yourpassword")
```

### Run Production

`docker-compose.prod.yml` is standalone — it is **not** layered on top of `docker-compose.yml`
(that used to be the pattern, but Compose merges same-named services across files additively for
keys like `ports:`/`volumes:`/`build.args` rather than replacing them, which silently leaked
dev-only settings — like Postgres and the app itself being published to the public internet —
into "production"). Run it on its own:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Recommended: add a shell alias to `~/.bashrc`:

```bash
alias solo-prod="docker compose -f docker-compose.prod.yml --env-file .env.prod"
```

Then use `solo-prod up -d`, `solo-prod exec web ...`, etc.

### Production — First Run

The `db_prod` and `redis_prod` services are self-hosted (no external DB dependency). The `web`
container's entrypoint runs `db:prepare` automatically on startup, so migrations apply on deploy —
no separate migrate step needed for a fresh setup. To run migrations manually (e.g. after a code
update without a full restart):

```bash
solo-prod exec web bin/rails db:migrate
```

## Backups

A backup script is provided at `scripts/backup.sh`. It dumps the Supabase database directly and copies Active Storage files.

```bash
bash scripts/backup.sh
```

Run from the project root (`.env.prod` must exist). No containers need to be running — the script connects directly to Supabase. Requires `postgresql-client-17` (`sudo apt install postgresql-client-17`). Backups are written to `~/backups/invoice/prod/` with timestamps and 14-day retention.

## API Endpoints

### Auth
```
POST   /auth/login
```

### Business Profile
```
GET    /business_profile
PATCH  /business_profile
```

### Clients
```
GET    /clients
POST   /clients
GET    /clients/:id
PATCH  /clients/:id
DELETE /clients/:id
GET    /clients/:id/rate
PATCH  /clients/:id/rate
```

### Projects
```
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
GET    /projects/:id/rate
PATCH  /projects/:id/rate
POST   /projects/:id/sow_import
```

### Task Groups & Tasks
```
GET    /projects/:project_id/task_groups
POST   /projects/:project_id/task_groups
PATCH  /projects/:project_id/task_groups/:id
DELETE /projects/:project_id/task_groups/:id
PATCH  /projects/:project_id/task_groups/reorder
POST   /projects/:project_id/task_groups/:task_group_id/tasks
PATCH  /projects/:project_id/task_groups/:task_group_id/tasks/:id
DELETE /projects/:project_id/task_groups/:task_group_id/tasks/:id
PATCH  /projects/:project_id/task_groups/:task_group_id/tasks/reorder
```

### Project Attachments
```
GET    /projects/:project_id/attachments
POST   /projects/:project_id/attachments
GET    /projects/:project_id/attachments/:id   (download)
DELETE /projects/:project_id/attachments/:id
```

### Time Entries
```
GET    /projects/:project_id/time_entries      (project-scoped)
POST   /projects/:project_id/time_entries
PATCH  /projects/:project_id/time_entries/:id
DELETE /projects/:project_id/time_entries/:id

GET    /time_entries                           (top-level, supports ?client_id, ?project_id, ?status, ?hide_charge_codes)
GET    /time_entries/:id
POST   /time_entries                           (charge code entries)
PATCH  /time_entries/:id
DELETE /time_entries/:id
```

### Charge Codes
```
GET    /charge_codes
POST   /charge_codes
PATCH  /charge_codes/:id
DELETE /charge_codes/:id
```

### Timer
```
GET    /timer
POST   /timer/start
POST   /timer/stop
PATCH  /timer
DELETE /timer
```

### Estimates
```
GET    /estimates
POST   /estimates
GET    /estimates/:id
PATCH  /estimates/:id
DELETE /estimates/:id
GET    /estimates/:id/pdf
POST   /estimates/:id/regenerate_pdf
POST   /estimates/:id/send_estimate
```

### Invoices
```
GET    /invoices
POST   /invoices
GET    /invoices/:id
PATCH  /invoices/:id
DELETE /invoices/:id
GET    /invoices/unbilled_entries              (?client_id, ?start_date, ?end_date)
GET    /invoices/:id/pdf
POST   /invoices/:id/regenerate_pdf
POST   /invoices/:id/send_invoice
```

## Key Concepts

### Authentication

All endpoints except `POST /auth/login` require an `Authorization: Bearer <token>` header. Tokens are JWT, valid for 24 hours.

### Charge Codes

Charge codes allow billing for work not tied to a project (consultations, training, admin, etc.). A `ChargeCode` has a short `code` identifier, an optional `description`, and an optional `rate` override. Time entries belong to either a project or a charge code — not both. Charge code entries carry a `client_id` directly for invoicing purposes.

### Invoice Generation

`POST /invoices` accepts `client_id`, optional `start_date`/`end_date`, and optional `time_entry_ids`.

- If `time_entry_ids` is provided, only those specific entries are included. The service validates that none are already billed.
- Otherwise, all unbilled entries for the client in the date range are included — both project-based and charge-code-based.

**Rate hierarchy:**
- Project entries: project rate → client rate → $0
- Charge code entries: charge code rate → client rate → $0

### Task Management

Projects have task groups, and task groups have tasks. Tasks have a status (`todo`, `in_progress`, `done`), a position for drag-to-reorder, and optional time estimates. Tasks can be linked to timer sessions and time entries.

### SOW Import

`POST /projects/:id/sow_import` accepts a `.md`, `.txt`, or `.docx` file (or raw `text` param) and uses an AI model to extract a task group with a flat list of tasks. The response is synchronous.

To switch providers, set `SOW_PROVIDER` in `.env`:
- `ollama` — local, private, free (default)
- `groq` — fast cloud inference, free tier available
- `anthropic` — Claude API
- `gemini` — Google Gemini API

### Project Attachments

Files up to 20MB can be attached to projects. Stored via Active Storage. In production, files persist in a named Docker volume (`storage_prod`).

### Email Delivery

Invoices and estimates are emailed via Action Mailer. In development, emails are captured by letter_opener_web at:

```
http://localhost:3000/letter_opener
```

### Invoice Statuses

`pending` → `sent` → `paid`

## Frontend

The React SPA lives in [`frontend/`](frontend/) and is served by the Docker stack on port 5173. It is a single-page app — all routes resolve to `index.html`.

### Tech Stack

- **React** 19
- **React Router** 7 — client-side routing
- **Tailwind CSS** 3 — utility-first styling
- **@dnd-kit** — drag-to-reorder for task groups and tasks
- **Luxon** — date/time handling
- **Vite** — build tooling and dev server

### Pages and Routes

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

### Project Structure

```
frontend/src/
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
```

### API Configuration

The frontend connects to `http://localhost:3000` by default. To point to a different backend, set `VITE_API_URL`:

```bash
VITE_API_URL=http://your-api-host npm start
```

### Building for Production

```bash
cd frontend && npm run build
```

Output goes to `frontend/dist/` (Vite's default `outDir`, unchanged in `vite.config.ts`). Since
this is a single-page app, the web server must serve `index.html` for all routes — see
`frontend/Dockerfile` and the root `Caddyfile` for how production does this (`try_files` falls
back to `index.html` for any unmatched path).

### Timesheets

Filter by client, project, and billing status (all / unbilled / invoiced), with an option to hide charge code entries. All columns are sortable. Selecting unbilled entries from the same client activates a **Create Invoice** button that carries the selection into the invoice form. Invoiced entries are locked (no edit or delete).

### Timer Integration

Select a project and optional task before starting. Starting the timer marks the task as In Progress. Stopping prompts to mark it Done. The active task is shown in the sidebar timer widget across all pages.

### Dialog Service

`src/services/dialog.js` provides `confirm()` and `alert()` as Promises rendered via `DialogProvider`. Used throughout the app instead of `window.confirm`.

## Models

| Model | Key Fields |
|-------|-----------|
| `Client` | name, contact_name, email1/2, phone1/2, address, sales_terms |
| `Project` | name, client_id |
| `TaskGroup` | title, position, project_id |
| `Task` | title, status, estimated_hours, position, task_group_id |
| `TimeEntry` | date, hours, description, project_id (optional), charge_code_id (optional), client_id (optional), task_id |
| `ChargeCode` | code, description, rate (optional), user_id |
| `TimerSession` | started_at, stopped_at, project_id, task_id |
| `Invoice` | status, total, start_date, end_date, client_id |
| `InvoiceLineItem` | hours, rate, amount, tax_rate, description, invoice_id, time_entry_id |
| `Estimate` | status, total, project_id |
| `EstimateLineItem` | hours, rate, amount, tax_rate, description, estimate_id, task_id |
| `Rate` | rate, client_id (optional), project_id (optional) |
| `BusinessProfile` | name, email, phone, address, hst_number, tax_rate, primary_color |
