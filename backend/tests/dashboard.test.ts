import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

jest.mock('@prisma/client', () => {
  const mockTransaction = {
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  };
  const mockCategory = {
    findMany: jest.fn(),
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      transaction: mockTransaction,
      category: mockCategory,
      $disconnect: jest.fn(),
    })),
  };
});

const getMockPrisma = () => new (PrismaClient as jest.MockedClass<typeof PrismaClient>)();

const TEST_USER_ID = 'test-user-uuid';
const validToken = jwt.sign({ userId: TEST_USER_ID }, 'supersecretkey_change_in_prod');

describe('Dashboard routes', () => {
  let mockPrisma: ReturnType<typeof getMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = getMockPrisma();
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('should return dashboard statistics', async () => {
    (mockPrisma.transaction.findMany as jest.Mock)
      .mockResolvedValueOnce([{ amount: 90000, exchangeRate: 1.0 }])             // INCOME current month
      .mockResolvedValueOnce([{ amount: 45000, exchangeRate: 1.0, categoryId: 'cat1' }]) // EXPENSE current month
      .mockResolvedValue([]);                                                      // lineChart months

    (mockPrisma.category.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toHaveProperty('totalIncome');
    expect(res.body.summary).toHaveProperty('totalExpense');
    expect(res.body.summary).toHaveProperty('balance');
    expect(res.body.summary.totalIncome).toBe(90000);
    expect(res.body.summary.balance).toBe(45000);
    expect(res.body).toHaveProperty('lineChart');
    expect(res.body).toHaveProperty('pieChart');
  });
});
