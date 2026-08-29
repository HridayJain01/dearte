# Deployment

## Target

- Frontend: Vercel (`client/`)
- API: Vercel (`server/` — separate Vercel project, Root Directory = `server`)
- Database: MongoDB Atlas
- Media: Cloudinary

## Domain strategy

- frontend: `app.<your-domain>` (or the existing `*.vercel.app` client URL)
- API: `api.<your-domain>` (or the API project's `*.vercel.app` URL)

Use custom domains early so cookie and CORS behavior matches production.

## Required environment variables

### API project (Vercel → Project → Settings → Environment Variables)

- `NODE_ENV=production`
- `CLIENT_ORIGIN` — exact frontend origin (scheme + host, no trailing slash)
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Also set WhatsApp / email vars if you use those features. Optionally
`ADDITIONAL_CLIENT_ORIGINS` for fixed extra frontends.

For **Vercel preview deployments** of the client (unique `*.vercel.app` URLs), set
on the API project:
- `VERCEL_PREVIEW_TEAM` — team/scope slug from a preview host
  (e.g. `dearte-client-abc123-hridayjain01s-projects.vercel.app` → `hridayjain01s-projects`)

Without that, only `CLIENT_ORIGIN` (and the hardcoded production client URL) pass CORS.

### Frontend project

- `VITE_API_PROXY_TARGET` — full API base including `/api`
  (e.g. `https://your-api.vercel.app/api`). Overrides `client/.env.production` at build time.
- `VITE_SITE_URL` — canonical storefront origin for SEO (optional but recommended)

## First-time API seed (Vercel does not seed on cold start)

Locally, with production Atlas credentials in the environment:

```bash
npm run seed --workspace server
```

Only needed when the target database is empty (or you intentionally want seed backfills).

## Shipping checklist

- Atlas Network Access allows Vercel egress (use `0.0.0.0/0` if you cannot pin IPs)
- API Vercel project Root Directory = `server`
- API env vars set; `CLIENT_ORIGIN` matches the live frontend origin
- `GET https://<api-host>/api/health` returns ok
- Frontend `VITE_API_PROXY_TARGET` updated and client redeployed
- Auth cookies tested (login → reload → still logged in)
- WhatsApp webhook URL updated in Meta to `https://<api-host>/api/whatsapp/webhook`
- Cloudinary uploads verified
- Storefront and admin smoke-tested
- Render API service turned off only after the above passes

## Documentation checklist

If any deployment setting changes, update:

- `.env.example`
- this file
- `README.md`
