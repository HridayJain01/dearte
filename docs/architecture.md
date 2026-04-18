# Architecture

## Overview

DeArte is split into two deployable applications:

- `client/`: React storefront and admin dashboard
- `server/`: Express API backed by MongoDB Atlas and Cloudinary

The frontend talks to the backend through `/api` and relies on `withCredentials: true` so browser cookies can carry authenticated sessions.

## Runtime flow

1. The browser loads the Vite/React app from the frontend origin.
2. Authenticated requests are sent to the API with cookies.
3. Express middleware validates the access cookie and loads the current user from MongoDB.
4. Route handlers read and write MongoDB documents through Mongoose models.
5. Admin media uploads are signed by the backend and uploaded directly from the browser to Cloudinary.
6. Cloudinary asset metadata is stored in MongoDB and returned to the frontend as structured asset objects.

## Major modules

- `server/src/config/database.js`: MongoDB connection
- `server/src/config/cloudinary.js`: Cloudinary configuration
- `server/src/bootstrap/seedDatabase.js`: first-run seed flow
- `server/src/models/`: Mongoose schemas and models
- `server/src/routes/publicRoutes.js`: storefront/public content
- `server/src/routes/authRoutes.js`: session lifecycle
- `server/src/routes/userRoutes.js`: buyer profile, cart, wishlist, orders, catalogues
- `server/src/routes/adminRoutes.js`: admin CRUD, uploads, reports

## Documentation update rule

If you change any of the following, update this file and the relevant docs page in the same edit:

- deploy topology
- auth/session flow
- storage providers
- admin data ownership boundaries
