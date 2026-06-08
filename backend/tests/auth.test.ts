import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

jest.mock('@prisma/client', () => {
  const mockUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: mockUser,
      $disconnect: jest.fn(),
    })),
  };
});

const getMockPrisma = () => new (PrismaClient as jest.MockedClass<typeof PrismaClient>)();

describe('Auth routes', () => {
  let mockPrisma: ReturnType<typeof getMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = getMockPrisma();
  });

  // ── Регистрация ──────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new user and return token', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'uuid-1',
        email: 'test@test.com',
        name: 'Test User',
        baseCurrency: 'RUB',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('test@test.com');
    });

    it('should return 400 if email already exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'uuid-1',
        email: 'test@test.com',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email already in use');
    });

    it('should return 400 if password is too short', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: '123',
        name: 'Test User',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ── Логин ────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should login and return token', async () => {
      const hash = await bcrypt.hash('password123', 10);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'uuid-1',
        email: 'test@test.com',
        name: 'Test User',
        baseCurrency: 'RUB',
        passwordHash: hash,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should return 401 for wrong password', async () => {
      const hash = await bcrypt.hash('correctpassword', 10);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'uuid-1',
        email: 'test@test.com',
        passwordHash: hash,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@test.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@test.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
    });
  });

  // ── Защита роута ─────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
