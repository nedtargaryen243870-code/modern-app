import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as telemetry from '@/lib/telemetry';
import { createRequest } from '../helpers/request';

describe('Domain Audit Event Telemetry Integration', () => {
  let trackAuditSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    trackAuditSpy = vi.spyOn(telemetry, 'trackAudit').mockResolvedValue('msg-audit-id');
  });

  describe('Authentication & User Audit Events', () => {
    it('emits audit.auth event on successful user registration', async () => {
      const { POST } = await import('@/app/api/users/route');
      const uniqueSuffix = Date.now();
      const email = `audit-reg-${uniqueSuffix}@example.com`;
      const req = createRequest('/api/users', {
        method: 'POST',
        headers: { 'x-trace-id': 'trace-reg-123' },
        body: {
          name: 'Audit User',
          username: `audituser${uniqueSuffix}`,
          email,
          password: 'Password123!',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(trackAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'signup',
          resourceType: 'auth',
          status: 'success',
          userId: json.data._id,
          details: expect.objectContaining({
            email,
            username: `audituser${uniqueSuffix}`,
          }),
        }),
        expect.objectContaining({
          traceId: 'trace-reg-123',
        })
      );
    });

    it('emits audit.auth event on failed and successful login', async () => {
      const { POST: userPost } = await import('@/app/api/users/route');
      const { POST: sessionPost } = await import('@/app/api/users/session/route');
      const uniqueSuffix = Date.now();
      const email = `audit-login-${uniqueSuffix}@example.com`;

      // 1. Register user
      const regReq = createRequest('/api/users', {
        method: 'POST',
        body: {
          name: 'Login Audit User',
          username: `loginuser${uniqueSuffix}`,
          email,
          password: 'SecretPassword123!',
        },
      });
      const regRes = await userPost(regReq);
      const { data: user } = await regRes.json();
      trackAuditSpy.mockClear();

      // 2. Failed login
      const failReq = createRequest('/api/users/session', {
        method: 'POST',
        headers: { 'x-trace-id': 'trace-login-fail' },
        body: {
          email,
          password: 'WrongPassword!',
        },
      });
      const failRes = await sessionPost(failReq);
      expect(failRes.status).toBe(401);

      expect(trackAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          resourceType: 'auth',
          status: 'failure',
          details: expect.objectContaining({ email }),
        }),
        expect.objectContaining({
          traceId: 'trace-login-fail',
        })
      );

      trackAuditSpy.mockClear();

      // 3. Successful login
      const successReq = createRequest('/api/users/session', {
        method: 'POST',
        headers: { 'x-trace-id': 'trace-login-success' },
        body: {
          email,
          password: 'SecretPassword123!',
        },
      });
      const successRes = await sessionPost(successReq);
      expect(successRes.status).toBe(200);

      expect(trackAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          resourceType: 'auth',
          status: 'success',
          userId: user._id,
          details: expect.objectContaining({ email }),
        }),
        expect.objectContaining({
          traceId: 'trace-login-success',
        })
      );
    });
  });

  describe('Article & Comment Audit Events', () => {
    it('emits audit.article events on article creation, update, and deletion', async () => {
      const { POST: createArticle } = await import('@/app/api/articles/route');
      const { PUT: updateArticle, DELETE: deleteArticle } = await import(
        '@/app/api/articles/[id]/route'
      );
      const testUserId = '507f1f77bcf86cd799439011';

      // 1. Create Article
      const createReq = createRequest('/api/articles', {
        method: 'POST',
        headers: {
          'x-test-user-id': testUserId,
          'x-trace-id': 'trace-article-create',
        },
        body: {
          title: 'Audit Lifecycle Article',
          body: 'This is a test body for audit lifecycle.',
          tags: 'telemetry, audit',
        },
      });

      const createRes = await createArticle(createReq);
      expect(createRes.status).toBe(201);
      const { data: created } = await createRes.json();

      expect(trackAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          resourceType: 'article',
          resourceId: created._id,
          userId: testUserId,
          status: 'success',
          details: expect.objectContaining({ title: 'Audit Lifecycle Article' }),
        }),
        expect.objectContaining({
          traceId: 'trace-article-create',
        })
      );

      trackAuditSpy.mockClear();

      // 2. Update Article
      const updateReq = createRequest(`/api/articles/${created._id}`, {
        method: 'PUT',
        headers: {
          'x-test-user-id': testUserId,
          'x-trace-id': 'trace-article-update',
        },
        body: {
          title: 'Updated Audit Article',
          body: 'Updated body for audit test.',
          tags: 'telemetry, updated',
        },
      });

      const updateRes = await updateArticle(updateReq, {
        params: Promise.resolve({ id: created._id }),
      });
      expect(updateRes.status).toBe(200);

      expect(trackAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          resourceType: 'article',
          resourceId: created._id,
          userId: testUserId,
          status: 'success',
          details: expect.objectContaining({ title: 'Updated Audit Article' }),
        }),
        expect.objectContaining({
          traceId: 'trace-article-update',
        })
      );

      trackAuditSpy.mockClear();

      // 3. Delete Article
      const deleteReq = createRequest(`/api/articles/${created._id}`, {
        method: 'DELETE',
        headers: {
          'x-test-user-id': testUserId,
          'x-trace-id': 'trace-article-delete',
        },
      });

      const deleteRes = await deleteArticle(deleteReq, {
        params: Promise.resolve({ id: created._id }),
      });
      expect(deleteRes.status).toBe(200);

      expect(trackAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          resourceType: 'article',
          resourceId: created._id,
          userId: testUserId,
          status: 'success',
        }),
        expect.objectContaining({
          traceId: 'trace-article-delete',
        })
      );
    });

    it('emits audit.comment events on comment creation and deletion', async () => {
      const { POST: createArticle } = await import('@/app/api/articles/route');
      const { POST: addComment } = await import(
        '@/app/api/articles/[id]/comments/route'
      );
      const { DELETE: deleteComment } = await import(
        '@/app/api/articles/[id]/comments/[commentId]/route'
      );
      const authorUserId = '507f1f77bcf86cd799439011';
      const commentUserId = '607f1f77bcf86cd799439022';

      // 1. Create Article
      const articleReq = createRequest('/api/articles', {
        method: 'POST',
        headers: { 'x-test-user-id': authorUserId },
        body: { title: 'Comment Audit Article', body: 'Comment audit testing' },
      });
      const articleRes = await createArticle(articleReq);
      const { data: article } = await articleRes.json();

      trackAuditSpy.mockClear();

      // 2. Add Comment
      const commentReq = createRequest(`/api/articles/${article._id}/comments`, {
        method: 'POST',
        headers: {
          'x-test-user-id': commentUserId,
          'x-trace-id': 'trace-comment-create',
        },
        body: { body: 'This is an audited comment' },
      });

      const commentRes = await addComment(commentReq, {
        params: Promise.resolve({ id: article._id }),
      });
      expect(commentRes.status).toBe(201);
      const { data: comment } = await commentRes.json();

      expect(trackAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          resourceType: 'comment',
          resourceId: comment._id,
          userId: commentUserId,
          status: 'success',
          details: expect.objectContaining({ articleId: article._id }),
        }),
        expect.objectContaining({
          traceId: 'trace-comment-create',
        })
      );

      trackAuditSpy.mockClear();

      // 3. Delete Comment
      const delCommentReq = createRequest(
        `/api/articles/${article._id}/comments/${comment._id}`,
        {
          method: 'DELETE',
          headers: {
            'x-test-user-id': commentUserId,
            'x-trace-id': 'trace-comment-delete',
          },
        }
      );

      const delCommentRes = await deleteComment(delCommentReq, {
        params: Promise.resolve({ id: article._id, commentId: comment._id }),
      });
      expect(delCommentRes.status).toBe(200);

      expect(trackAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          resourceType: 'comment',
          resourceId: comment._id,
          userId: commentUserId,
          status: 'success',
          details: expect.objectContaining({ articleId: article._id }),
        }),
        expect.objectContaining({
          traceId: 'trace-comment-delete',
        })
      );
    });
  });
});
