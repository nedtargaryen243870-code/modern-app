import { describe, it, expect } from 'vitest';
import { createRequest } from '../helpers/request';

describe('Users API Contracts (/api/users)', () => {
  describe('POST /api/users - User Registration', () => {
    it('should reject registration with 422 when email is missing', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { POST } = await import('@/app/api/users/route');
      const req = createRequest('/api/users', {
        method: 'POST',
        body: {
          name: 'Foo Bar',
          username: 'foobar',
          email: '',
          password: 'secretpassword',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errors).toContain('Email cannot be blank');
    });

    it('should reject registration with 422 when name is missing', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { POST } = await import('@/app/api/users/route');
      const req = createRequest('/api/users', {
        method: 'POST',
        body: {
          name: '',
          username: 'foobar',
          email: 'foobar@example.com',
          password: 'secretpassword',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errors).toContain('Name cannot be blank');
    });

    it('should reject registration with 422 when password is missing', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { POST } = await import('@/app/api/users/route');
      const req = createRequest('/api/users', {
        method: 'POST',
        body: {
          name: 'Foo Bar',
          username: 'foobar',
          email: 'foobar@example.com',
          password: '',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errors).toContain('Password cannot be blank');
    });

    it('should create user with 201 on valid submission and not expose hashed_password', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { POST } = await import('@/app/api/users/route');
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const req = createRequest('/api/users', {
        method: 'POST',
        body: {
          name: 'Valid User',
          username: 'validuser',
          email: uniqueEmail,
          password: 'secretpassword123',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.email).toBe(uniqueEmail);
      expect(json.data.name).toBe('Valid User');
      expect(json.data.username).toBe('validuser');
      expect(json.data.hashed_password).toBeUndefined();
    });
  });

  describe('GET /api/users/:userId - User Profile', () => {
    it('should return 404 when user is not found or invalid ObjectId', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { GET } = await import('@/app/api/users/[userId]/route');
      const req = createRequest('/api/users/000000000000000000000000');
      const res = await GET(req, {
        params: Promise.resolve({ userId: '000000000000000000000000' }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('User not found');
    });
  });

  describe('POST /api/users/session - User Login', () => {
    it('should reject login with 400 when email or password is missing', async () => {
      const { POST } = await import('@/app/api/users/session/route');
      const req = createRequest('/api/users/session', {
        method: 'POST',
        body: { email: '' },
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('should reject login with 401 on incorrect password', async () => {
      const { POST } = await import('@/app/api/users/session/route');
      const req = createRequest('/api/users/session', {
        method: 'POST',
        body: { email: 'nonexistent@example.com', password: 'wrong' },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });
});


