# Quantum Gear: Additional Version (React + Node.js)

The modern-enhancement version of Quantum Gear for IE4727 (the "Additional Version", 15%).
It is the same shop, rebuilt as a **single-page React app** with **Tailwind CSS**, talking to a **Node.js + Express** API.
It uses the **same MySQL database** as the Base Version (`IE4727 Project`), so products, accounts and orders are shared:
an order placed here shows up in the PHP admin page, and the other way round.

## Run it

1. In XAMPP, start **MySQL** (Apache isn't needed for this version). Import `database/schema.sql` in phpMyAdmin if you haven't already for the Base Version.
2. Install [Node.js](https://nodejs.org/) 20 or newer.
3. In this folder:
   ```
   npm run setup     # first time only: installs everything
   npm run dev       # API on :4000 + React on http://localhost:5173 (changes reload instantly)
   ```
   Or `npm start` to build the React app and serve everything from **http://localhost:4000**.
4. Sign in with any account from the Base Version, or create one. Admins (role `admin` in the `users` table) get the dashboard.

Settings (database login, ports, mailbox) are in `server/src/config.js` and can be overridden with environment variables.
The install button and offline mode only work with `npm start` (port 4000): the service worker is switched off in `npm run dev` so it never serves stale files while you code.
Order emails go to the local Mercury mailbox `newuser@localhost` when Mercury is running; every email is also saved in `email_log`.

## Summary of modern enhancements, with justification

| Enhancement | What we used it for | Why it improves the project |
|---|---|---|
| **React 19** single-page app with **React Router** | Every page is a component; moving between pages swaps the content without reloading. Shared state (cart, sign-in, wishlist, compare) lives in React Context. | Pages change instantly and keep state (the cart drawer, filters, the PC Builder) instead of reloading from the server each time. Components such as `ProductCard` are written once and reused on every page. |
| **Tailwind CSS 4** | All styling, including dark mode (`dark:` variants) and responsive layouts (`sm:`, `lg:`). | Styles sit next to the markup they affect, so the design stays consistent and there is no unused CSS. Dark mode and phone layouts come from the same classes. |
| **Node.js + Express 5** REST API | Replaces the PHP endpoints: catalogue, sign-in, checkout, wishlist, admin (`server/src/routes`). | One language (JavaScript) on both sides. The API returns JSON that any front end can use, and async/await keeps the database code short and readable. |
| **Recharts** | Interactive revenue-per-day and revenue-by-category charts on the admin dashboard. | Admins can point at any day to read exact numbers, and switch between 7, 30 and 90 days without a reload. |
| **Vite** | Development server and production build. | Instant reload while coding, and a small optimised build. Each page is split into its own file and only loaded when first opened, so the first visit downloads less. |
| **nodemailer** | Order confirmation and status emails. | A maintained mail library instead of PHP's `mail()`, with the same "local mailbox only" rule and an email log. |
| **Server-Sent Events** (`/api/events`) | Live stock numbers on every open page, and a "new order" alert that refreshes the admin dashboard. | Shoppers never see a stale "5 left" after someone else buys, and admins see orders arrive without pressing refresh. SSE is one-way and built into browsers, so it needs no extra library and reconnects by itself. |
| **Progressive Web App** (manifest + service worker) | The site can be installed like an app, and the catalogue can be browsed offline. | Works on a poor connection: the app files, photos and last product list come from the cache, while sign-in, checkout and admin always use the live server. |

## New features compared with the Base Version

- **Slide-out cart drawer**, available on every page, with instant quantity changes.
- **Wishlist** saved to the customer's account (new `wishlist` table, created automatically).
- **Compare** up to 4 products side by side, with the best price, rating and stock highlighted.
- **Recently viewed** row on the home page.
- **Quick search**: press **Ctrl+K** (or `/`) anywhere, then use ↑ ↓ and Enter.
- **Live PC Builder**: every compatibility check, the power gauge and the total update the moment a part is chosen.
- **Shop filters in the URL**: every filtered view has its own link, and Back undoes a filter.
- **Admin dashboard** with KPIs, interactive charts, an orders table with status changes, and a quick-edit inventory table.
- **Loading placeholders** and **toast notifications** for feedback, plus dark mode and a full mobile layout.
- **Coupon codes at checkout** (new `coupons` table): percent or fixed amount, minimum spend and expiry, checked again on the server. Try `WELCOME5`, `QUANTUM10` (over $100) or `SAVE50` (over $500).
- **Frequently bought together** on product pages, worked out from real orders. When a product has too few orders, it shows **compatible parts** instead (same CPU socket, memory type, enough PSU power). Tick the items and add them all in one click.
- **My Account** page: orders, total spent and saved, favourite category, and a change-password form (needs the current password).
- **Printable invoices** for every order, with coupon and GST lines. Printing hides the site header and footer for a clean A4 page or PDF.
- **Admin CSV export** of all orders (opens in Excel; protected against spreadsheet formula injection).
- **Live updates** and **install / offline mode** (see the table above).

## Security

- Passwords: bcrypt (`bcryptjs`), compatible with the PHP version's `password_hash()`.
- Every query uses placeholders (no SQL built from user input).
- Sessions: `httpOnly`, `SameSite=Strict` cookie, a new session id on sign-in, 30-minute idle timeout.
- CSRF: the strict cookie is never sent from other sites, and the API only accepts JSON for changes.
- Admin routes re-check the role in the database on every request.
- 5 wrong passwords lock an account for 5 minutes (shared with the PHP version).
- Checkout runs in a transaction with locked stock rows, and checks every price and quantity on the server.
- Coupons are looked up and applied on the server, so the discount shown in the browser cannot be changed.
- The service worker never caches signed-in data (orders, account, admin); only the public catalogue.
- Invoices only open for the signed-in customer's own orders.

## Project structure

```
server/                 Node.js + Express API
  src/index.js          app setup, sessions, error handling, serves the built React app
  src/config.js         settings
  src/db.js             MySQL pool, transactions, the wishlist and coupons tables
  src/events.js         live updates (Server-Sent Events)
  src/auth.js           requireUser / requireAdmin
  src/mailer.js         order emails (nodemailer)
  src/routes/           catalog, account, orders, wishlist, admin
client/                 React + Vite + Tailwind
  src/main.jsx          routes and providers
  src/context/          Auth, Catalog, Cart, Lists (wishlist / compare / recent), Toast
  src/components/       Layout, ProductCard, ProductRow, CartDrawer, CommandPalette ...
  src/pages/            Home, Shop, Deals, ProductPage, Cart, Login, Orders, Invoice, Account, Wishlist, Compare, Builder, Admin
  public/Images/        product photos (copied from the Base Version)
  public/sw.js          service worker (offline browsing)
  public/manifest.webmanifest   app name and icons for installing
database/schema.sql     the shared database (same file as the Base Version)
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products`, `/api/categories` | Catalogue |
| GET | `/api/products/:id` | Product page: details, reviews, related, can I review? |
| POST | `/api/products/:id/reviews` | Write or update a review (buyers only) |
| GET / POST | `/api/auth/me`, `/register`, `/login`, `/logout` | Accounts |
| GET / POST | `/api/auth/profile`, `/api/auth/password` | My Account stats, change password |
| GET | `/api/orders/coupon/:code` | Check a coupon code |
| GET | `/api/events` | Live updates stream (stock; new orders for admins) |
| POST | `/api/orders` | Checkout |
| GET | `/api/orders/mine` | My orders |
| GET / PUT / DELETE | `/api/wishlist`, `/api/wishlist/:productId` | Wishlist |
| GET | `/api/admin/stats?days=30` | Dashboard numbers and chart data |
| GET / PATCH | `/api/admin/orders`, `/api/admin/orders/:id` | Orders and status |
| GET | `/api/admin/orders.csv` | Download all orders as CSV |
| GET / PATCH | `/api/admin/products`, `/api/admin/products/:id` | Inventory quick edit |
