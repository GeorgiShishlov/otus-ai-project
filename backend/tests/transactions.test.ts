import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

jest.mock('@prisma/client', () => {
  const mockTransaction = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
  const mockCategory = {
    findFirst: jest.fn(),
  };
  const mockChangeLog = {
    create: jest.fn(),
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      transaction: mockTransaction,
      category: mockCategory,
      changeLog: mockChangeLog,
      $disconnect: jest.fn(),
    })),
  };
});

const getMockPrisma = () => new (PrismaClient as jest.MockedClass<typeof PrismaClient>)();

const TEST_USER_ID = 'test-user-uuid';
const validToken = jwt.sign({ userId: TEST_USER_ID }, 'supersecretkey_change_in_prod');

const mockCategory = {
  id: 'cat-1',
  name: 'Продукты',
  icon: '🛒',
  color: '#22c55e',
  userId: TEST_USER_ID,
};

const mockTransaction = {
  id: 'tx-1',
  amount: 1500,
  date: new Date().toISOString(),
  type: 'EXPENSE',
  description: 'Пятёрочка',
  userId: TEST_USER_ID,
  categoryId: 'cat-1',
  currency: 'RUB',
  exchangeRate: 1.0,
  category: mockCategory,
};

describe('Transactions routes', () => {
  let mockPrisma: ReturnType<typeof getMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = getMockPrisma();
  });

  describe('GET /api/transactions', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(401);
    });

    it('should return paginated transactions', async () => {
      (mockPrisma.transaction.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
        mockTransaction,
        { ...mockTransaction, id: 'tx-2', amount: 500 },
      ]);

      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter transactions by type', async () => {
      (mockPrisma.transaction.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([mockTransaction]);

      const res = await request(app)
        .get('/api/transactions?type=EXPENSE')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].type).toBe('EXPENSE');

      const findManyCall = (mockPrisma.transaction.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.type).toBe('EXPENSE');
    });
  });

  describe('POST /api/transactions', () => {
    it('should create a transaction and write to changelog', async () => {
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrisma.transaction.create as jest.Mock).mockResolvedValue(mockTransaction);
      (mockPrisma.changeLog.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 1500,
          date: new Date().toISOString(),
          type: 'EXPENSE',
          categoryId: 'cat-1',
          description: 'Пятёрочка',
        });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1500);
      expect(mockPrisma.changeLog.create).toHaveBeenCalledTimes(1);

      const changeLogCall = (mockPrisma.changeLog.create as jest.Mock).mock.calls[0][0];
      expect(changeLogCall.data.action).toBe('CREATE');
    });
  });
});
