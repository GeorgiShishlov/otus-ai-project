import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/currencies:
 *   get:
 *     summary: Get all available currencies
 *     tags: [Currencies]
 *     responses:
 *       200:
 *         description: List of currencies with exchange rates
 *         content:
 *           application/json:
 *             example:
 *               - code: RUB
 *                 name: Russian Ruble
 *                 symbol: ₽
 *                 rateToBase: 1
 *               - code: USD
 *                 name: US Dollar
 *                 symbol: $
 *                 rateToBase: 0.011
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const currencies = await prisma.currency.findMany({
    orderBy: { code: 'asc' },
  });
  res.json(currencies);
});

export default router;
