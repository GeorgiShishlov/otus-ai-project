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
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      transaction: mockTransaction,
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
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(401);
  });

  it('should return dashboard statistics', async () => {
    (mockPrisma.transaction.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amount: 90000 } })
      .mockResolvedValueOnce({ _sum: { amount: 45000 } });

    (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.transaction.groupBy as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalIncome');
    expect(res.body).toHaveProperty('totalExpense');
    expect(res.body).toHaveProperty('balance');
    expect(res.body.totalIncome).toBe(90000);
    expect(res.body.balance).toBe(45000);
  });
});
