import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_EMAIL = "kjmw2211@gmail.com";

interface WeekData {
  weekStart: string;
  income: number;
  spentFun: number;
  spentSkill: number;
  spentFlex: number;
  notes?: string;
}

const weeks: WeekData[] = [
  { weekStart: "2025-05-08", income: 1250000,  spentFun: 0,       spentSkill: 0,      spentFlex: 0 },
  { weekStart: "2025-05-16", income: 150000,   spentFun: 63000,   spentSkill: 0,      spentFlex: 0 },
  { weekStart: "2025-05-24", income: 189000,   spentFun: 10000,   spentSkill: 0,      spentFlex: 0 },
  { weekStart: "2025-06-01", income: 360000,   spentFun: 188800,  spentSkill: 0,      spentFlex: 66275 },
  { weekStart: "2025-06-09", income: 44000,    spentFun: 0,       spentSkill: 0,      spentFlex: 0 },
  { weekStart: "2025-07-08", income: 100000,   spentFun: 0,       spentSkill: 48862,  spentFlex: 120000 },
  { weekStart: "2025-07-16", income: 300000,   spentFun: 0,       spentSkill: 266235, spentFlex: 0 },
  { weekStart: "2025-07-24", income: 200000,   spentFun: 0,       spentSkill: 150000, spentFlex: 0 },
  { weekStart: "2025-08-01", income: 571000,   spentFun: 389828,  spentSkill: 91500,  spentFlex: 0,   notes: "Oharang 120K, Selisuh from miscalc 219k, 50 climbing" },
  { weekStart: "2025-08-09", income: 300000,   spentFun: 0,       spentSkill: 45000,  spentFlex: 0,   notes: "45k jajan" },
  { weekStart: "2025-08-25", income: 0,        spentFun: 50000,   spentSkill: 0,      spentFlex: 0 },
  { weekStart: "2025-09-02", income: 350000,   spentFun: 0,       spentSkill: 94928,  spentFlex: 0,   notes: "Beli casing, jajan" },
  { weekStart: "2025-09-11", income: 300000,   spentFun: 57000,   spentSkill: 90000,  spentFlex: 0,   notes: "50K panti asuhan, 20k jajan, 20k mami, 57K adem ayem" },
  { weekStart: "2025-10-20", income: 318000,   spentFun: 0,       spentSkill: 0,      spentFlex: 0 },
  { weekStart: "2025-11-09", income: 449428,   spentFun: 0,       spentSkill: 0,      spentFlex: 0,   notes: "Update" },
  { weekStart: "2025-11-11", income: 1450000,  spentFun: 0,       spentSkill: 10000,  spentFlex: 0 },
  { weekStart: "2026-02-01", income: 600000,   spentFun: 300000,  spentSkill: 0,      spentFlex: 0,   notes: "selisih, update" },
  { weekStart: "2026-02-17", income: 1100000,  spentFun: 0,       spentSkill: 134000, spentFlex: 0,   notes: "angpao" },
  { weekStart: "2026-02-25", income: 150000,   spentFun: 147500,  spentSkill: 0,      spentFlex: 190000, notes: "190k dokdo cleanser, 150k yakiniku like" },
  { weekStart: "2026-03-05", income: 0,        spentFun: 45000,   spentSkill: 235000, spentFlex: 0,   notes: "45k steam wallpaper engine, 80rb UPP, 20rb Persembahan, 50rb APP, 30rb gojek, 55rb climbing" },
  { weekStart: "2026-03-13", income: 379000,   spentFun: 0,       spentSkill: 0,      spentFlex: 0 },
];

async function main() {
  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) {
    console.error(`User ${USER_EMAIL} not found — register on the dashboard first.`);
    process.exit(1);
  }
  console.log(`Found user: ${user.name ?? user.email} (${user.id})`);

  await prisma.expense.deleteMany({ where: { userId: user.id } });
  await prisma.incomeEntry.deleteMany({ where: { userId: user.id } });
  console.log("Cleared existing finance data.");

  let incomeCount = 0;
  let expenseCount = 0;

  for (const week of weeks) {
    const date = new Date(week.weekStart);

    if (week.income > 0) {
      await prisma.incomeEntry.create({
        data: { userId: user.id, amount: week.income, source: "Weekly", date },
      });
      incomeCount++;
    }

    const expenses: { amount: number; target: "FUND" | "SKILL" | "FLEX" }[] = [
      { amount: week.spentFun,   target: "FUND"  },
      { amount: week.spentSkill, target: "SKILL" },
      { amount: week.spentFlex,  target: "FLEX"  },
    ];

    for (const { amount, target } of expenses) {
      if (amount > 0) {
        await prisma.expense.create({
          data: {
            userId: user.id,
            amount,
            category: "Other",
            balanceTarget: target,
            description: week.notes ?? undefined,
            date,
          },
        });
        expenseCount++;
      }
    }
  }

  console.log(`Done — ${incomeCount} income entries, ${expenseCount} expenses imported.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
