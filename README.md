# Bivora

Client portal for Bivora: marketing website with live market data, client sign-up/login,
a funds dashboard (deposits, withdrawals, transactions, markets, trading account) and a
separate super admin console for reviewing fund requests. Trading itself happens on ARK trader.

Built with Next.js 16 (App Router, Cache Components), Tailwind CSS 4, Prisma 6 and PostgreSQL.

## Getting started

```bash
npm install
cp .env.example .env          # then fill in SESSION_SECRET and the database URLs
npx prisma migrate deploy     # applies migrations to the database in DATABASE_URL
npm run admin:create          # asks for an email and password, then creates the super admin in the database
npm run dev
```

Open http://localhost:3000. Clients use `/login`; the super admin signs in at `/admin/login`.

## Routes

| Route | Who | What |
| --- | --- | --- |
| `/` | public | Landing page: hero terminal, sticky live-price ticker, the four markets |
| `/markets` | public | Descriptions of the four markets (stocks, indices, commodities, metals) |
| `/signup`, `/login` | public | Client registration and login |
| `/onboarding` | new client | Upload passport, Emirates ID and proof of address, then accept the terms |
| `/terms` | public | Terms & Conditions |
| `/about`, `/contact` | public | About us; contact form that saves to Admin → Messages |
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

- Logo: `public/brand/bivora-logo.svg` (square, transparent background), used everywhere
  through `src/components/logo.tsx`. Earlier logos and the original black version are kept in
  `old-logos/`, which the website does not serve.
- Site colours come from the logo: teal-green, cyan and gold on near-black (`src/app/globals.css`).
  Red is the one exception, kept for price falls and errors.
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

## Identity verification

Onboarding is mandatory for every client account and can't be skipped: a non-closable modal over a blurred
background, repeated after a rejection. Super admins review documents from the client page.

- Four steps, one per screen: passport, Emirates ID, proof of address, terms.
- Passport: front and back. Emirates ID: front and back. Proof of address: one page. A PDF under
  Front counts as both sides. Each can also be captured with the camera.
- The whole dashboard stays locked until a super admin approves the documents. Clients wait on a review
  screen, and fund requests can't be approved for an unverified client.
- Approving creates the client's ARK account and emails their trading login (`src/lib/client-approval.ts`).
  The password is never stored, so "Resend login details" sets a new one. Approval is refused until the
  `ARK_*` and email settings are in place.

Emails go through Resend (`src/lib/email.ts`): welcome, password reset and trading login details. Set
`RESEND_API_KEY` and `EMAIL_FROM`. Without them nothing sends, and forgot password says it's unavailable.

Google login needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, from an OAuth client in Google Cloud with
`<site>/auth/google/callback` as a redirect URI. The button stays hidden without them. Google is for signing in only: new accounts open through signup, which requires a phone number.
- JPG, PNG, WebP or PDF up to 10 MB, checked from the file's contents.
- Files are stored outside `public/` (`KYC_STORAGE_DIR`, default `storage/kyc`, ignored by git) and served
  only through `/api/kyc/[id]` to the owner or a super admin.

Identity documents need durable, encrypted storage in production. A server's local disk is not enough, and
on serverless hosts it isn't kept at all; swap `src/lib/kyc-storage.ts` for private object storage.

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

- Use a strong, unique `SESSION_SECRET`.
- Replace the placeholder payment details in `PAYMENT_INSTRUCTIONS` (`src/lib/constants.ts`).
- Connect an email service if contact messages should also arrive at support@bivoramarkets.com.
- Have the draft terms in `src/lib/terms.ts` reviewed by a lawyer.
- Move identity documents to private, encrypted storage (see above).
- Review the marketing copy, account tiers, leverage figures and risk warning with your compliance team.
- Consider moving `/admin` to a less guessable path or restricting it by IP.
