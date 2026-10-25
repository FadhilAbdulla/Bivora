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
Dealer-policy permissions decide which actions the token may perform.
Responses share the envelope `{ data, message, httpStatus, errorCode, success }`.

## Endpoints Bivora needs

| Bivora function (`src/lib/ark/index.ts`) | ARK endpoint |
| --- | --- |
| `createTradingAccount` | `POST /admin/public/api/v2/user` — Create Client (needs `parentId`, policy IDs, `isDemo`, `email`, `password`, …) |
| `getAccountSummary` | `GET /trading/public/api/v2/userFinancials/{userId}` — Financial Standing |
| `getOpenPositions` | `GET /trading/public/api/v2/report/open/positions/{userId}/0?fromDate&toDate&limit&offset` (0 = buy+sell) |
| `getTradeHistory` | `GET /admin/public/api/v2/report/closed/positions/{userId}?fromDate&toDate&limit&offset` |
| `applyBalanceOperation` | `POST /admin/public/api/v2/money/transaction` |
| (lookup) | `GET /admin/public/api/v2/user/{userId}`, `GET /admin/public/api/v2/account/{accountId}` |

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
- To confirm with the broker: company name, dealer credentials, the `parentId` (office) for new
  clients, and the policy IDs (`genericPolicyID`, `currenciesPolicyID`, …) to assign.
