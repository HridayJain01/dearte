# Authentication

## Model

DeArte uses cookie-only authentication.

- access token: short-lived JWT in an `httpOnly` cookie
- refresh token: longer-lived JWT in a separate `httpOnly` cookie

The frontend should never read or store JWTs in `localStorage`.

## Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Browser behavior

- Axios requests use `withCredentials: true`
- On app boot, the frontend calls `/api/auth/me`
- Route guards use the returned user object, not a client-stored token

## Cookie settings

- local development: `sameSite=lax`, `secure=false`
- production: `sameSite=none`, `secure=true`

## Security requirements

- bcrypt password hashing
- login rate limiting
- refresh token rotation
- refresh token invalidation on logout and password reset

## Rule

If the session model or auth endpoints change, update this file and the frontend auth context together.
