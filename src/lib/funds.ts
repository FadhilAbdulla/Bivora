import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ArkError, loadArkConfig, postArkMoney } from "./ark/client";
import { isKycApproved } from "./kyc";

export class FundError extends Error {}

export type FundRequestType = "DEPOSIT" | "WITHDRAWAL";

type Client = Prisma.TransactionClient | typeof db;

/**
 * Locks the client's row until the transaction ends. Every balance check and change goes through
 * this, so two requests at the same moment run one after the other instead of both passing a check.
 */
async function lockClient(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
}

export async function getAvailableBalance(userId: string, client: Client = db) {
  const [user, pending] = await Promise.all([
    client.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } }),
    client.fundRequest.aggregate({
      where: { userId, type: "WITHDRAWAL", status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);
  const pendingWithdrawals = pending._sum.amount ?? new Prisma.Decimal(0);
  return {
    balance: user.balance,
    pendingWithdrawals,
    available: user.balance.minus(pendingWithdrawals),
  };
}

export async function createFundRequest(input: {
  userId: string;
  type: FundRequestType;
  amount: number;
  method: string;
  reference?: string;
  payoutDetails?: string;
  tradingAccount?: string;
  userNote?: string;
}) {
  const amount = new Prisma.Decimal(input.amount);

  return db.$transaction(async (tx) => {
    if (input.type === "WITHDRAWAL") {
      await lockClient(tx, input.userId);
      // One withdrawal at a time: a new one waits until the open one is approved, rejected or cancelled.
      const open = await tx.fundRequest.count({ where: { userId: input.userId, type: "WITHDRAWAL", status: "PENDING" } });
      if (open > 0) {
        throw new FundError("You already have a withdrawal waiting for review. You can request another once it is approved, rejected or cancelled.");
      }
    }
    return tx.fundRequest.create({
      data: {
        userId: input.userId,
        type: input.type,
        amount,
        method: input.method,
        reference: input.reference || null,
        payoutDetails: input.payoutDetails || null,
        tradingAccount: input.tradingAccount || null,
        userNote: input.userNote || null,
      },
    });
  });
}

export async function cancelFundRequest(userId: string, requestId: string) {
  const { count } = await db.fundRequest.updateMany({
    where: { id: requestId, userId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  if (count === 0) throw new FundError("This request can no longer be cancelled.");
}

const REFERENCE_USED = /reference already used/i;

/**
 * Approves a deposit or withdrawal and posts it to the client's ARK trading account: a deposit
 * (trxType 1) or a withdrawal (trxType 2), with the FundRequest ID as ARK's requestReference.
 *
 * ARK is called inside the transaction, after the request row is claimed, so a client can't cancel
 * it meanwhile and a refusal from ARK rolls the approval back. ARK refuses a reference it has seen,
 * so approving again after a timeout or a lost commit can never post twice: "reference already
 * used" means the first attempt went through.
 */
export async function approveFundRequest(
  requestId: string,
  adminId: string,
  adminNote?: string,
) {
  let config;
  try {
    config = await loadArkConfig();
  } catch (e) {
    if (e instanceof ArkError) throw new FundError(e.message);
    throw e;
  }

  await db.$transaction(
    async (tx) => {
      const owner = await tx.fundRequest.findUnique({ where: { id: requestId }, select: { userId: true } });
      if (!owner) throw new FundError("This request has already been reviewed.");
      await lockClient(tx, owner.userId);
      const request = await tx.fundRequest.findUnique({
        where: { id: requestId },
        include: { user: { select: { kycStatus: true, arkUserId: true } } },
      });
      if (!request || request.status !== "PENDING") {
        throw new FundError("This request has already been reviewed.");
      }
      if (!isKycApproved(request.user.kycStatus)) {
        throw new FundError("Approve this client's documents first.");
      }
      if (!request.user.arkUserId) {
        throw new FundError("This client has no ARK trading account yet, so the money can't be posted.");
      }

      const isDeposit = request.type === "DEPOSIT";
      const delta = isDeposit ? request.amount : request.amount.negated();

      // Claimed first: the row stays locked until ARK answers, so a cancel or a second approval waits.
      const { count } = await tx.fundRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: {
          status: "APPROVED",
          reviewedById: adminId,
          reviewedAt: new Date(),
          adminNote: adminNote || null,
        },
      });
      if (count === 0) throw new FundError("This request has already been reviewed.");

      const user = await tx.user.update({
        where: { id: request.userId },
        data: { balance: { increment: delta } },
      });

      await tx.ledgerEntry.create({
        data: {
          userId: request.userId,
          amount: delta,
          balanceAfter: user.balance,
          description: isDeposit ? "Deposit approved" : "Withdrawal approved",
          fundRequestId: request.id,
        },
      });

      let arkTrxId: string | null = null;
      try {
        arkTrxId = await postArkMoney(config, {
          arkUserId: request.user.arkUserId,
          type: isDeposit ? 1 : 2,
          amount: request.amount.toNumber(),
          // Starts with "Bivora" so Money flow tags it as made in Bivora.
          comment: `Bivora ${isDeposit ? "deposit" : "withdrawal"} ${request.id}`,
          reference: request.id,
        });
      } catch (e) {
        if (!(e instanceof ArkError)) throw e;
        // A repeat of an approval ARK already has: it went through the first time.
        if (!REFERENCE_USED.test(e.message)) {
          throw new FundError(
            /could not reach ark/i.test(e.message)
              ? "ARK didn't answer, so the request is still pending. Approve it again: it can never post twice."
              : `ARK refused this ${isDeposit ? "deposit" : "withdrawal"}: ${e.message.replace(/^ARK refused the transaction: /, "")}`,
          );
        }
      }
      if (arkTrxId) await tx.fundRequest.update({ where: { id: requestId }, data: { arkTrxId } });
    },
    // ARK can take a while (a sign-in plus the post), and the default 5 s would cut it off.
    { maxWait: 10_000, timeout: 60_000 },
  );
}

export async function rejectFundRequest(
  requestId: string,
  adminId: string,
  adminNote?: string,
) {
  const { count } = await db.fundRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: {
      status: "REJECTED",
      reviewedById: adminId,
      reviewedAt: new Date(),
      adminNote: adminNote || null,
    },
  });
  if (count === 0) throw new FundError("This request has already been reviewed.");
}

// Manual correction by a super admin, recorded in the ledger with the reason.
export async function adjustBalance(input: {
  userId: string;
  adminId: string;
  amount: number;
  reason: string;
}) {
  const delta = new Prisma.Decimal(input.amount);
  await db.$transaction(async (tx) => {
    await lockClient(tx, input.userId);
    const current = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
    if (current.balance.plus(delta).isNegative()) {
      throw new FundError("Adjustment would make the balance negative.");
    }
    const user = await tx.user.update({
      where: { id: input.userId },
      data: { balance: { increment: delta } },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: input.userId,
        amount: delta,
        balanceAfter: user.balance,
        description: `Adjustment: ${input.reason}`,
      },
    });
    // TODO(ark): mirror the adjustment on the ARK trading account.
  });
}
