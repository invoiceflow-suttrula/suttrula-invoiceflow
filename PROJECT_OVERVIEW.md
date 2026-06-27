# Invoice Flow — Project Overview

A bulk invoice generator for a small travel agency. A single staff user uploads (or
creates) a spreadsheet of customers/bookings, picks a template, and generates branded
PDF invoices in one batch — then previews, downloads (single or ZIP), and tracks them in
a ledger.

---

## 1. What the app does

- **Auth** — email/password + Google OAuth (Supabase Auth). All app pages are protected.
- **Data Sources** — upload `.xlsx`/`.csv` (parsed in-browser) *or* build a spreadsheet
  in-app; rows are stored in the database. Search, filter, preview, delete.
- **Templates** — two invoice designs (Travel Agency, Standard), stored in the DB.
- **Generate** — pick a data source + template → auto-map columns → hide fields / add
  custom fields → select which customers → generate one PDF per customer (rows grouped by
  customer), upload to storage, write ledger records, bundle a ZIP, preview & download.
- **Ledger** — all invoices grouped by date, expand/collapse, single + bulk delete,
  per-invoice in-app preview (with zoom) and PDF download, CSV export.
- **Settings** — company branding (name, GSTIN, address, email, mobile, phone, logo,
  bank details) + brand accent colour, with a live invoice preview.
- **Dashboard** — last-5-days stats, recent invoices, recent batches (auto-cleaned after
  5 days), and a storage-usage meter.
- Fully **responsive** (desktop sidebar → mobile slide-in drawer; pages stack on phones).

---

## 2. Tech stack

### Language & core framework
- **JavaScript (ES modules), JSX** — no TypeScript.
- **React 19** (`react`, `react-dom`) — UI library.
- **React Router 7** (`react-router-dom`) — client-side routing (`createBrowserRouter`).

### Build tooling
- **Vite 8** (`vite`, `@vitejs/plugin-react`) — dev server + production bundler.
- **ESLint 10** (`eslint`, `@eslint/js`, `eslint-plugin-react-hooks`,
  `eslint-plugin-react-refresh`, `globals`) — linting.
- **Node.js / npm** — package management and scripts.

### Backend / services (BaaS)
- **Supabase** (`@supabase/supabase-js`) — the entire backend:
  - **Auth** (email/password + Google OAuth)
  - **Postgres database** (tables below) with **Row-Level Security**
  - **Storage** (the `invoices` bucket for generated PDFs + ZIPs)

### Spreadsheet, PDF & files
- **SheetJS / xlsx** (`xlsx`) — parse uploaded `.xlsx`/`.csv` and export created sheets.
- **html2canvas** (`html2canvas`) + **jsPDF** (`jspdf`) — render the React invoice
  component to a high-resolution A4 PDF (current production path, so the PDF matches the
  on-screen template exactly).
- **@react-pdf/renderer** (`@react-pdf/renderer`) — an alternative vector-PDF renderer
  that was trialled; `InvoicePdfDoc.jsx` remains in the repo but the app currently uses
  the html2canvas path. (Kept for reference / future vector option.)
- **JSZip** (`jszip`) — bundle all generated invoice PDFs into a single ZIP.

### Fonts
- **@fontsource/dm-sans** and **@fontsource/jetbrains-mono** — installed as the app's
  typefaces. (DM Sans for body/headings, JetBrains Mono for mono/labels; loaded in the
  UI; the invoice PDFs use these via the captured HTML.)

### Hosting
- **Render** — static-site hosting for the production build. (`render.yaml` blueprint
  included; build = `npm install && npm run build`, publish dir = `dist`, with an SPA
  rewrite `/* → /index.html`.)

---

## 3. Architecture & data flow

```
Browser (React SPA, Vite)
        │  @supabase/supabase-js (anon key + user session)
        ▼
Supabase
  ├─ Auth            (sign in / OAuth; session persisted in localStorage)
  ├─ Postgres + RLS  (companies, data_sources, data_rows, templates,
  │                    invoices, invoice_batches)
  └─ Storage         (bucket "invoices": <batchId>/<ref>.pdf, <batchId>/batch.zip)
```

- **Data sources are NOT stored as files** — uploads are parsed in the browser (SheetJS)
  and only the **rows** are written to `data_rows` (jsonb); `data_sources` holds the
  metadata. The in-app "Create spreadsheet" writes the same records directly.
- **Generation** groups data rows by customer (name+email), builds one invoice per
  customer, renders each to PDF in the browser, uploads PDFs + a ZIP to Storage, and
  writes `invoices` + `invoice_batches` rows.
- **Branding** (company name, logo, accent colour, bank details) comes from the single
  `companies` row and is applied to every invoice and preview.

---

## 4. Database tables (Supabase Postgres)

| Table | Purpose | Key columns |
|---|---|---|
| `companies` | Single company / branding | name, gstin, address, email, phone, mobile, logo_url, accent_color, account_holder, account_number, bank_name, ifsc_code, upi_id |
| `data_sources` | One per uploaded/created sheet | user_id, file_name, file_type, row_count, column_count, detected_columns (jsonb), status |
| `data_rows` | Parsed rows for a source | data_source_id, row_index, row_data (jsonb) |
| `templates` | Invoice designs | name, layout_type (→ variant), is_default, company_id |
| `invoices` | Generated invoice ledger | ref_number, client_name, email, item_summary, amount, status, issued_date, pdf_storage_path, hidden_fields (jsonb), data_source_id, template_id |
| `invoice_batches` | One per generation run | batch_name, invoice_count, total_amount, zip_storage_path |

RLS is enabled; policies allow the authenticated user to read/write/delete its data, and
to read/write/delete objects in the `invoices` storage bucket.

---

## 5. Project structure (key files)

```
webapp/
├─ index.html
├─ vite.config.js
├─ render.yaml                     # Render deploy blueprint
├─ package.json
└─ src/
   ├─ main.jsx                     # React entry
   ├─ App.jsx                      # Router, providers, splash, error boundary
   ├─ index.css / styles*.css      # globals + responsive rules
   ├─ contexts/AuthContext.jsx     # Supabase auth state
   ├─ hooks/useIsMobile.js         # responsive breakpoint hook
   ├─ lib/
   │  ├─ supabase.js               # Supabase client (env vars)
   │  ├─ invoicePdf.js             # auto-map, group, render PDF, upload, ZIP
   │  └─ InvoicePdfDoc.jsx         # (react-pdf vector doc — alt renderer)
   ├─ components/
   │  ├─ Shell.jsx                 # sidebar / mobile drawer layout
   │  ├─ Invoice.jsx               # invoice template (variants) used for previews + PDF
   │  ├─ StorageMeter.jsx, HIcon.jsx, ProtectedRoute.jsx,
   │  ├─ DeleteConfirmationModal.jsx, ErrorBoundary.jsx, BrandMark.jsx
   └─ pages/
      ├─ Auth.jsx, Loading.jsx, ErrorPage.jsx, Errors.jsx
      ├─ Dashboard.jsx, DataSources.jsx, CreateSpreadsheet.jsx
      ├─ Templates.jsx, Generate.jsx, Ledger.jsx, PreviewTicket.jsx, Settings.jsx
      └─ Onboarding.jsx, TemplateGen.jsx (prototype screens)
```

---

## 6. Setup & run (local)

```bash
cd webapp
npm install
# .env  (Vite reads these at build time)
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the built dist/
```

**Environment variables** (`.env` locally, Render env vars in prod):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon (public) key
- `VITE_STORAGE_LIMIT_GB` — optional, storage meter capacity (default 1.5)

> The **service-role key** is used only for one-off admin/seed scripts during
> development — it is never shipped in the app.

---

## 7. Deployment (Render)

- Push the `webapp` folder to a Git repo.
- Render → **Static Site** (or Blueprint via `render.yaml`):
  - Build: `npm install && npm run build`
  - Publish: `dist`
  - Rewrite: `/*` → `/index.html`
  - Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Add the deployed URL (and `http://localhost:5173/**` for dev) to
  **Supabase → Authentication → URL Configuration → Redirect URLs**.

---

## 8. Notable engineering decisions

- **No backend server** — everything runs client-side against Supabase (fits a static
  deploy; no cron, so the 5-day batch cleanup runs on Dashboard load).
- **PDF = captured HTML** (html2canvas + jsPDF) so the download matches the on-screen
  template exactly (logo, DM Sans font, accent colour, alignment); trade-off is image-
  based (non-selectable) text. A vector renderer (`@react-pdf/renderer`) is available if
  selectable text is later preferred.
- **Per-customer grouping** — multiple spreadsheet rows for the same person become one
  invoice with multiple line items.
- **Responsive** via a mobile breakpoint hook + CSS (sidebar → drawer; grids stack).
