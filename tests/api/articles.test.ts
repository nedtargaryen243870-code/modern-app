import { describe, it, expect } from 'vitest';
import { createRequest } from '../helpers/request';

describe('Articles & Comments API Contracts', () => {
  describe('GET /api/articles - List Articles', () => {
    it('should return a paginated envelope of articles', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { GET } = await import('@/app/api/articles/route');
      const req = createRequest('/api/articles?page=1');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta).toBeDefined();
      expect(json.meta.page).toBe(1);
      expect(json.meta.limit).toBe(15);
    });
  });

  describe('POST /api/articles - Create Article', () => {
    it('should return 401 Unauthorized when user is not logged in', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { POST } = await import('@/app/api/articles/route');
      const req = createRequest('/api/articles', {
        method: 'POST',
        body: {
          title: 'Unauthenticated Article',
          body: 'This should fail',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('should reject with 422 when title is blank', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { POST } = await import('@/app/api/articles/route');
      const req = createRequest('/api/articles', {
        method: 'POST',
        headers: { 'x-test-user-id': '507f1f77bcf86cd799439011' },
        body: {
          title: '',
          body: 'Valid article body',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errors).toContain('Article title cannot be blank');
    });

    it('should reject with 422 when body is blank', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { POST } = await import('@/app/api/articles/route');
      const req = createRequest('/api/articles', {
        method: 'POST',
        headers: { 'x-test-user-id': '507f1f77bcf86cd799439011' },
        body: {
          title: 'Valid Title',
          body: '',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errors).toContain('Article body cannot be blank');
    });
  });

  describe('GET /api/articles/:id - Article Details', () => {
    it('should return 404 for non-existent article id', async () => {
      // @ts-expect-error - testing route handler before implementation
      const { GET } = await import('@/app/api/articles/[id]/route');
      const req = createRequest('/api/articles/000000000000000000000000');
      const res = await GET(req, {
        params: Promise.resolve({ id: '000000000000000000000000' }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Article not found');
    });
  });

  describe('DELETE /api/articles/:id - Article Deletion Authorization', () => {
    it('should reject with 403 when user is not the article author', async () => {
      const { POST } = await import('@/app/api/articles/route');
      const { DELETE } = await import('@/app/api/articles/[id]/route');

      // Create article as owner (User A)
      const createReq = createRequest('/api/articles', {
        method: 'POST',
        headers: { 'x-test-user-id': '507f1f77bcf86cd799439011' },
        body: { title: 'Auth Test Article', body: 'Testing ownership' },
      });
      const createRes = await POST(createReq);
      const { data: createdArticle } = await createRes.json();

      // Attempt deletion as non-owner (User B)
      const req = createRequest(`/api/articles/${createdArticle._id}`, {
        method: 'DELETE',
        headers: { 'x-test-user-id': '607f1f77bcf86cd799439099' }, // non-owner
      });

      const res = await DELETE(req, {
        params: Promise.resolve({ id: createdArticle._id }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('You are not authorized');
    });
  });

  describe('DELETE /api/articles/:id/comments/:commentId - Comment Co-Authorization', () => {
    it('should reject with 403 when user is neither comment author nor article owner', async () => {
      const { POST: createArticle } = await import('@/app/api/articles/route');
      const { POST: addComment } = await import('@/app/api/articles/[id]/comments/route');
      const { DELETE } = await import(
        '@/app/api/articles/[id]/comments/[commentId]/route'
      );

      // Create article as User A
      const articleReq = createRequest('/api/articles', {
        method: 'POST',
        headers: { 'x-test-user-id': '507f1f77bcf86cd799439011' },
        body: { title: 'Comment Co-Auth Article', body: 'Testing comments' },
      });
      const articleRes = await createArticle(articleReq);
      const { data: article } = await articleRes.json();

      // Add comment as User B
      const commentReq = createRequest(`/api/articles/${article._id}/comments`, {
        method: 'POST',
        headers: { 'x-test-user-id': '607f1f77bcf86cd799439022' },
        body: { body: 'User B comment' },
      });
      const commentRes = await addComment(commentReq, {
        params: Promise.resolve({ id: article._id }),
      });
      const { data: comment } = await commentRes.json();

      // User C (unrelated 3rd party) attempts deletion
      const req = createRequest(
        `/api/articles/${article._id}/comments/${comment._id}`,
        {
          method: 'DELETE',
          headers: { 'x-test-user-id': '907f1f77bcf86cd799439088' }, // 3rd party
        }
      );

      const res = await DELETE(req, {
        params: Promise.resolve({
          id: article._id,
          commentId: comment._id,
        }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('You are not authorized');
    });

    it('should allow comment deletion when user is the article owner (Co-Authorization)', async () => {
      const { POST: createArticle } = await import('@/app/api/articles/route');
      const { POST: addComment } = await import('@/app/api/articles/[id]/comments/route');
      const { DELETE } = await import(
        '@/app/api/articles/[id]/comments/[commentId]/route'
      );

      // Create article as User A (Article Owner)
      const articleReq = createRequest('/api/articles', {
        method: 'POST',
        headers: { 'x-test-user-id': '507f1f77bcf86cd799439011' },
        body: { title: 'Owner Deletion Article', body: 'Owner test' },
      });
      const articleRes = await createArticle(articleReq);
      const { data: article } = await articleRes.json();

      // Add comment as User B (Comment Author)
      const commentReq = createRequest(`/api/articles/${article._id}/comments`, {
        method: 'POST',
        headers: { 'x-test-user-id': '607f1f77bcf86cd799439022' },
        body: { body: 'Comment to be deleted by article owner' },
      });
      const commentRes = await addComment(commentReq, {
        params: Promise.resolve({ id: article._id }),
      });
      const { data: comment } = await commentRes.json();

      // User A (article owner) deletes User B's comment
      const req = createRequest(
        `/api/articles/${article._id}/comments/${comment._id}`,
        {
          method: 'DELETE',
          headers: { 'x-test-user-id': '507f1f77bcf86cd799439011' }, // Article Owner
        }
      );

      const res = await DELETE(req, {
        params: Promise.resolve({
          id: article._id,
          commentId: comment._id,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe('Removed comment');
    });
  });
});

