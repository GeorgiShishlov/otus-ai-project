import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

jest.mock('@prisma/client', () => {
  const mockCategory = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      category: mockCategory,
      $disconnect: jest.fn(),
    })),
  };
});

const getMockPrisma = () => new (PrismaClient as jest.MockedClass<typeof PrismaClient>)();

const TEST_USER_ID = 'test-user-uuid';
const validToken = jwt.sign({ userId: TEST_USER_ID }, 'supersecretkey_change_in_prod');

describe('Categories routes', () => {
  let mockPrisma: ReturnType<typeof getMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = getMockPrisma();
  });

  describe('GET /api/categories', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(401);
    });

    it('should return categories for authenticated user', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Продукты', icon: '🛒', color: '#22c55e', userId: TEST_USER_ID },
        { id: 'cat-2', name: 'Транспорт', icon: '🚗', color: '#3b82f6', userId: TEST_USER_ID },
      ];
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Продукты');
    });
  });

  describe('POST /api/categories', () => {
    it('should create a category', async () => {
      const newCategory = {
        id: 'cat-3',
        name: 'Здоровье',
        icon: '💊',
        color: '#ef4444',
        userId: TEST_USER_ID,
      };
      (mockPrisma.category.create as jest.Mock).mockResolvedValue(newCategory);

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Здоровье', icon: '💊', color: '#ef4444' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Здоровье');
      expect(res.body.id).toBe('cat-3');
    });

    it('should return 400 for invalid color format', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Тест', color: 'not-a-color' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should return 404 for non-existent category', async () => {
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/categories/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Category not found');
    });
  });
});
