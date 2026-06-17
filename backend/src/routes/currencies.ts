import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import https from 'https';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/currencies:
 *   get:
 *     summary: Get all available currencies with exchange rates
 *     tags: [Currencies]
 *     responses:
 *       200:
 *         description: List of currencies with exchange rates relative to RUB
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const currencies = await prisma.currency.findMany({
    orderBy: { code: 'asc' },
  });
  res.json(currencies);
});

/**
 * @swagger
 * /api/currencies/refresh:
 *   post:
 *     summary: Refresh exchange rates from CBR (Central Bank of Russia)
 *     tags: [Currencies]
 *     responses:
 *       200:
 *         description: Updated currencies
 */
router.post('/refresh', async (_req: Request, res: Response): Promise<void> => {
  const data = await new Promise<any>((resolve, reject) => {
    https.get('https://www.cbr-xml-daily.ru/daily_json.js', (resp) => {
      let body = '';
      resp.on('data', (chunk) => { body += chunk; });
      resp.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

  const valute = data.Valute as Record<string, { Value: number; Nominal: number }>;

  const updates: { code: string; rateToBase: number }[] = [];

  for (const [code, info] of Object.entries(valute)) {
    const existing = await prisma.currency.findUnique({ where: { code } });
    if (existing) {
      const rateToBase = info.Nominal / info.Value;
      await prisma.currency.update({ where: { code }, data: { rateToBase } });
      updates.push({ code, rateToBase });
    }
  }

  const currencies = await prisma.currency.findMany({ orderBy: { code: 'asc' } });
  res.json({ updated: updates.length, currencies });
});

export default router;
