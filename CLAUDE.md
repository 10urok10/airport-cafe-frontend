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

`OrderPage.jsx#addToCart` opens a simple size-picker `Modal` when a product has `variants.length > 0` (single-select, one click adds the line); a product without variants adds straight to the cart on click. Cart lines are keyed by `productId + variantId` (`cartLineKey`, threaded through `addLineToCart`/`changeQuantity`/`removeFromCart`), not `productId` alone — otherwise a "Orta" and a "Buyuk" of the same product would collapse into one line. `POST /orders` items carry `variantId` alongside `productId`/`quantity`.

`ProductsPage.jsx` has an admin `VariantsModal` (`/products/:id/variants/*`) mirroring the existing `RecipeModal` pattern (list + inline add-form, list items expand to their own recipe editor). Because a variant-having product's own price/recipe is never reached once it has variants, `ProductsPage.jsx`'s table hides the "Recete" button and shows "Boylara gore degisir"/"Boylar uzerinden yonetiliyor" in the Fiyat/Recete columns for such rows instead of stale-looking numbers — same reasoning extends to `ReportsPage.jsx`'s margin table, which the backend already expands into one row per variant (see backend `CLAUDE.md`); the row `key` there is `productId+variantId`, not `productId` alone, since several rows can now share a `productId`.

### Extras ("Ekstralar") are just Products, not a separate mechanism

An earlier iteration modeled extras (Ekstra Shot, Yulaf Sutu, etc.) as a dedicated Modifier system with its own multi-select picker UI and admin modal — that was fully removed (see backend `CLAUDE.md`). Extras are now ordinary `Product` rows with `category: "Ekstralar"`, so no frontend code treats them specially: the "Ekstralar" category tab on `OrderPage.jsx` appears automatically from the existing `categories` derivation (`[...new Set(products.map(p => p.category))]`), and clicking an extra adds it to the cart exactly like any other variant-less product — as its own separate cart line, stacking alongside whatever drink is also in the cart.

### Product-extra catalog links: offering an extra right after its product

A `Product` can have specific extras linked to it via `product.extraOptions` (backend `ProductExtra` catalog rows, see backend `CLAUDE.md`) — e.g. Americano linked to Ekstra Shot. `ProductsPage.jsx#ExtrasModal` (`/products/:id/extras`, ADMIN-only) manages these links: a checklist-style linker showing already-linked extras (with a "Kaldir" button — unlinking never fails, since this catalog pairing carries no order history) and a `<select>` of not-yet-linked "Ekstralar"-category products to add.

On the order screen, `OrderPage.jsx#finishAddingBaseLine` runs after a base line is resolved (immediately for a variant-less product, or after a size is picked for one with variants) and, if `product.extraOptions.length > 0`, opens a picker modal offering just that product's linked extras — clicking one adds it to the cart via `addExtraToCart`. This is the concrete implementation of "select Americano, then be offered Ekstra Shot for it."

Cart lines need a third key dimension for this to work correctly: `cartLineKey(productId, variantId, linkedToKey)`, not just `productId+variantId`. Without `linkedToKey`, adding "Ekstra Shot" once from the Ekstralar tab (unlinked) and once via Americano's picker (linked) would collide into a single cart line and silently merge their quantities — since both have the same `productId` and no `variantId`. `linkedToKey` is simply the cart key of the base line the extra was added *for* (e.g. `"12-5-none"` for an Americano-Orta line), so the same extra product linked to two different base lines (or added unlinked) always gets its own line. Linked lines carry `linkedToName` (e.g. `"Airport Americano (Orta)"`) purely for display — the cart renders them indented with a `↳` prefix and a "· {linkedToName} icin" caption, and `handleSubmitOrder`'s payload still only sends `{ productId, variantId, quantity }` per line, exactly as before — `linkedToKey`/`linkedToName` are UI-only, the backend has no concept of a "linked" `OrderItem` and never needs one.

### Sharing the dev server through a tunnel

`vite.config.js` sets `server.allowedHosts: true`. Vite's dev server rejects requests whose `Host` header it doesn't recognize (DNS-rebinding protection); a tunnel (cloudflared/localtunnel) presents a `Host` Vite has never seen, so without this the page fails to load through the tunnel even though it works fine on `localhost`. Only affects `npm run dev` — irrelevant to `npm run build`/`preview`.

### Money formatting

`utils/format.js#formatMoney` is the only place currency gets formatted for display — always route through it rather than calling `.toFixed(2)` inline, so the format (currency symbol, decimal places) stays consistent if it ever changes.
