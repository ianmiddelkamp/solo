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

## Environments

Two isolated environments with separate databases and credentials.

| | Development | Production |
|---|---|---|
| Database | `invoice_dev` (Docker) | `invoice_prod` (Docker, self-hosted) |
| PostgreSQL port | 5432 (host-published for local tools) | 5432 (internal to the compose network only) |
| Rails env | `development` | `production` |
| Email | letter_opener_web | SMTP (configure separately) |
| Compose file | `docker-compose.yml` | `docker-compose.prod.yml` (standalone) |
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
| `SOW_PROVIDER` | AI provider for SOW import (`groq`, `anthropic`, `gemini`) | `anthropic` |
| `SOW_API_KEY` | API key for the chosen provider | required |
| `ANTHROPIC_API_KEY` | Claude API key, used directly (not via `SOW_PROVIDER`) by receipt parsing and the AI project summary feature | required for those features |

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

A backup script is provided at `scripts/backup.sh`. It dumps the self-hosted `db_prod` database and copies Active Storage files, then optionally ships both offsite.

```bash
bash scripts/backup.sh [reason]
```

`reason` labels what triggered the backup — the deploy workflow passes `pre-deploy` explicitly
(run automatically by CI/CD before every migration); anything run without an arg (the cron job,
or running it by hand) defaults to `auto`. Each run gets its own folder, `<reason>_<timestamp>`,
with `db/` and `files/` separated inside it:

```
~/backups/invoice/prod/
  pre-deploy_20260814_140300/
    db/invoice_prod.sql.gz
    files/storage.tar.gz
  auto_20260815_030000/
    db/invoice_prod.sql.gz
    files/storage.tar.gz
```

Run from the project root (`.env.prod` must exist). Requires `db_prod` to be running — the
database dump runs via `docker compose exec db_prod pg_dump` (not a host-side `pg_dump`, since
`db_prod` has no `ports:` mapping and isn't reachable from outside the compose network), so no
`postgresql-client` install is needed on the host anymore. Whole run-folders older than 14 days
are pruned.

### Offsite backups (Cloudflare R2)

If `BACKUP_STORAGE_URL` / `BACKUP_STORAGE_ACCESS_KEY_ID` / `BACKUP_STORAGE_SECRET_ACCESS_KEY` are
set in `.env.prod` (see `.env.example`), the script also uploads both files to Cloudflare R2
(S3-compatible) after the local backup completes — so a VPS failure can't take out the backups
along with the live data. The same `<reason>_<timestamp>/db|files/` structure is mirrored in the
R2 bucket. Requires the `aws` CLI on the host:

```bash
sudo apt install -y awscli
```

Without those env vars set (or without `aws` installed), the offsite step is skipped gracefully
— the local backup still runs and completes normally.

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
POST   /clients                          (also creates the client's required primary contact)
GET    /clients/:id
PATCH  /clients/:id
DELETE /clients/:id
GET    /clients/:id/rate
PATCH  /clients/:id/rate
```

### Contacts
```
GET    /clients/:client_id/contacts
POST   /clients/:client_id/contacts
PATCH  /clients/:client_id/contacts/:id
DELETE /clients/:client_id/contacts/:id
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
POST   /projects/:id/ai_summary                (?format=docx|md, body: { purpose, attachment_ids })
```

### Task Groups & Tasks
```
GET    /projects/:project_id/task_groups
POST   /projects/:project_id/task_groups
PATCH  /projects/:project_id/task_groups/:id
DELETE /projects/:project_id/task_groups/:id
PATCH  /projects/:project_id/task_groups/reorder
GET    /projects/:project_id/task_groups/export        (?format=docx|md)
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
GET    /time_entries/export                    (?format=csv|xlsx|md, same filters as the index above)
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
GET    /invoices/export                        (?format=csv|xlsx|md)
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

### Contacts

Each client has one or more `Contact`s (name, email, phone, phone2) instead of a single flat set
of contact fields on the client itself. Exactly one contact per client is `primary`, enforced both
in the model (setting a new primary unsets the old one) and by a partial unique index. Creating a
client requires creating its primary contact in the same request. A contact can be deleted only if
the client has more than one contact remaining and the one being deleted isn't primary — to delete
a primary contact, make a different one primary first.

Contacts can also carry freeform `Role` tags (e.g. "Billing", "Owner"), scoped per client — two
different clients can each have their own role of the same name; they're never shared.

Estimates and invoices each store which contact they're for (`contact_id`, defaults to the
client's primary at creation, editable afterward — editing it automatically regenerates the
attached PDF so the document never goes stale relative to what's stored). Sending either document
accepts an optional one-off `contact_id` override for that particular send only, without changing
the document's stored contact.

### Task Management

Projects have task groups, and task groups have tasks. Tasks have a status (`todo`, `in_progress`, `done`), a position for drag-to-reorder, and optional time estimates. Tasks can be linked to timer sessions and time entries.

### SOW Import

`POST /projects/:id/sow_import` accepts a `.md`, `.txt`, or `.docx` file (or raw `text` param) and uses an AI model to extract a task group with a flat list of tasks. The response is synchronous.

To switch providers, set `SOW_PROVIDER` in `.env`:
- `anthropic` — Claude API (default)
- `groq` — fast cloud inference, free tier available
- `gemini` — Google Gemini API

### Project Attachments

Files up to 20MB can be attached to projects. Stored via Active Storage. In production, files persist in a named Docker volume (`storage_prod`).

### Exports

Timesheets, Invoices, and a project's Task Groups can each be exported — generated entirely
server-side (`TableExport` for CSV/XLSX/Markdown, `MarkdownToDocx` for `.docx`) and returned as a
file download, rather than assembled in the browser:

- **Timesheets** (`GET /time_entries/export`) and **Invoices** (`GET /invoices/export`) — CSV,
  Excel (`.xlsx`), or Markdown. The timesheets export respects the same filters as the list page
  (`client_id`/`project_id`/`status`/`hide_charge_codes`).
- **Task Groups** (`GET /projects/:id/task_groups/export`) — a real `.docx` (built by hand as a
  minimal OOXML package, since the `docx` gem can only open/edit an existing file, not create one)
  or Markdown, including a table of each group's tasks, statuses, and hours.

All timestamps are converted explicitly to Eastern (`EXPORT_TIME_ZONE` in the relevant
controllers) rather than relying on the app's global `config.time_zone` — to be replaced with a
per-`BusinessProfile` timezone once that's added.

### AI Project Summary

`POST /projects/:id/ai_summary` (service: `ProjectAiSummary`) generates a summary of a project —
its details, task groups, and any of its attachments the caller explicitly selects — via the
Claude API, returned as a `.docx` or `.md` download. Instructions are keyed by `purpose`; only
`"project_brief"` exists today, but more can be added without changing how project context is
gathered.

Documents are opt-in: nothing is sent to Claude unless `attachment_ids` names it. Limits (kept
independent of the 20MB per-file upload limit): at most 5 selected attachments, 6MB each (staying
under Anthropic's 32MB per-request limit for PDFs), 20k extracted characters per text/Word
document. Returns `503` if `ANTHROPIC_API_KEY` isn't configured.

### Email Delivery

Invoices and estimates are emailed via Action Mailer, to the document's resolved contact (its
stored contact by default, or a one-off `contact_id` override passed to the send endpoint). In
development, emails are captured by letter_opener_web at:

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
| `/clients/new` | ClientForm | Create a new client with its required primary contact |
| `/clients/:id/edit` | ClientForm | Edit an existing client; manage its contacts (add/edit/make-primary/delete, role tags) |
| `/projects` | ProjectList | View all projects |
| `/projects/new` | ProjectForm | Create a new project |
| `/projects/:id/edit` | ProjectForm | Edit project, manage task board (with SOW import, task group export, and AI project summary), manage attachments |
| `/timesheets` | TimesheetList | View all time entries with filters, sorting, selection, invoice actions, and export |
| `/timesheets/new` | TimesheetForm | Log a new time entry against a project or charge code |
| `/timesheets/:id/edit` | TimesheetForm | Edit a time entry |
| `/timer` | TimerPage | Start/stop timer, select project and task |
| `/invoices` | InvoiceList | View all invoices with status badges and export |
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
  components/       # Shared components (Layout, TaskBoard, Timer, ExportMenu, dialogs, etc.)
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
| `Client` | name, address, sales_terms |
| `Contact` | name, email, phone, phone2, primary, client_id |
| `Role` | name, client_id |
| `Project` | name, client_id |
| `TaskGroup` | title, position, project_id |
| `Task` | title, status, estimated_hours, position, task_group_id |
| `TimeEntry` | date, hours, description, project_id (optional), charge_code_id (optional), client_id (optional), task_id |
| `ChargeCode` | code, description, rate (optional), user_id |
| `TimerSession` | started_at, stopped_at, project_id, task_id |
| `Invoice` | status, total, start_date, end_date, client_id, contact_id |
| `InvoiceLineItem` | hours, rate, amount, tax_rate, description, invoice_id, time_entry_id |
| `Estimate` | status, total, project_id, contact_id |
| `EstimateLineItem` | hours, rate, amount, tax_rate, description, estimate_id, task_id |
| `Rate` | rate, client_id (optional), project_id (optional) |
| `BusinessProfile` | name, email, phone, address, hst_number, tax_rate, primary_color |
