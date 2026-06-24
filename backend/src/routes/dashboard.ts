import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Convert stored amount to base currency (RUB): exchangeRate = foreignPerOneRub
const toBase = (amount: any, exchangeRate: any): number =>
  Number(amount) / Number(exchangeRate);

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: "Format: YYYY-MM. Defaults to current month"
 *     responses:
 *       200:
 *         description: Dashboard data including charts and summary
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const [year, mon] = month.split('-').map(Number);

  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0, 23, 59, 59);

  const [incomeTxns, expenseTxns] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: req.userId, type: 'INCOME', date: { gte: monthStart, lte: monthEnd } },
      select: { amount: true, exchangeRate: true },
    }),
    prisma.transaction.findMany({
      where: { userId: req.userId, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
      select: { amount: true, exchangeRate: true, categoryId: true },
    }),
  ]);

  const totalIncome = incomeTxns.reduce((s, t) => s + toBase(t.amount, t.exchangeRate), 0);
  const totalExpense = expenseTxns.reduce((s, t) => s + toBase(t.amount, t.exchangeRate), 0);

  const byCat = new Map<string, number>();
  for (const t of expenseTxns) {
    byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + toBase(t.amount, t.exchangeRate));
  }

  const categoryIds = [...byCat.keys()];
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const pieChart = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId, amount]) => {
      const cat = categoryMap.get(categoryId);
      return {
        categoryId,
        name: cat?.name ?? 'Unknown',
        icon: cat?.icon ?? '?',
        color: cat?.color ?? '#6366f1',
        amount: Math.round(amount),
      };
    });

  const top5 = pieChart.slice(0, 5);

  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, mon - 1 - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label, start, end });
  }

  const lineChart = await Promise.all(
    months.map(async ({ label, start, end }) => {
      const [incs, exps] = await Promise.all([
        prisma.transaction.findMany({
          where: { userId: req.userId, type: 'INCOME', date: { gte: start, lte: end } },
          select: { amount: true, exchangeRate: true },
        }),
        prisma.transaction.findMany({
          where: { userId: req.userId, type: 'EXPENSE', date: { gte: start, lte: end } },
          select: { amount: true, exchangeRate: true },
        }),
      ]);
      return {
        month: label,
        income: Math.round(incs.reduce((s, t) => s + toBase(t.amount, t.exchangeRate), 0)),
        expense: Math.round(exps.reduce((s, t) => s + toBase(t.amount, t.exchangeRate), 0)),
      };
    })
  );

  res.json({
    summary: {
      totalIncome: Math.round(totalIncome),
      totalExpense: Math.round(totalExpense),
      balance: Math.round(totalIncome - totalExpense),
      month,
    },
    pieChart,
    top5,
    lineChart,
  });
});

export default router;
