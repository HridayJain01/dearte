# Media Upload Flow

## Goal

Use direct browser uploads to Cloudinary while keeping signature generation private on the backend.

## Flow

1. Admin form requests a signature from `POST /api/admin/uploads/sign`
2. Backend returns:
   - `timestamp`
   - `signature`
   - `folder`
   - `cloudName`
   - `apiKey`
3. Browser uploads the file directly to Cloudinary
4. Browser receives the Cloudinary upload result
5. Browser sends the structured asset metadata in the normal CRUD payload
6. Backend stores the normalized asset object in MongoDB

## Folder convention

- `dearte/products/<style-code>/`
- `dearte/catalogues/`
- `dearte/banners/`
- `dearte/popups/`
- `dearte/events/`
- `dearte/testimonials/`
- `dearte/site/`

## Deletion

- Use `DELETE /api/admin/uploads/:publicId`
- Store `publicId` in MongoDB so replacements and removals can be handled cleanly

## Rule

If the upload payload or folder strategy changes, update this file.
