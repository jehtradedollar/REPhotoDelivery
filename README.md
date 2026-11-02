# REPhotoDelivery

Hosting website for managing client shoots and delivery between real estate photographer and real estate agents.

This is the UI-first build: every screen works end to end against an in-memory mock store, with S3, Stripe and Google Calendar behind interfaces so the real services can be dropped in later.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and use the **Demo access** buttons on the sign-in page:

- **Studio owner**: dashboard, calendar, projects, uploads, clients, invoices, settings.
- **Agent**: properties, galleries, booking, pay to unlock downloads, invoices.

You can also sign in with any client email from the mock data (for example `maya@summitrealty.com`). Data resets when the server restarts.

## What's in it

**Studio (owner)** at `/studio`
- Dashboard: shoots this week, items in editing, outstanding and paid totals, revenue by month, booking requests to confirm, recent activity.
- Calendar: month grid on desktop, agenda list on phones. Requested, confirmed and completed shoots are color coded.
- Projects: filter by status and search; each project has a progress tracker (booked, shot, uploaded, delivered, paid), drag-and-drop upload, gallery, shoot details, agent contact and invoice.
- "Deliver" marks the project delivered and issues the invoice. Agents see watermarked previews until it's paid.
- Clients: list, profile with properties and invoices, add client form.
- Invoices: list with filters, printable invoice view, mark paid manually.
- Settings: integration status, studio profile, services and packages.

**Agent portal** at `/portal`
- Properties grouped by listing, with an "unlock" banner for anything unpaid.
- Property page: gallery by photos, video, floor plans and 3D tour; lightbox with keyboard navigation; select and download, or download all once paid.
- Book a shoot: package picker, add-ons, live total, open time slots (taken times are crossed out).
- Pay to unlock: goes through the payment provider's checkout and comes back unlocked.
- Invoices and receipts.

**Design**: light theme by default with a dark mode toggle (remembered per browser), sidebar on desktop, bottom tab bar on phones.

## Code map

| Path | What |
|---|---|
| `src/app/studio/*` | Owner pages |
| `src/app/portal/*` | Agent pages |
| `src/app/api/download/*` | Download gate: checks the agent owns the project and has paid, then redirects to a storage URL |
| `src/app/api/webhooks/stripe` | Webhook that marks invoices paid |
| `src/lib/types.ts` | Domain model (clients, projects, shoots, media, invoices) |
| `src/lib/data.ts` | Data access; in-memory today, swap for a database later |
| `src/lib/actions.ts` | Server actions for every mutation |
| `src/lib/auth.ts` | Demo cookie auth; swap for a real provider |
| `src/lib/integrations/` | `StorageProvider`, `PaymentProvider`, `CalendarProvider` interfaces with mock implementations |
| `src/lib/brand.ts` | Studio name and contact details |

## Wiring up the real services

Copy `.env.example` to `.env.local`. Then, in `src/lib/integrations/`:

1. **S3**: implement `StorageProvider` with `@aws-sdk/client-s3` and presigned URLs (a sketch is in `storage.ts`). Uploads go browser → S3 directly; downloads are short-lived signed URLs handed out by `/api/download/*` only after payment.
2. **Stripe**: implement `PaymentProvider` with Checkout Sessions and verify webhooks in `handleWebhook` (sketch in `payments.ts`). Point a Stripe webhook at `/api/webhooks/stripe`.
3. **Google Calendar**: implement `CalendarProvider` with OAuth for the owner's account; create events on confirm and feed `getBusy()` into the booking slot picker.
4. Switch the exports in `src/lib/integrations/index.ts`.

Still to do before going live: a real database, real auth, transactional email (delivery and invite notices), and image thumbnails.
