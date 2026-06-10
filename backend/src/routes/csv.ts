import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createObjectCsvWriter } from 'csv-writer';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import os from 'os';
import path from 'path';
import fs from 'fs';

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseRow(lines[0]).map(h => h.replace(/^﻿/, ''));
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parseRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
      return row;
    });
}

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

const importSchema = z.object({
  content: z.string().min(1),
  mapping: z.object({
    amount: z.string(),
    date: z.string(),
    type: z.string(),
    categoryName: z.string(),
    description: z.string().optional(),
  }),
});

/**
 * @swagger
 * /api/csv/import:
 *   post:
 *     summary: Import transactions from CSV content
 *     tags: [CSV]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content, mapping]
 *             properties:
 *               content:
 *                 type: string
 *                 description: Raw CSV file content as string
 *               mapping:
 *                 type: object
 *                 properties:
 *                   amount: { type: string }
 *                   date: { type: string }
 *                   type: { type: string }
 *                   categoryName: { type: string }
 *                   description: { type: string }
 *     responses:
 *       200:
 *         description: Import result with success and error counts
 */
router.post('/import', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = importSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { content, mapping } = result.data;

  const categories = await prisma.category.findMany({
    where: { userId: req.userId },
  });
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  const rows = parseCsv(content);

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const amount = parseFloat(row[mapping.amount]);
      const date = new Date(row[mapping.date]);
      const typeRaw = row[mapping.type]?.toString().toUpperCase();
      const type = typeRaw === 'INCOME' || typeRaw === 'ДОХОД' ? 'INCOME' : 'EXPENSE';
      const categoryName = row[mapping.categoryName]?.toString().toLowerCase();
      const description = mapping.description ? row[mapping.description] : undefined;

      if (isNaN(amount) || isNaN(date.getTime())) {
        throw new Error(`Invalid amount or date: ${row[mapping.amount]}, ${row[mapping.date]}`);
      }

      let categoryId = categoryMap.get(categoryName);
      if (!categoryId) {
        const newCategory = await prisma.category.create({
          data: { name: row[mapping.categoryName], userId: req.userId! },
        });
        categoryId = newCategory.id;
        categoryMap.set(categoryName, categoryId);
      }

      await prisma.transaction.create({
        data: {
          userId: req.userId!,
          categoryId,
          amount,
          date,
          type,
          description,
          currency: 'RUB',
          exchangeRate: 1.0,
        },
      });

      imported++;
    } catch (err: any) {
      failed++;
      errors.push(err.message);
    }
  }

  res.json({ imported, failed, errors: errors.slice(0, 10) });
});

/**
 * @swagger
 * /api/csv/export:
 *   get:
 *     summary: Export transactions to CSV
 *     tags: [CSV]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export', async (req: AuthRequest, res: Response): Promise<void> => {
  const where: any = { userId: req.userId };
  if (req.query.categoryId) where.categoryId = req.query.categoryId;
  if (req.query.type) where.type = req.query.type;
  if (req.query.dateFrom || req.query.dateTo) {
    where.date = {};
    if (req.query.dateFrom) where.date.gte = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) where.date.lte = new Date(req.query.dateTo as string);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  const tmpFile = path.join(os.tmpdir(), `export_${req.userId}_${Date.now()}.csv`);

  const writer = createObjectCsvWriter({
    path: tmpFile,
    header: [
      { id: 'date', title: 'Date' },
      { id: 'type', title: 'Type' },
      { id: 'amount', title: 'Amount' },
      { id: 'currency', title: 'Currency' },
      { id: 'category', title: 'Category' },
      { id: 'description', title: 'Description' },
    ],
  });

  await writer.writeRecords(
    transactions.map((t) => ({
      date: t.date.toISOString().split('T')[0],
      type: t.type,
      amount: t.amount.toString(),
      currency: t.currency,
      category: t.category.name,
      description: t.description ?? '',
    }))
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="transactions_${Date.now()}.csv"`);

  const fileStream = fs.createReadStream(tmpFile);
  fileStream.pipe(res);
  fileStream.on('end', () => fs.unlink(tmpFile, () => {}));
});

export default router;
