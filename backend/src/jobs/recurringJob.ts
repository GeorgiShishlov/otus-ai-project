import cron from 'node-cron';
import prisma from '../lib/prisma';


export function startRecurringJob(): void {
  // Р—Р°РїСѓСЃРєР°РµС‚СЃСЏ РєР°Р¶РґС‹Р№ РґРµРЅСЊ РІ 00:05
  cron.schedule('5 0 * * *', async () => {
    console.log('[RecurringJob] Checking recurring rules...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueRules = await prisma.recurringRule.findMany({
      where: {
        isActive: true,
        nextRunDate: { lte: today },
      },
    });

    console.log(`[RecurringJob] Found ${dueRules.length} rules to process`);

    for (const rule of dueRules) {
      try {
        const transaction = await prisma.transaction.create({
          data: {
            userId: rule.userId,
            categoryId: rule.categoryId,
            amount: rule.amount,
            type: rule.type,
            description: rule.description ?? 'Recurring transaction',
            currency: rule.currency,
            exchangeRate: 1.0,
            date: new Date(),
          },
        });

        await prisma.changeLog.create({
          data: {
            entityType: 'Transaction',
            entityId: transaction.id,
            action: 'CREATE',
            userId: rule.userId,
            after: { ...transaction, source: 'recurring' } as any,
          },
        });

        // Advance nextRunDate from today so dormant rules don't fire daily to “catch up”
        const nextRun = new Date(today);
        nextRun.setDate(rule.dayOfMonth);
        if (nextRun <= today) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }

        await prisma.recurringRule.update({
          where: { id: rule.id },
          data: { nextRunDate: nextRun },
        });

        console.log(`[RecurringJob] Created transaction for rule ${rule.id}`);
      } catch (err) {
        console.error(`[RecurringJob] Failed for rule ${rule.id}:`, err);
      }
    }
  });

  console.log('[RecurringJob] Scheduler started (runs daily at 00:05)');
}

