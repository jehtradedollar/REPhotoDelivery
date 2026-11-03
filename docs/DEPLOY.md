# Deploying

The app is a standard Next.js server with a PostgreSQL database. These steps use Vercel and Neon; any Node host and Postgres work the same way.

## 1. Database

1. Create a Postgres database (Neon, Supabase, RDS…). Copy its connection string.
2. Run migrations from your machine: `DATABASE_URL=... npm run db:migrate`.
   Re-run this after every update that adds a file to `drizzle/`.

## 2. App

1. Import the repo in Vercel.
2. Add environment variables from `.env.example`. Required: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `APP_URL` (your real domain, e.g. `https://media.reddingdrone.com`), the `NEXT_PUBLIC_STUDIO_*` values, and `STORAGE_PROVIDER=s3` with the AWS settings below. Local disk storage does not persist on serverless hosts.
3. Deploy, open `/setup` and create the owner account. `/setup` closes once an owner exists.

## 3. Media storage (S3)

1. Create a private bucket (Block Public Access on).
2. Create an IAM user with `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on `arn:aws:s3:::YOUR_BUCKET/*`, and set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
3. Add this CORS rule so browsers can upload directly:

```json
[{ "AllowedOrigins": ["https://YOUR_DOMAIN"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["*"], "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3600 }]
```

4. Optional: put CloudFront in front of the bucket and set `MEDIA_CDN_URL`. Only thumbnails and previews use it; originals always go through signed links after payment.

## 4. Payments (Stripe)

1. Set `STRIPE_SECRET_KEY` (start with a `sk_test_` key).
2. In Stripe → Developers → Webhooks, add `{APP_URL}/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.

Without Stripe keys, production shows agents "contact the studio to pay" unless `DEMO_MODE=true`.

## 5. Google Calendar

1. In Google Cloud, enable the Google Calendar API and create an OAuth client (Web application).
2. Authorized redirect URI: `{APP_URL}/api/google/callback`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then click **Connect** in Settings → Connected services.

## 6. Email and text messages

- Email: set `SMTP_URL` for any SMTP provider (Postmark, SendGrid, SES, Gmail app password) and optionally `MAIL_FROM`.
- Texts: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and either `TWILIO_FROM` or `TWILIO_MESSAGING_SERVICE_SID`. US numbers need A2P 10DLC registration in Twilio before texts deliver.

## 7. Virtual staging AI

Pick a vendor, then map its API in `src/lib/integrations/staging.ts` (the adapter there speaks a generic JSON shape and is the only file to change). Set `VIRTUAL_STAGING_API_URL`, `VIRTUAL_STAGING_API_KEY` and `VIRTUAL_STAGING_WEBHOOK_SECRET`, and give the vendor `{APP_URL}/api/webhooks/staging` as its callback URL. If the vendor has no callbacks, schedule `GET /api/cron/staging` with `Authorization: Bearer {CRON_SECRET}`; the delivery page also checks running jobs when it's opened.

Until then, staging requests queue on the project page and you upload the staged photo yourself. Set the one-time unlock price in Settings → Virtual staging.
