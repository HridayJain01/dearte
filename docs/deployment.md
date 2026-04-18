# Deployment

## Target

- Frontend: Vercel
- API: Render
- Database: MongoDB Atlas
- Media: Cloudinary

## Domain strategy

- frontend: `app.<your-domain>`
- API: `api.<your-domain>`

Use custom domains early so cookie and CORS behavior matches production.

## Required environment variables

- `PORT`
- `CLIENT_ORIGIN`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Shipping checklist

- Atlas IP/network access configured for Render
- Render environment variables set
- Vercel environment variables set
- `CLIENT_ORIGIN` matches the frontend domain
- HTTPS enabled on both origins
- auth cookies tested across origins
- first admin seed account verified
- Cloudinary uploads and deletions verified
- storefront and admin smoke-tested

## Documentation checklist

If any deployment setting changes, update:

- `/Users/hridayjain/Documents/Projects/dearte/.env.example`
- this file
- `/Users/hridayjain/Documents/Projects/dearte/README.md`
