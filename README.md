# Tabedaar.com

Your personal shopper in Pakistan. Tabedaar sources anything from fashion, food, gifts to groceries in Lahore and delivers it to your loved ones anywhere in the world.

**Live site:** https://tabedaar.com
**Support & replies:** contact@tabedaar.com
**Office:** IP Building, Gulberg, Lahore, Pakistan
**Hours:** 9:00 AM – 6:00 PM PKT

## Who uses the app

| Role | What they do |
| --- | --- |
| Customer | Place orders item by item, upload payment proof, pay any remaining balance, track delivery |
| Manager | Review requested items, verify payments, record shopping expenses with receipts, assign riders |
| Rider | Collect items with photo proof, capture the delivery payment screenshot, confirm delivery |
| Admin | Manage staff accounts and roles, bank details, reporting exports, and the WhatsApp inbox |

## Order lifecycle

Placed → Approved → Confirmed → Picked Up → Delivered

Money is settled before a rider can deliver: if the actual shopping expense is higher than the
verified amount received, the customer pays the remaining balance; if it is lower, the manager
refunds the difference with proof first. Every amount change is written to an audit trail.

Customers receive email (from contact@tabedaar.com), WhatsApp, in-app and push notifications at
each stage.

## Stack

- React 18, TypeScript, Vite
- Tailwind CSS with shadcn/ui components
- Managed Postgres backend: database with row-level security, auth, file storage, edge functions
- Capacitor for the Android and iPhone apps

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build into `dist/` |
| `npm run build:dev` | Development-mode build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the source |
| `npm run test:attachments` | Storage-path tests |
| `npm run capacitor:sync:before` | Regenerate native photo-permission settings before a Capacitor sync |

## Native apps

The Android and iPhone shells live in `android/` and `ios/`.

```bash
npm run build
npx cap sync android   # or: npx cap sync ios
npx cap open android   # Android Studio
npx cap open ios       # Xcode (macOS only)
```

## Deploying

- **Web:** run `npm run build` and upload the contents of `dist/` to the cPanel host. `.htaccess`
  handles single-page routing. The GoDaddy A records point at the hosting IPs.
- **Android:** build a signed AAB and upload it through Google Play Console.
- **iPhone:** archive in Xcode and upload through App Store Connect.
