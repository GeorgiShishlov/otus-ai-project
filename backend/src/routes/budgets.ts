import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

const budgetSchema = z.object({
  categoryId: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  limitAmount: z.number().positive(),
});

/**
 * @swagger
 * /api/budgets:
 *   get:
 *     summary: Get budgets with spending progress
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: "Format: YYYY-MM"
 *     responses:
 *       200:
 *         description: List of budgets with spent amount
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

  const budgets = await prisma.budget.findMany({
    where: { userId: req.userId, month },
    include: { category: true },
  });

  const result = await Promise.all(
    budgets.map(async (budget) => {
      const [year, mon] = month.split('-').map(Number);
      const dateFrom = new Date(year, mon - 1, 1);
      const dateTo = new Date(year, mon, 0, 23, 59, 59);

      const spent = await prisma.transaction.aggregate({
        where: {
          userId: req.userId,
          categoryId: budget.categoryId,
          type: 'EXPENSE',
          date: { gte: dateFrom, lte: dateTo },
        },
        _sum: { amount: true },
      });

      const spentAmount = Number(spent._sum.amount ?? 0);
      const limitAmount = Number(budget.limitAmount);

      return {
        ...budget,
        spentAmount,
        remainingAmount: limitAmount - spentAmount,
        progressPercent: Math.min(Math.round((spentAmount / limitAmount) * 100), 100),
      };
    })
  );

  res.json(result);
});

/**
 * @swagger
 * /api/budgets:
 *   post:
 *     summary: Create a budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, month, limitAmount]
 *             properties:
 *               categoryId: { type: string }
 *               month: { type: string, example: "2024-01" }
 *               limitAmount: { type: number }
 *     responses:
 *       201:
 *         description: Budget created
 */
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = budgetSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const category = await prisma.category.findFirst({
    where: { id: result.data.categoryId, userId: req.userId },
  });
  if (!category) {
    res.status(400).json({ error: 'Category not found' });
    return;
  }

  try {
    const budget = await prisma.budget.create({
      data: { ...result.data, userId: req.userId! },
      include: { category: true },
    });

    await prisma.changeLog.create({
      data: {
        entityType: 'Budget',
        entityId: budget.id,
        action: 'CREATE',
        userId: req.userId!,
        before: null,
        after: budget as any,
      },
    });

    res.status(201).json(budget);
  } catch {
    res.status(400).json({ error: 'Budget for this category and month already exists' });
  }
});

/**
 * @swagger
 * /api/budgets/{id}:
 *   put:
 *     summary: Update a budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Budget updated
 */
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = budgetSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const existing = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Budget not found' });
    return;
  }

  const budget = await prisma.budget.update({
    where: { id: req.params.id },
    data: result.data,
    include: { category: true },
  });

  await prisma.changeLog.create({
    data: {
      entityType: 'Budget',
      entityId: budget.id,
      action: 'UPDATE',
      userId: req.userId!,
      before: existing as any,
      after: budget as any,
    },
  });

  res.json(budget);
});

/**
 * @swagger
 * /api/budgets/{id}:
 *   delete:
 *     summary: Delete a budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Budget not found' });
    return;
  }

  await prisma.budget.delete({ where: { id: req.params.id } });

  await prisma.changeLog.create({
    data: {
      entityType: 'Budget',
      entityId: req.params.id,
      action: 'DELETE',
      userId: req.userId!,
      before: existing as any,
      after: null,
    },
  });

  res.status(204).send();
});

export default router;
