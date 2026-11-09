# ARK trader API — integration notes

Source: https://documenter.getpostman.com/view/12326988/2sBXwsMVbN ("ARK Public Admin APIs").
Use **v2** endpoints (v1 is legacy). All paths are relative to the broker-provided
gateway base URL, e.g. `https://<broker>.arktrader.io/api/apigateway`.

## Authentication

`POST /login/public/api/v2/login` with a **dealer** account:

```json
{ "companyName": "<exact company name from broker>", "userName": "...", "password": "..." }
```

Save `data.token`; send it as `Authorization: Bearer <token>` on every other request.

Sessions (`src/lib/ark/client.ts`): Bivora logs in once and reuses the token from every server
instance; it is stored encrypted in `ArkSettings`. ARK ends a session 60 minutes after its last
request, so Vercel Cron calls `GET /admin/public/api/v2/heartbeat` every 10 minutes through
`/api/cron/ark-heartbeat` (needs `CRON_SECRET`). The heartbeat never logs in: if the session has
ended, the next real request logs in again, once. Saving new ARK settings drops the session.
Dealer-policy permissions decide which actions the token may perform.
Responses share the envelope `{ data, message, httpStatus, errorCode, success }`.

## Endpoints Bivora needs

| Bivora function (`src/lib/ark/index.ts`) | ARK endpoint |
| --- | --- |
| `provisionArkAccount` (`client.ts`) | Username = first name + 4 random digits (e.g. `Fadhil3546`), checked free with `GET /admin/public/api/v2/username/{name}` (404 = free) and kept on the client before `POST /admin/public/api/v2/user` — Create Client, then the same lookup for its IDs. A retried approval reuses its kept name only if that ARK account carries the client's `customData.bivoraUserId` (or email). |
| `postArkMoney` (`client.ts`), used by `src/lib/ark-money.ts` | `POST /admin/public/api/v2/money/transaction` with `userId`, `trxType` (1 deposit · 2 withdrawal · 3 credit in · 4 credit out · 5 adjustment · 6 bonus), `trxAmount`, `trxComment` ("Bivora …"), `trxDate`, and the `ArkMoneyTransaction` id as `requestReference`. ARK answers "Request reference already used" to a repeat, which a retry treats as done. |
| `resetArkPassword` (`client.ts`) | `PUT /admin/public/api/v2/user/{userId}` with `{ "password": "…", "forceChangePassword": true }` |
| `getAccountSummary` | `GET /trading/public/api/v2/userFinancials/{userId}` — Financial Standing |
| `getOpenPositions` | `GET /trading/public/api/v2/report/open/positions/{userId}/0?fromDate&toDate&limit&offset` (0 = buy+sell) |
| `getTradeHistory` | `GET /admin/public/api/v2/report/closed/positions/{userId}?fromDate&toDate&limit&offset` |
| `applyBalanceOperation` | `POST /admin/public/api/v2/money/transaction` |
| (lookup) | `GET /admin/public/api/v2/user/{userId}`, `GET /admin/public/api/v2/account/{accountId}` |

### Admin → ARK accounts (`src/lib/ark/reports.ts`)

| What | ARK endpoint |
| --- | --- |
| Top node | `GET /admin/public/api/v2/username/{dealerUsername}`, then `GET /admin/public/api/v2/user/{parentId}` up the tree until ARK refuses |
| Client accounts | `GET /admin/public/api/v2/report/users/details/{nodeId}?fromDate&toDate&withDemo=true&userTypeId=1`, `limit=500`, pages merged by user ID |
| Settings: office dropdown | The same report with `userTypeId=2`, from the top node |
| Settings: generic policies | `GET /admin/public/api/v2/client/generic/policy/1` → `[{ id, policyName }]` |
| Settings: script policies | `GET /admin/public/api/v2/client/currency/policy/1` → `[{ id, policyName, policyTypeId, parentId }]`; `policyTypeId` 2 is a group, listed only as a heading |

`userTypeId`: 1 Client · 2 Office · 3 Dealer · 4 Department. The docs have no response examples for
these, so an account's details show its fields exactly as ARK returns them.

### Money transaction

```json
{
  "userId": 31110,
  "trxType": 1,
  "trxAmount": 100,
  "trxComment": "Bivora deposit <requestId>",
  "message": "Bivora deposit <requestId>",
  "trxDate": "2026-10-24 06:00:00.000",
  "requestReference": "<Bivora FundRequest id — idempotency reference>"
}
```

`trxType`: 1 Deposit · 2 Withdraw · 3 Credit In · 4 Credit Out · 5 Adjustment · 6 Bonus.

## Notes

- Date filters use `yyyy-MM-dd HH:mm:ss`.
- ARK also has its own deposit/withdrawal request workflow (`/admin/public/api/v2/depositRequest`,
  `/trading/public/api/v2/cashRequest`). Bivora keeps requests and approvals in its own database and
  only posts the final money transaction to ARK on approval.
- These details are entered at `/admin/settings`, not in environment variables.
- To confirm with the broker: company name, dealer credentials, the `parentId` (office) for new
  clients, the policy IDs (`genericPolicyID`, `currenciesPolicyID`) to assign (`userCurrencyId` is always 1, `ignoreLiquidation` is always false), the
  trading platform's login URL, and any password rules.
- The docs show no response example for Create Client or Get User By Username. `client.ts` reads
  `userID` and `accountID`, the names used in ARK's report responses. Check this against a test account
  before going live.
