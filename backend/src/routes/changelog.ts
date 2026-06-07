import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

const filterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  entityType: z.enum(['Transaction', 'Budget']).optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
});

/**
 * @swagger
 * /api/changelog:
 *   get:
 *     summary: Get change log with pagination
 *     tags: [ChangeLog]
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
 *         name: entityType
 *         schema: { type: string, enum: [Transaction, Budget] }
 *       - in: query
 *         name: action
 *         schema: { type: string, enum: [CREATE, UPDATE, DELETE] }
 *     responses:
 *       200:
 *         description: Paginated change log entries
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = filterSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { page, limit, entityType, action } = result.data;

  const where: any = { userId: req.userId };
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  const [total, entries] = await Promise.all([
    prisma.changeLog.count({ where }),
    prisma.changeLog.findMany({
      where,
      orderBy: { changedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({
    data: entries,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export default router;
