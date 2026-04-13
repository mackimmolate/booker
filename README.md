# Visitor Management System

A Modern PWA for Visitor Management.

## Features
- **Admin Dashboard**: Book visitors, edit data, view logs.
- **Reception Kiosk**: Touch-friendly check-in/out for visitors. (SV/EN)
- **Deployment**: Deploys to GitHub Pages via Actions.
- **Current Prototype Storage**: Uses browser local storage until Supabase is added.
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
