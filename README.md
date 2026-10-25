# Bivora

Client portal for Bivora: marketing website with live market data, client sign-up/login,
a funds dashboard (deposits, withdrawals, transactions, markets, trading account) and a
separate super admin console for reviewing fund requests. Trading itself happens on ARK trader.

Built with Next.js 16 (App Router, Cache Components), Tailwind CSS 4, Prisma 6 and SQLite.

## Getting started

```bash
npm install
cp .env.example .env          # then fill in SESSION_SECRET and the super admin credentials
npm run db:migrate            # creates prisma/dev.db
npm run db:seed               # creates the super admin from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000. Clients use `/login`; the super admin signs in at `/admin/login`.

## Routes

| Route | Who | What |
| --- | --- | --- |
| `/` | public | Landing page: hero terminal, sticky live-price ticker, the four markets |
| `/markets` | public | Descriptions of the four markets (stocks, indices, commodities, metals) |
| `/signup`, `/login` | public | Client registration and login |
| `/dashboard` | client | Balances, pending requests, recent activity |
| `/dashboard/markets` | client | Live charts and quotes |
| `/dashboard/deposit` | client | Submit / cancel deposit requests |
| `/dashboard/withdraw` | client | Submit / cancel withdrawal requests |
| `/dashboard/transactions` | client | Balance ledger and request history |
| `/dashboard/trading` | client | ARK account, positions, trade history (pending integration) |
| `/dashboard/profile` | client | Personal details, saved bank accounts, password |
| `/admin/login` | public | Super admin sign-in (separate from client login) |
| `/admin` | super admin | Totals and the review queue |
| `/admin/requests` | super admin | All requests, filter by status/type, approve/reject |
| `/admin/users` | super admin | Clients, balances, suspend/reactivate, manual adjustments |

## Brand

- Logo mark: a "B" whose stem is a candlestick, on the blue→green brand gradient
  (`src/lib/brand.ts`, rendered by `src/components/logo.tsx`).
- Files for print/social use: `public/brand/bivora-mark.svg`, `bivora-logo-dark.svg` (for dark
  backgrounds) and `bivora-logo-light.svg` (for light backgrounds).
- Favicon `src/app/icon.svg`, Apple touch icon `src/app/apple-icon.tsx`, share image
  `src/app/opengraph-image.tsx` (also used for Twitter/X).
- Set `NEXT_PUBLIC_SITE_URL` to the real domain in production so share previews use absolute URLs.

## Clients vs. super admin

The admin console is fully separate from the client app:

- Separate sign-in pages, cookies (`bivora_session` / `bivora_admin_session`) and JWT audiences,
  so a client token is rejected by the admin console and vice versa.
- Admin sessions last 8 hours (client sessions 7 days) and use `SameSite=Strict`.
- Super admin accounts cannot sign in through the client login.
- The console has its own light theme and shell (`src/components/admin-shell.tsx`).

## Markets and live prices

Bivora offers four markets: **stocks, indices, commodities and metals**. The instruments shown
everywhere come from `src/lib/markets.ts`; align them with the symbols actually offered on ARK.

All live prices use TradingView's free embeddable widgets (`src/components/markets/tradingview.tsx`):

- Hero terminal: live price and candles for gold, S&P 500, Nasdaq 100 and Brent.
- Ticker tape: below the hero on the website (pins under the header while scrolling) and pinned
  to the bottom of the client dashboard.
- Price lists: the homepage markets section, the login/signup panel and the dashboard overview.
- Dashboard → Markets: full chart with an instrument picker.

Use TradingView's CFD-style symbols (e.g. `TVC:USOIL`, `OANDA:XCUUSD`); exchange futures such as
`NYMEX:CL1!` are not available in the free widgets. Keep the "Market data by TradingView" attribution.

## Bank accounts

Clients save up to 5 bank accounts in their profile (bank, holder, account number, IBAN, SWIFT,
branch, country, currency) and pick one when withdrawing. The server builds the payout details from
the stored account, so a modified form cannot redirect a payout. Admins see a client's saved
accounts on the client page.

## How funds work

- A client submits a **deposit** or **withdrawal** request; it starts as `PENDING`.
- Withdrawals can only be requested up to the *available* balance (wallet balance minus pending withdrawals).
- A super admin **approves** or **rejects** it. Approval updates the wallet balance and writes a
  `LedgerEntry` in the same database transaction; a request can't be approved twice.
- Clients can cancel their own pending requests.
- Super admins can make manual balance adjustments with a reason; these are also written to the ledger.

Core logic lives in `src/lib/funds.ts`.

## ARK trader integration (pending)

Endpoint notes from the ARK Public Admin API docs are in [`docs/ark-api.md`](docs/ark-api.md).
All ARK calls go through `src/lib/ark/index.ts`. Every function there currently throws
`ArkNotConnectedError` and `isArkConnected()` returns `false`, so the UI shows a
"connection pending" state. To finish the integration:

1. Implement the functions in `src/lib/ark/index.ts` against the ARK API, using the `ARK_*` variables in `.env`.
2. Make `isArkConnected()` return `true`.
3. Create the ARK account on sign-up and save `arkAccountId` (`TODO(ark)` in `src/app/(auth)/actions.ts`).
4. Mirror manual adjustments to ARK (`TODO(ark)` in `src/lib/funds.ts`).

Approvals already call `applyBalanceOperation()` once ARK is connected. It runs inside the
approval transaction, so a failed ARK call rolls the approval back.

## Before going live

- Switch the Prisma datasource to PostgreSQL and set `DATABASE_URL`.
- Use a strong, unique `SESSION_SECRET` and change the super admin password.
- Replace the placeholder payment details in `PAYMENT_INSTRUCTIONS` (`src/lib/constants.ts`).
- Review the marketing copy, account tiers, leverage figures and risk warning with your compliance team.
- Consider moving `/admin` to a less guessable path or restricting it by IP.
