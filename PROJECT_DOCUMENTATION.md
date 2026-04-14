# De Arté Jewels - Project Documentation & PRD

## 1. Product Overview & Vision
**De Arté Jewels** is a premium business-to-business (B2B) e-commerce platform designed expressly for retail partners, boutique jewelers, and trade clients. 
The platform provides a highly curated, editorial-style shopping experience mapping to a refined, feminine aesthetic (Ivory Cream, Soft Blush Pinks, Deep Ruby touches). 
Instead of typical direct-to-consumer features, it incorporates robust B2B functionalities such as:
- Custom product configuration (Gold Carats, Metal Colors, Diamond Qualities).
- Segregated wishlists mappings grouped by custom collections (e.g., "Holiday 2026 Assortment").
- Private catalog allocations (Sales reps curating specific lists for buyers).
- Approval-based order processing without immediate payment collection.

## 2. Architecture & Technology Stack

### Frontend (Client App)
- **Framework:** React 18 using Vite for HMR and blazing fast builds.
- **Routing:** React Router v7 (`react-router-dom`) with standard browser history.
- **Styling:** Tailwind CSS v4 configured natively within `index.css`. The entire application utilizes an exhaustive CSS variables system to implement the brand's exact aesthetic rules without using scattered Tailwind utility colors.
- **State Management & Data Fetching:** 
  - Axios for API calling.
  - React Context + Hooks (`useCart`, `useWishlist`, `useProducts`) for global state synchronization.
  - Custom UI `Primitive` hooks for global design components.

### Backend (Server API)
- **Framework:** Node.js + Express.js.
- **Persistence:** Currently utilizes an in-memory mapped mock database via JSON storage structures located inside `/services/store.js`. (No external driver like Mongoose/Prisma is wired yet).
- **Security:** JWT (JSON Web Tokens) generated using `jsonwebtoken`, stored within HTTP-Only Cookies. Passwords are hashed utilizing `bcryptjs`.
- **Scheduled Jobs:** `node-cron` simulates regular ERP syncs (pulling new products/inventory logs every 3 hours).

---

## 3. Directory Structure

```
/dearte
├── /client (React App)
│   ├── /src
│   │   ├── /components
│   │   │   ├── /admin      # Admin dashboard views, metric panels
│   │   │   ├── /auth       # Login & Registration gateways
│   │   │   ├── /home       # Hero banners, Strip displays
│   │   │   ├── /layout     # AppLayout (nav/footer) and AdminLayout
│   │   │   ├── /product    # Product Grid, ProductCards, Filters
│   │   │   └── /ui         # Shared UI Primitives (Buttons, Panels)
│   │   ├── /hooks          # Controllers (useCart, useWishlist)
│   │   ├── /pages          # Top level Route components (Home, Store, Checkout)
│   │   ├── /utils          # Constants, Formatters
│   │   └── index.css       # Core variables & Theme configs
│
└── /server (Express App)
    ├── /src
    │   ├── /controllers    # Business logic execution
    │   ├── /data           # File-based mock data resources
    │   ├── /middleware     # JWT `requireAuth`, `requireAdmin` roles checks
    │   ├── /routes         # Routers mapped to /api path
    │   ├── /services       # `store.js` logic and array manipulations
    │   ├── /utils          # `sendSuccess` and `sendError` standard formatters
    │   └── index.js        # Server instantiation
```

---

## 4. Core Modules & Workflows

### 1. Authentication (`authRoutes.js`)
- Exposes standard `/login`, `/register`, `/logout` routes.
- Returns JWT payloads to securely maintain B2B sessions.
- Users have distinct `role` permissions (buyer vs. admin/staff).

### 2. Product Discovery & Public Content (`publicRoutes.js`)
- Used by both authenticated guests and users.
- **Listing Filters:** The `/api/products` endpoint handles deep multi-filter querying, allowing clients to specify `diamondMin`, `goldMax`, `stockType`, `collections`, and generic text searches.
- **Statics:** Pulls homepage banners, trusted testimonials, and static page content mappings.

### 3. User Journey (Cart & Wishlist) (`userRoutes.js`)
- **Cart Variations:** Unique logic checks `customization` configurations objects. If a user adds an 18KT ring, and later adds a 14KT ring of the exact same `productId`, creating two distinct line items utilizing `uuidv4()` mapping.
- **Multi-Collection Wishlist:** Buyers do not just like products; they save them to grouped named identifiers managed in their profile (handled by `/api/wishlist/collections`).
- **Order Placement:** Carts convert to `Orders` mapping to `Pending` statuses alongside custom special instructions and designated shipping.

### 4. Admin Management (`adminRoutes.js`)
- Accessible only if `req.user.role === 'admin'`.
- **Dashboards:** Metrics spanning `/reports/product-wise` vs `/reports/category-wise` analyzing cart added versus final order ratios.
- **Private Cataloging:** Admins execute commands against `/catalogues` to map specific subsets of exact `productIds` to distinct `userIds`.
- **Global Config Overrides:** Admins can live-update `siteSettings` and `emailSettings` structures.

---

## 5. UI/UX Design System Rules
The frontend strictly dictates a brand aesthetic mapping built inside `index.css`:
- **Typography:** `Cormorant Garamond` (serif) handles primary elegant headings. `Jost` (sans-serif) supports descriptions and body labels.
- **Colors:**
  - `var(--color-primary-bg)`: `#FAF6EF` (Ivory Cream) serves as the persistent backdrop.
  - `var(--color-card-bg)`: `#F5E4E8` (Soft Blush Pink) handles elevated elements.
  - `var(--color-heading)`: `#2C1810` (Deep Mahogany), moving away from strict #000.
  - `var(--color-deep-ruby)`: `#8B2635` commands the primary call-to-actions.
- **Button Primitives:**
  - Primary: Fills with Deep Ruby, turns to `#3D2B2B` (Charcoal) upon hover.
  - Secondary: Fills with Rose Petal, scales up gently.
  - Ghost: Transparent utilizing border outlines dynamically shifting states.

## 6. Future Expansion Guidelines
When pushing updates moving forward:
1. **DB Drivers:** Replace the `store.js` dependency mappings securely onto robust PGSQL or MongoDB databases gracefully (all routes are structured securely, only the service layer needs database transaction wrappers).
2. **Pricing Engine:** Expand the `customization` node array object mapping inside the cart functions to connect directly to live APIs determining diamond or precious metal dynamic API pricing (as of writing, prices are negotiated manually).
3. **Deploying:** Remember the current `package.json` configurations are set primarily for dev-mode testing using `nodemon` and typical memory environments. Secure the CORS configuration mapping `http://localhost:5173` to your production URL mappings.
