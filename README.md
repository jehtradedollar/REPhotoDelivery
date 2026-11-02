# REPhotoDelivery

Shoot booking and media delivery for a real estate photographer and the agents they work with: scheduling, uploads, galleries, invoices, payments, property websites and add-ons, in one Next.js app.

## Run it locally

You need Node 20+ and PostgreSQL.

```bash
npm install
cp .env.example .env.local      # set DATABASE_URL and AUTH_SECRET at minimum
npm run db:migrate
npm run db:seed                 # optional demo data with generated photos
npm run dev
```

Open http://localhost:3000. With an empty database you're sent to `/setup` to create the owner account. With demo data, sign in as `owner@example.com` or any agent (e.g. `maya@summitrealty.com`) with password `demo1234`, or set `DEMO_MODE=true` for one-click demo buttons.

Every outside service is optional in development. Without keys the app uses stand-ins: files on local disk, a demo checkout page, and emails and texts printed to the server log. **Settings → Connected services** shows what's live.

## What it does

**Studio (owner)** at `/studio`
- Dashboard, calendar (Google Calendar sync and free/busy), projects, clients, invoices.
- Uploads go straight from the browser to storage. The browser makes a thumbnail, a watermarked preview and an **MLS copy** (2048px, under 1 MB) of every photo; originals are never touched.
- Embedded links: Vimeo, YouTube, Matterport, iGUIDE, Kuula and similar play inside the gallery.
- **Deliver** issues the invoice and sends the agent the delivery email and text (templates editable in Settings).
- Every project has a **stand-alone delivery page** (`/d/<token>`) that works without signing in; it's the link the email and text send.
- Invoice editor, void, resend, mark paid. Services and packages, brokerages, location zones and stock packs, virtual staging price, delivery templates.

**Agents** at `/portal` (or the stand-alone delivery link)
- Galleries by photos, virtual staging, video, floor plans, embedded links and local area. Watermarked previews until paid; then **Full quality** or **MLS** downloads, one at a time, selected, or as a zip.
- Pay online (Stripe Checkout) to unlock.
- Book a shoot: square footage required; beds, baths, acreage and features optional. If the address is inside a studio **location zone**, a pop-up offers local-area stock photo packs as an add-on.
- **Virtual staging**: pick empty rooms, choose room type and style, describe the furniture, pay per photo; staged images arrive in the gallery.
- **Property websites** for every listing: three templates (Classic, Modern, Minimal), editable headline and MLS description, branded (`/p/<slug>`) and unbranded for MLS (`/p/<slug>/u`). Branding comes from the agent's own logo or their linked brokerage, plus their profile photo.
- Account: profile, photo, logo, brokerage link, password.

**Design**: light by default with a dark mode toggle, sidebar on desktop and bottom tabs on phones.

## Code map

| Path | What |
|---|---|
| `src/app/studio/*`, `src/app/portal/*` | Owner and agent pages |
| `src/app/d/[token]` | Stand-alone delivery page |
| `src/app/p/[slug]` | Public property websites |
| `src/app/api/download/*` | Download gate: session or delivery token, payment, `?v=mls` |
| `src/app/api/webhooks/*` | Stripe and virtual staging callbacks |
| `src/db/schema.ts`, `drizzle/` | Database schema (Drizzle ORM) and migrations |
| `src/lib/actions.ts` | Server actions for every change |
| `src/lib/data.ts`, `access.ts` | Reads, and who may see a project |
| `src/lib/integrations/` | Storage, payments, calendar, email, SMS and staging providers, each with a stand-in |
| `src/lib/upload-client.ts`, `image-server.ts` | Image derivatives in the browser and on the server |
| `scripts/` | Migrate and seed |

## Checks

```bash
npm test            # unit tests
npx tsc --noEmit    # types
npm run build
```

Deploying: see [docs/DEPLOY.md](docs/DEPLOY.md).
