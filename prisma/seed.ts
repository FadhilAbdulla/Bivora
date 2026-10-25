import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env");
  }

  const admin = await db.user.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", status: "ACTIVE" },
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
    },
  });
  console.log(`Super admin ready: ${email}`);
  return admin;
}

// Demo client with sample activity, for trying the client dashboard.
// Skipped when DEMO_CLIENT_EMAIL is empty (e.g. in production).
async function seedDemoClient(adminId: string) {
  const email = process.env.DEMO_CLIENT_EMAIL?.toLowerCase();
  const password = process.env.DEMO_CLIENT_PASSWORD;
  if (!email || !password) return;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Demo client already exists: ${email}`);
    return;
  }

  const client = await db.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firstName: "Demo",
      lastName: "Trader",
      phone: "+971500000000",
      country: "United Arab Emirates",
    },
  });

  await db.bankAccount.create({
    data: {
      userId: client.id,
      bankName: "Emirates NBD",
      accountHolder: "Demo Trader",
      accountNumber: "1012345678901",
      iban: "AE070331234567890123456",
      swiftCode: "EBILAEAD",
      branch: "Dubai Mall",
      country: "United Arab Emirates",
      currency: "AED",
      isDefault: true,
    },
  });

  // Two approved deposits, one approved withdrawal, and one request of each type pending review.
  const history = [
    { type: "DEPOSIT", amount: 5000, method: "BANK_TRANSFER", reference: "SWIFT-88231", daysAgo: 12 },
    { type: "DEPOSIT", amount: 2500, method: "USDT_TRC20", reference: "0x9f2c…e41a", daysAgo: 7 },
    {
      type: "WITHDRAWAL",
      amount: 1200,
      method: "BANK_TRANSFER",
      payoutDetails: "Emirates NBD · Demo Trader · IBAN AE070331234567890123456",
      daysAgo: 3,
    },
  ] as const;

  let balance = new Prisma.Decimal(0);
  for (const item of history) {
    const createdAt = new Date(Date.now() - item.daysAgo * 86_400_000);
    const delta = new Prisma.Decimal(item.type === "DEPOSIT" ? item.amount : -item.amount);
    balance = balance.plus(delta);
    const request = await db.fundRequest.create({
      data: {
        userId: client.id,
        type: item.type,
        amount: item.amount,
        method: item.method,
        reference: "reference" in item ? item.reference : null,
        payoutDetails: "payoutDetails" in item ? item.payoutDetails : null,
        status: "APPROVED",
        adminNote: item.type === "DEPOSIT" ? "Funds received" : "Paid",
        reviewedById: adminId,
        reviewedAt: createdAt,
        createdAt,
      },
    });
    await db.ledgerEntry.create({
      data: {
        userId: client.id,
        amount: delta,
        balanceAfter: balance,
        description: item.type === "DEPOSIT" ? "Deposit approved" : "Withdrawal approved",
        fundRequestId: request.id,
        createdAt,
      },
    });
  }
  await db.user.update({ where: { id: client.id }, data: { balance } });

  await db.fundRequest.createMany({
    data: [
      { userId: client.id, type: "DEPOSIT", amount: 3000, method: "CARD" },
      {
        userId: client.id,
        type: "WITHDRAWAL",
        amount: 800,
        method: "BANK_TRANSFER",
        payoutDetails: "Emirates NBD · Demo Trader · IBAN AE070331234567890123456",
      },
    ],
  });

  console.log(`Demo client ready: ${email}`);
}

async function main() {
  const admin = await seedSuperAdmin();
  await seedDemoClient(admin.id);
}

main().finally(() => db.$disconnect());
