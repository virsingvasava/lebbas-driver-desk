# Lebas Driver Desk (mobile web, one page)

Next.js (App Router) + React + Tailwind. Shows the driver's pickups on a real road map (Leaflet + OpenStreetMap,
road line from OSRM), with Call / WhatsApp / Navigate, **Picked up**, **Reject** (with reason) and **Save time**.

## Run locally
```
npm install
copy .env.example .env.local     (then edit it)
npm run dev
```
Open the link that Laravel prints:  `php artisan driver:desk-link 1`  (it looks like `https://desk.lebbas.com/?d=1&t=...`;
for local testing replace the host with `http://localhost:3000`).

## Deploy (Vercel)
1. Push this folder to GitHub, import it in Vercel.
2. Add the environment variables from `.env.example`
   (`LARAVEL_API_BASE`, `LARAVEL_API_TOKEN`, `DESK_SECRET`, optional `NEXT_PUBLIC_OSRM_URL`).
3. In Laravel `.env`:  `DRIVER_DESK_URL=https://<your-vercel-domain>`  and  `DRIVER_DESK_SECRET=<same as DESK_SECRET>`.

## How security works
The link `?d=<driverId>&t=<token>` carries a signed token (HMAC of the driver id). The browser never sees the Laravel
API token: it only talks to `/api/route` and `/api/action` on this site, which check the token and call Laravel.
To revoke every link, change `DESK_SECRET` (Vercel) and `DRIVER_DESK_SECRET` (Laravel).
