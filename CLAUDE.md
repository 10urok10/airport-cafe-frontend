# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Airport Cafe frontend: a React/Vite POS UI for cafe order-taking, kitchen display, inventory, and admin reporting. Talks exclusively to [airport-cafe-backend](https://github.com/10urok10/airport-cafe-backend) over HTTP — no local state is authoritative, everything renders from what the API returns. Designed for mouse+keyboard on a single in-store computer, not touch or mobile.

## Commands

```bash
npm install
npm run dev       # dev server with HMR, http://localhost:5173
npm run build     # production build -> dist/
npm run preview   # serve the production build locally
npm run lint       # oxlint
```

Requires `.env` (`VITE_API_URL=http://localhost:3000` by default) pointing at a running backend. Vite only reads `.env` at startup — changing it requires restarting `npm run dev`.

## Architecture

### Routing and access control

`App.jsx` nests routes inside two wrapper components rather than checking auth per-page:
- `ProtectedRoute` (`components/ProtectedRoute.jsx`) redirects to `/login` if `useAuth().isAuthenticated` is false, otherwise renders `<Outlet />`.
- `AdminRoute` (`components/AdminRoute.jsx`) does the same auth check plus `user.role === 'ADMIN'`, redirecting non-admins to `/orders`. Wraps `/products` and `/reports` only.

The backend already returns `403` for these same routes if bypassed, so this is a UX guard (skip the flash of a broken page), not the actual security boundary — the API is what's authoritative.

There is deliberately no staff-management page (`/users` exists on the backend but has no frontend route) — users are managed directly against the database for now.

### Auth: token storage and the API client

`context/AuthContext.jsx` holds `user`/`token` in React state, initialized from `localStorage` (`api/client.js`'s `getToken()` and the `airport_cafe_user` key) so a page refresh doesn't lose the session. `login(pinCode)` calls `POST /auth/login` with `skipAuth: true` (no token to send yet), then persists both the JWT and the user object.

`api/client.js#apiFetch(path, { method, body, skipAuth })` is the single chokepoint for every backend call: it prefixes `VITE_API_URL`, attaches `Authorization: Bearer <token>` unless `skipAuth`, and throws `ApiError` (message + HTTP status) on any non-2xx response so callers can `catch` and show `err.message` directly — the backend's error shape (`{ error: "..." }`) is assumed everywhere this is used.

### Data fetching: TanStack Query, no other client state

Every page fetches through `useQuery`/`useMutation` (`@tanstack/react-query`, single shared `QueryClient` from `main.jsx`). The convention after any mutation is `queryClient.invalidateQueries({ queryKey: [...] })` rather than manually patching cached data — simpler to reason about at this scale, and correctness matters more than shaving a refetch. `queryKey` arrays double as the cache-scoping mechanism (e.g. `['products', 'admin', includeInactive]` on `ProductsPage` so toggling "show inactive" doesn't collide with the plain `['products']` key `OrderPage` uses).

### Kitchen display: polling, not push

`KitchenPage.jsx` has no WebSocket — each of the three columns (`Bekleyen`/`Hazirlaniyor`/`Son Tamamlananlar`) is a separate `useQuery` against `GET /orders?status=X` with `refetchInterval: 5000`. `PENDING`/`PREPARING` are reversed client-side (`oldestFirst`) because the backend's default `orderBy: updatedAt desc` is correct for a history view but wrong for a kitchen queue, where the longest-waiting order must be most visible. Cards get a red ring past `LONG_WAIT_MINUTES` (10) based on `createdAt`, computed client-side on every render (no server-side "is this late" flag).

### Staff orders skip the kitchen queue entirely

`OrderPage.jsx`'s "Personel Siparisi" toggle sends `isStaffOrder: true` on `POST /orders`. The backend zeroes the price and creates the order already `COMPLETED` (see backend `CLAUDE.md`), so it never shows up in `KitchenPage`'s `PENDING`/`PREPARING` columns — only briefly in "Son Tamamlananlar". The frontend's only job is to reflect that in the total (`isStaffOrder ? formatMoney(0) : formatMoney(total)`) and reset the toggle in `resetOrderSession()` after a successful submit, so it doesn't silently stay on for the next order.

### Product size variants

A product's `variants` array (from `GET /products`, already sorted cheapest-first by the backend) drives a two-step selection on `OrderPage.jsx`: clicking a product with `variants.length > 0` opens a size-picker `Modal` instead of adding straight to the cart; picking a size adds `{ productId, variantId, name: "Product (Size)", price: variant.price }` as its own cart line. Products without variants are unaffected — same single-click add as always. Cart lines are keyed by `productId + variantId` together (`cartLineKey`, and the same pair threaded through `changeQuantity`/`removeFromCart`), not `productId` alone, so "Orta" and "Buyuk" of the same product never collapse into one line. `ProductsPage.jsx`'s `VariantsModal` is the admin-side counterpart — add/delete a size and edit its own recipe (independent of the product's own recipe) inline, mirroring the existing `RecipeModal` pattern but scoped to `/products/:id/variants/*` endpoints.

### Sharing the dev server through a tunnel

`vite.config.js` sets `server.allowedHosts: true`. Vite's dev server rejects requests whose `Host` header it doesn't recognize (DNS-rebinding protection); a tunnel (cloudflared/localtunnel) presents a `Host` Vite has never seen, so without this the page fails to load through the tunnel even though it works fine on `localhost`. Only affects `npm run dev` — irrelevant to `npm run build`/`preview`.

### Money formatting

`utils/format.js#formatMoney` is the only place currency gets formatted for display — always route through it rather than calling `.toFixed(2)` inline, so the format (currency symbol, decimal places) stays consistent if it ever changes.
