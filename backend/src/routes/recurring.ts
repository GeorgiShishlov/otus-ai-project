import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

const recurringSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().optional(),
  dayOfMonth: z.number().int().min(1).max(28),
  currency: z.string().length(3).default('RUB'),
});

/**
 * @swagger
 * /api/recurring:
 *   get:
 *     summary: Get all recurring rules
 *     tags: [Recurring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recurring rules
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const rules = await prisma.recurringRule.findMany({
    where: { userId: req.userId },
    include: { category: true },
    orderBy: { dayOfMonth: 'asc' },
  });
  res.json(rules);
});

/**
 * @swagger
 * /api/recurring:
 *   post:
 *     summary: Create a recurring rule
 *     tags: [Recurring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, amount, type, dayOfMonth]
 *             properties:
 *               categoryId: { type: string }
 *               amount: { type: number }
 *               type: { type: string, enum: [INCOME, EXPENSE] }
 *               description: { type: string }
 *               dayOfMonth: { type: integer, minimum: 1, maximum: 28 }
 *               currency: { type: string }
 *     responses:
 *       201:
 *         description: Recurring rule created
 */
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = recurringSchema.safeParse(req.body);
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

  const nextRunDate = getNextRunDate(result.data.dayOfMonth);

  const rule = await prisma.recurringRule.create({
    data: { ...result.data, userId: req.userId!, nextRunDate },
    include: { category: true },
  });

  res.status(201).json(rule);
});

/**
 * @swagger
 * /api/recurring/{id}:
 *   put:
 *     summary: Update a recurring rule
 *     tags: [Recurring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = recurringSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const existing = await prisma.recurringRule.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Recurring rule not found' });
    return;
  }

  const data: any = { ...result.data };
  if (result.data.dayOfMonth) {
    data.nextRunDate = getNextRunDate(result.data.dayOfMonth);
  }

  const rule = await prisma.recurringRule.update({
    where: { id: req.params.id },
    data,
    include: { category: true },
  });

  res.json(rule);
});

/**
 * @swagger
 * /api/recurring/{id}:
 *   delete:
 *     summary: Delete a recurring rule
 *     tags: [Recurring]
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
  const existing = await prisma.recurringRule.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Recurring rule not found' });
    return;
  }

  await prisma.recurringRule.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

function getNextRunDate(dayOfMonth: number): Date {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (next <= now) {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export default router;
