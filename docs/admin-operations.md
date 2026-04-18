# Admin Operations

## Products

Admins can:

- create and edit products
- assign category, subcategory, collection, and metal option IDs
- upload and reorder media
- set stock type and stock quantity
- activate or deactivate products

Tables and selectors should always show a thumbnail beside the product identity where possible.

## Taxonomies

Admins manage:

- categories
- subcategories
- collections
- metal options

These records power dropdowns and search selectors across the admin product and catalogue flows.

## Orders

The admin order workflow supports:

- viewing buyer details
- viewing shipping address and notes
- viewing line items with product identity
- editing status
- editing shipping/payment/notes
- editing order lines when needed

Stock rules:

- ready-stock inventory is deducted when an order moves into `Approved`, `Processing`, `Shipped`, or `Fulfilled`
- inventory is restored when a deducted order moves back to `Cancelled`, `Rejected`, or `Pending`

## Catalogues

Catalogue workflows should use search-and-select, not manual IDs:

- search products by style code, name, category, or collection
- preview selected products with thumbnails
- search and assign users
- manage cover image, active state, and archived state

## Media

All admin media should be uploaded through the signed Cloudinary flow. Do not reintroduce raw image URL text fields for products, banners, popup ads, events, testimonials, or taxonomy images.

## Docs rule

If an admin form changes, update this file in the same change set.
