# DeArte Jewellery Platform

DeArte is a B2B jewellery commerce platform with a buyer-facing storefront, a backend-managed admin dashboard, MongoDB persistence, Cloudinary-based media handling, and cookie-only authentication.

## Stack

- Frontend: React, Vite, React Router, TanStack Query, React Hook Form, Zod, Recharts
- Backend: Express, Mongoose, Cloudinary SDK, bcryptjs, JWT cookies, helmet, express-rate-limit
- Infrastructure target: Vercel frontend, Render API, MongoDB Atlas, Cloudinary

## Local setup

### 1. Clone and install

```bash
git clone <repo-url>
cd dearte
npm install
```

### 2. Set up MongoDB Atlas (free tier)

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Go to **Database Access** → Create a database user with a password
4. Go to **Network Access** → Allow access from `0.0.0.0/0` (for local dev)
5. Click **Connect** on your cluster → Copy the connection string
6. Replace `<username>`, `<password>` in the string with your credentials

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET` and `JWT_REFRESH_SECRET`: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` twice
- `CLOUDINARY_*`: Optional for now (set to dummy values); needed for image uploads later

### 4. Start development

```bash
npm run dev
```

Local defaults:
- Frontend: `http://localhost:5173`
- API: `http://localhost:5001`

Demo accounts after first seed:
- Admin: `admin@dearte.com` / `Admin@123`
- Buyer: `buyer@lumina.com` / `Buyer@123`

## What changed

- MongoDB is now the source of truth for users, products, taxonomies, orders, catalogues, promotions, testimonials, and site settings
- Cloudinary signed uploads are available for admin-managed media
- Auth uses `httpOnly` cookies instead of `localStorage`
- ERP/sync integration routes and navigation were removed
- Admin APIs now expose taxonomy CRUD, searchable product selection, richer order details, and catalogue assignment flows

## Common issues

**MONGODB_URI is required:** Copy `.env.example` to `.env` and add your MongoDB Atlas connection string.

**Cannot connect to MongoDB:** Check that your IP is whitelisted in MongoDB Atlas Network Access.

**Port 5173 or 5001 already in use:** Edit `.env` and change `PORT` or `VITE_API_PROXY_TARGET`.
- `/Users/hridayjain/Documents/Projects/dearte/docs/deployment.md`
- `/Users/hridayjain/Documents/Projects/dearte/docs/auth.md`

Any change to data models, endpoint contracts, admin workflows, or deployment config should update the relevant docs in the same change set.
