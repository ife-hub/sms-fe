# School dashboard (frontend)

Next.js frontend for the School Management SaaS MVP. One login, one dashboard shell; navigation, routes
and actions are driven by the permissions on the signed-in account. No real API yet: a mock API runs in the
browser so every screen works today.

## Run it

```bash
yarn install
yarn dev          # http://localhost:3000
yarn build        # production build
yarn lint         # type-check (tsc --noEmit)
```

Demo accounts are listed on the login page while mocks are on:

| Role | Username | Password |
| --- | --- | --- |
| Super administrator | `superadmin` | `Password123!` |
| Administrator | `admin` | `Password123!` |
| Staff | `staff` | `Password123!` |
| Student | `grn-2024-001` | `Student#2026!` |
| Student (must change password) | `grn-2024-002` | `Temp#Pass2026` |

Mock data lives in `localStorage` (key `sms-mock-db-v1`). Clear it to reset the demo.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · TanStack Query · axios · zustand · yup + react-hook-form ·
Tailwind CSS 4 · Radix Dialog · MSW (mock API) · qrcode.react · html5-qrcode · papaparse

## How the pieces fit

```text
src/
├── app/
│   ├── (auth)/            login, forced password change
│   └── (app)/             guarded shell + every dashboard screen
├── components/
│   ├── ui/                button, form fields, card, table, dialog, feedback states
│   ├── shell/             sidebar, header
│   ├── student/           tabs on the student detail page
│   └── forms/             change password, guardian contacts
├── hooks/                 react-query hooks (queries.ts), useCan / <Can>
├── lib/
│   ├── api.ts             axios instance + token refresh
│   ├── permissions.ts     permission keys + role matrix from the PRD
│   └── navigation.ts      sidebar items + route rules (direct-URL protection)
├── services/              typed API calls, the only place that knows endpoint URLs
├── stores/auth-store.ts   zustand: user + in-memory access token
├── validation/schemas.ts  all yup schemas
├── mocks/                 MSW handlers + seeded database (delete when the API is live)
└── proxy.ts               optimistic redirect using a hint cookie
```

### Auth and token expiry (`src/lib/api.ts`)

- The access token lives in memory (zustand). The refresh token is expected in an **httpOnly cookie** set by the API.
- The **request interceptor** checks the token's `exp` before every call. If it is expired or about to be,
  it awaits a single shared `POST /auth/refresh`, then sends the request with the new token. Parallel
  requests share one refresh.
- A response interceptor retries once on a 401 as a safety net (for example a revoked session).
- If refresh fails the session is cleared and the user goes to `/login?reason=expired`.
- On page load `bootstrapSession()` calls `/auth/refresh` to restore the session.
- Mock access tokens last 120 seconds (`ACCESS_TTL_SECONDS` in `mocks/handlers.ts`) so you can watch it work.

### Permissions

Menu items, route access and buttons all come from `user.permissions`, never from role names.
`ROLE_PERMISSIONS` in `lib/permissions.ts` encodes the PRD matrix and is used by the mock server only;
the real API should return the same keys on the login/refresh response. Use `useCan()` or `<Can any={[...]}>`
in components. Hidden UI is not security: the API must enforce every rule.

## Switching to the real API

1. Set `NEXT_PUBLIC_USE_MOCKS=false` and `NEXT_PUBLIC_API_URL` to the NestJS base URL.
2. Make the API match the shapes in `src/types/index.ts` and the URLs in `src/services/*.ts`.
   `POST /auth/login` and `POST /auth/refresh` return `{ accessToken, user }` (with `user.permissions`).
3. Enable CORS with credentials for this origin, or proxy `/api` through Next.
4. Delete `src/mocks` and `public/mockServiceWorker.js`.

## Decisions to confirm

- **Validation uses `yup`.** The npm package `yop` is an empty 0.0.0 placeholder. If you meant another library,
  only `src/validation/schemas.ts` and the `yupResolver` imports change.
- **Bulk import is CSV only** (no Excel yet). Valid rows are imported even when others fail (the PRD's open question 4).
- **QR codes are shown once.** The raw credential is returned only at issue time (and to the owning student),
  so a printed copy means issuing a replacement. Students can view their own QR (PRD open question 3).
- **Guardian contacts are optional** per student (PRD open question 1); import raises a warning when none is given.
- QR verification sits in the sidebar for staff; administrators reach it from the QR credentials page.
- Account recovery (forgot password) is not built: the PRD makes recovery school-assisted for students.
