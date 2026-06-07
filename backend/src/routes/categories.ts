import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().default('💰'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories for current user
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const categories = await prisma.category.findMany({
    where: { userId: req.userId },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               icon: { type: string }
 *               color: { type: string }
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = categorySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const category = await prisma.category.create({
    data: { ...result.data, userId: req.userId! },
  });

  res.status(201).json(category);
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Category updated
 *       404:
 *         description: Not found
 */
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = categorySchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const existing = await prisma.category.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: result.data,
  });

  res.json(category);
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
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
  const existing = await prisma.category.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
