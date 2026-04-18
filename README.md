# DeArte Jewellery Platform

A MERN-style B2B jewellery ordering platform built from the supplied PRD, with:

- Luxury editorial React storefront
- Role-aware admin dashboard
- Express API with seeded mock business data
- Buyer auth, cart, wishlist, checkout, catalogues, education pages, and trust pages
- Admin modules for dashboard, promotions, users, products, orders, catalogues, config, testimonials, roles, reports, and ERP sync

## Tech

- Frontend: React, Vite, React Router, TanStack Query, Tailwind CSS, React Hook Form, Zod, Recharts, Lucide
- Backend: Express, JWT, bcryptjs, cookie-parser, node-cron

## Run locally

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5001`
- Copy [.env.example](.env.example) to a local `.env` file if you want to change ports or host origins.
- Start from the repository root so the workspaces boot together.
- If you run client and server separately, keep the client proxy target and server CORS origin aligned.

## Demo accounts

- Buyer: `buyer@lumina.com` / `Buyer@123`
- Admin: `admin@dearte.com` / `Admin@123`

## Notes

- Product data is seeded in-memory in [`server/src/data/seed.js`](/Users/hridayjain/Documents/Projects/dearte/server/src/data/seed.js).
- The app intentionally shows no pricing anywhere on the buyer-facing UI.
- The current backend is mock-data driven but shaped around the PRD’s REST contract so it can be swapped to MongoDB/Mongoose later.
- `npm run build` and `npm run lint` both pass.
- Vite currently reports a large client bundle warning; the next optimization step would be route-level code splitting for public/admin pages.
