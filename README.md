# Visitor Management System

A Modern PWA for Visitor Management.

## Features
- **Admin Dashboard**: Book visitors, edit data, view logs.
- **Reception Kiosk**: Touch-friendly check-in/out for visitors. (SV/EN)
- **Deployment**: Deploys to GitHub Pages via Actions.
- **Supabase Storage**: Visitor data is read and written through the `booker-api` Edge Function. Browser local storage is only used for device-local settings such as PIN/session state.
- **Notification Prep**: Stores host email addresses and tracks whether a host notification was sent, skipped, failed, or is not configured yet.

## Development
- `npm install`
- `npm run dev`
- `npm run build`

## Admin Access
- Set `VITE_ADMIN_PIN` in a local env file, or create a browser-local PIN on the first `/admin` visit.

## Host Notifications
- The frontend is prepared for a Supabase Edge Function named `notify-host`.
- Save `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your env file when that backend exists.
- If you prefer a custom endpoint, set `VITE_NOTIFICATION_ENDPOINT` instead.
- Until the backend is configured, the kiosk will register the visitor arrival without claiming that an email was actually sent.

## Supabase API
- `supabase/functions/booker-api/index.ts` is the first controlled Edge Function for database access.
- Set `BOOKER_ADMIN_PIN` as an Edge Function secret in Supabase.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the frontend env to test the API from `/admin`.
- Do not use the backend `BOOKER_ADMIN_PIN` as a deployed `VITE_` variable. The admin test panel asks for it at runtime.
- After a successful admin test, the backend PIN is saved locally in that browser so admin/reception can call the Edge Function without baking the PIN into the bundle.
- A new reception tablet will ask for the backend PIN once on first launch.
- If using an `sb_publishable_...` key, turn off JWT verification for the `booker-api` Edge Function. Access is controlled inside the function with `BOOKER_ADMIN_PIN`.
- Current actions: `health`, `snapshot`, `createOrUpdateHost`, `deleteHost`, `createOrUpdateSavedVisitor`, `deleteSavedVisitor`, `createVisit`, `registerWalkIn`, `updateVisit`, `checkInVisit`, `checkOutVisit`.
