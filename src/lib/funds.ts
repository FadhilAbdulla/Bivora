import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { applyBalanceOperation, isArkConnected } from "./ark";
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
      const { available } = await getAvailableBalance(input.userId, tx);
      if (available.lessThan(amount)) {
        throw new FundError("Amount exceeds your available balance.");
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

export async function approveFundRequest(
  requestId: string,
  adminId: string,
  adminNote?: string,
) {
  await db.$transaction(async (tx) => {
    const owner = await tx.fundRequest.findUnique({ where: { id: requestId }, select: { userId: true } });
    if (!owner) throw new FundError("This request has already been reviewed.");
    await lockClient(tx, owner.userId);
    const request = await tx.fundRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });
    if (!request || request.status !== "PENDING") {
      throw new FundError("This request has already been reviewed.");
    }
    if (!isKycApproved(request.user.kycStatus)) {
      throw new FundError("Approve this client's documents first.");
    }

    const isDeposit = request.type === "DEPOSIT";
    const delta = isDeposit ? request.amount : request.amount.negated();

    if (!isDeposit && request.user.balance.lessThan(request.amount)) {
      throw new FundError("User balance is too low to approve this withdrawal.");
    }

    // Guard against a concurrent review of the same request.
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

    // Runs last so a failed ARK call rolls the whole approval back.
    if (isArkConnected() && request.user.arkAccountId) {
      await applyBalanceOperation({
        accountId: request.user.arkAccountId,
        amount: delta.toNumber(),
        comment: `${request.type} ${request.id}`,
      });
    }
  });
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
