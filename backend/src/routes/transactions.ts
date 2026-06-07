import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

const transactionSchema = z.object({
  amount: z.number().positive(),
  date: z.string().datetime(),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().optional(),
  categoryId: z.string(),
  currency: z.string().length(3).default('RUB'),
  exchangeRate: z.number().positive().default(1.0),
});

const filterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  categoryId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
});

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get transactions with filters and pagination
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: amountMin
 *         schema: { type: number }
 *       - in: query
 *         name: amountMax
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Paginated list of transactions
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = filterSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { page, limit, categoryId, type, dateFrom, dateTo, amountMin, amountMax } = result.data;

  const where: any = { userId: req.userId };
  if (categoryId) where.categoryId = categoryId;
  if (type) where.type = type;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }
  if (amountMin !== undefined || amountMax !== undefined) {
    where.amount = {};
    if (amountMin !== undefined) where.amount.gte = amountMin;
    if (amountMax !== undefined) where.amount.lte = amountMax;
  }

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({
    data: transactions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, date, type, categoryId]
 *             properties:
 *               amount: { type: number }
 *               date: { type: string, format: date-time }
 *               type: { type: string, enum: [INCOME, EXPENSE] }
 *               description: { type: string }
 *               categoryId: { type: string }
 *               currency: { type: string }
 *               exchangeRate: { type: number }
 *     responses:
 *       201:
 *         description: Transaction created
 */
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = transactionSchema.safeParse(req.body);
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

  const transaction = await prisma.transaction.create({
    data: { ...result.data, userId: req.userId! },
    include: { category: true },
  });

  await prisma.changeLog.create({
    data: {
      entityType: 'Transaction',
      entityId: transaction.id,
      action: 'CREATE',
      userId: req.userId!,
      before: null,
      after: transaction as any,
    },
  });

  res.status(201).json(transaction);
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction updated
 *       404:
 *         description: Not found
 */
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = transactionSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  const transaction = await prisma.transaction.update({
    where: { id: req.params.id },
    data: result.data,
    include: { category: true },
  });

  await prisma.changeLog.create({
    data: {
      entityType: 'Transaction',
      entityId: transaction.id,
      action: 'UPDATE',
      userId: req.userId!,
      before: existing as any,
      after: transaction as any,
    },
  });

  res.json(transaction);
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
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
 *       404:
 *         description: Not found
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  await prisma.transaction.delete({ where: { id: req.params.id } });

  await prisma.changeLog.create({
    data: {
      entityType: 'Transaction',
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
