import type { NextRequest } from "next/server";
import { fetchArkFinancials } from "@/lib/ark/account";
import { getCurrentUser } from "@/lib/auth";
import { canEditKyc } from "@/lib/kyc";
import { tradingAccountsOf } from "@/lib/trading-accounts";

// ARK's financial standing for one of the signed-in client's trading accounts. Pages render
// everything else from Bivora's own data and call this from the browser, so they never wait for ARK.

const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Please log in again." }, 401);
  if (canEditKyc(user.kycStatus)) return reply({ error: "Finish your documents first." }, 403);

  const wanted = request.nextUrl.searchParams.get("account");
  // Only the client's own accounts, never an ARK ID they typed.
  const account = tradingAccountsOf(user).find((a) => a.arkUserId === wanted);
  if (!account) return reply({ error: "Trading account not found." }, 404);

  const result = await fetchArkFinancials(account.arkUserId);
  if ("error" in result) {
    console.warn("ARK financial standing failed", result.error);
    return reply({ error: "Your trading account figures can't be loaded right now. Please try again in a few minutes." }, 502);
  }
  return reply({ summary: result.summary, at: new Date().toISOString() });
}
