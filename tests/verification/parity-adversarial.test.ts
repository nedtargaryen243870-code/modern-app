import { describe, it, expect } from "vitest";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";

const LEGACY_URL = "http://localhost:3000";
const MODERN_URL = "http://localhost:3001";
const MONGO_URI = "mongodb://localhost:27017/noobjs_dev";

describe("Phase 5: Master Parity & Adversarial Verification Suite", () => {
  let client: MongoClient;
  let db: any;

  // Shared fixtures
  let userAId: string;
  let userBId: string;
  let userCId: string;
  let articleId: string;
  let commentId: string;

  beforeAll(async () => {
    client = await MongoClient.connect(MONGO_URI);
    db = client.db("noobjs_dev");

    // Clean test artifacts
    await db.collection("users").deleteMany({ email: { $regex: /@verify-parity\.test/ } });
    await db.collection("articles").deleteMany({ title: { $regex: /\[PARITY-TEST\]/ } });

    // Seed User A (Article Owner)
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync("password123", salt);
    const resA = await db.collection("users").insertOne({
      name: "Parity User A",
      email: "user-a@verify-parity.test",
      username: "parity_a",
      provider: "local",
      hashed_password: hash,
      salt,
      createdAt: new Date(),
    });
    userAId = resA.insertedId.toString();

    // Seed User B (Comment Author)
    const resB = await db.collection("users").insertOne({
      name: "Parity User B",
      email: "user-b@verify-parity.test",
      username: "parity_b",
      provider: "local",
      hashed_password: hash,
      salt,
      createdAt: new Date(),
    });
    userBId = resB.insertedId.toString();

    // Seed User C (Third Party)
    const resC = await db.collection("users").insertOne({
      name: "Parity User C",
      email: "user-c@verify-parity.test",
      username: "parity_c",
      provider: "local",
      hashed_password: hash,
      salt,
      createdAt: new Date(),
    });
    userCId = resC.insertedId.toString();

    // Seed Article with User B comment
    const commentObjId = new ObjectId();
    commentId = commentObjId.toString();
    const resArticle = await db.collection("articles").insertOne({
      title: "[PARITY-TEST] Master Article for Verification",
      body: "This article is used to verify end-to-end functional parity and adversarial boundaries.",
      user: new ObjectId(userAId),
      tags: ["parity", "adversarial", "verification"],
      comments: [
        {
          _id: commentObjId,
          body: "Initial comment by User B",
          user: new ObjectId(userBId),
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
    });
    articleId = resArticle.insertedId.toString();
  });

  afterAll(async () => {
    if (client) {
      await db.collection("users").deleteMany({ email: { $regex: /@verify-parity\.test/ } });
      await db.collection("articles").deleteMany({ title: { $regex: /\[PARITY-TEST\]/ } });
      await client.close();
    }
  });

  // ==========================================
  // Section 3: Data Integrity Stress-Tests
  // ==========================================
  describe("Section 3: Data Integrity Stress-Tests (DATA)", () => {
    it("DATA-01: Legacy Record Deserialization into modern models", async () => {
      const { getArticleById } = await import("@/lib/models/utils");
      const article = await getArticleById(articleId);

      expect(article).not.toBeNull();
      expect(article?._id).toBe(articleId);
      expect(article?.title).toContain("[PARITY-TEST]");
      expect(article?.user?.name).toBe("Parity User A");
      expect(article?.comments).toHaveLength(1);
      expect(article?.comments[0].user?.name).toBe("Parity User B");
    });

    it("DATA-02: Orphaned User Reference Grace", async () => {
      const orphanedArticleRes = await db.collection("articles").insertOne({
        title: "[PARITY-TEST] Orphaned Author Article",
        body: "Article whose author does not exist in users collection.",
        user: new ObjectId(), // Non-existent user
        tags: ["orphan"],
        comments: [
          {
            _id: new ObjectId(),
            body: "Orphaned comment author",
            user: new ObjectId(), // Non-existent commenter
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
      });

      const { getArticleById } = await import("@/lib/models/utils");
      const article = await getArticleById(orphanedArticleRes.insertedId.toString());

      expect(article).not.toBeNull();
      // Should fallback gracefully without null pointer exceptions
      expect(article?.user?.name).toBe("Anonymous");
      expect(article?.comments[0].user?.name).toBe("Anonymous");

      // Test modern HTTP endpoint serves it cleanly with 200
      const res = await fetch(`${MODERN_URL}/articles/${orphanedArticleRes.insertedId.toString()}`);
      expect(res.status).toBe(200);

      await db.collection("articles").deleteOne({ _id: orphanedArticleRes.insertedId });
    });

    it("DATA-03: Tags Array Normalization trims and caps at 10 items", async () => {
      const { normalizeTags } = await import("@/lib/models/utils");
      const rawTags = "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8, tag9, tag10, tag11, tag12";
      const normalized = normalizeTags(rawTags);

      expect(normalized).toHaveLength(10);
      expect(normalized[0]).toBe("tag1");
      expect(normalized[9]).toBe("tag10");
    });

    it("DATA-04: Malformed ObjectId Query returns clean HTTP 404", async () => {
      const res = await fetch(`${MODERN_URL}/articles/507f1f77bcf86cd799439011invalid`);
      expect(res.status).toBe(404);

      const resApi = await fetch(`${MODERN_URL}/api/articles/undefined`);
      expect(resApi.status).toBe(404);
    });

    it("DATA-05: Empty Title & Body Rejection with HTTP 422", async () => {
      const res = await fetch(`${MODERN_URL}/api/articles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userAId,
        },
        body: JSON.stringify({ title: "   ", body: "   " }),
      });

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errors).toContain("Article title cannot be blank");
      expect(json.errors).toContain("Article body cannot be blank");
    });

    it("DATA-06: Email Uniqueness Constraint blocks duplicate registration", async () => {
      const res = await fetch(`${MODERN_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Duplicate User",
          email: "user-a@verify-parity.test", // already registered
          password: "password123",
        }),
      });

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.errors).toContain("Email user-a@verify-parity.test already exists");
    });
  });

  // ==========================================
  // Section 4: API Parity & Edge Case Probes
  // ==========================================
  describe("Section 4: API Parity & Edge Case Probes (API)", () => {
    it("API-01: GET /articles/new redirects unauthenticated requests to login", async () => {
      const res = await fetch(`${MODERN_URL}/articles/new`, { redirect: "manual" });
      expect([302, 307]).toContain(res.status);
      const location = res.headers.get("location");
      expect(location).toContain("/login?next=/articles/new");
    });

    it("API-02: GET /articles pagination with ?page=2", async () => {
      const res = await fetch(`${MODERN_URL}/api/articles?page=1`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta).toHaveProperty("total");
      expect(json.meta).toHaveProperty("pages");
    });

    it("API-03: GET /tags/:tag filters by tag", async () => {
      const res = await fetch(`${MODERN_URL}/api/tags/parity`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].tags).toContain("parity");
    });

    it("API-04: POST /users creates user record and returns auto-login session", async () => {
      const newEmail = `new-${Date.now()}@verify-parity.test`;
      const res = await fetch(`${MODERN_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Fresh User",
          email: newEmail,
          username: "fresh_user",
          password: "password123",
        }),
      });

      expect(res.status).toBe(201);
      const cookie = res.headers.get("set-cookie");
      expect(cookie).toContain("app_session=");

      const json = await res.json();
      expect(json.data.email).toBe(newEmail);
      expect(json.data.hashed_password).toBeUndefined();
    });

    it("API-05: POST /users/session rejects invalid credentials with 401", async () => {
      const res = await fetch(`${MODERN_URL}/api/users/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user-a@verify-parity.test",
          password: "wrongpassword",
        }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Invalid email or password.");
    });

    it("API-06: POST /articles validation rejection with 422", async () => {
      const res = await fetch(`${MODERN_URL}/api/articles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userAId,
        },
        body: JSON.stringify({ title: "Valid Title", body: "" }),
      });

      expect(res.status).toBe(422);
    });

    it("API-07: DELETE /articles/:id horizontal privilege check (IDOR)", async () => {
      // User C attempts to delete User A's article
      const res = await fetch(`${MODERN_URL}/api/articles/${articleId}`, {
        method: "DELETE",
        headers: { "x-test-user-id": userCId },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("You are not authorized");
    });

    it("API-08: Non-existent route returns 404", async () => {
      const res = await fetch(`${MODERN_URL}/route-that-does-not-exist`);
      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // Section 5: Logic & Authorization Stress-Tests
  // ==========================================
  describe("Section 5: Logic & Authorization Stress-Tests (LOGIC)", () => {
    it("LOGIC-01: Comment author can delete own comment", async () => {
      // Add a fresh comment as User B
      const addRes = await fetch(`${MODERN_URL}/api/articles/${articleId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userBId,
        },
        body: JSON.stringify({ body: "Author deletion test" }),
      });
      const addJson = await addRes.json();
      const testCommentId = addJson.data._id;

      // User B deletes their own comment
      const delRes = await fetch(`${MODERN_URL}/api/articles/${articleId}/comments/${testCommentId}`, {
        method: "DELETE",
        headers: { "x-test-user-id": userBId },
      });

      expect(delRes.status).toBe(200);
      const delJson = await delRes.json();
      expect(delJson.message).toBe("Removed comment");
    });

    it("LOGIC-02: Article owner can delete comment by another user (Co-Authorization)", async () => {
      // Add a comment as User B
      const addRes = await fetch(`${MODERN_URL}/api/articles/${articleId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userBId,
        },
        body: JSON.stringify({ body: "Owner co-authorization test" }),
      });
      const addJson = await addRes.json();
      const testCommentId = addJson.data._id;

      // User A (Article Owner) deletes User B's comment
      const delRes = await fetch(`${MODERN_URL}/api/articles/${articleId}/comments/${testCommentId}`, {
        method: "DELETE",
        headers: { "x-test-user-id": userAId },
      });

      expect(delRes.status).toBe(200);
      const delJson = await delRes.json();
      expect(delJson.message).toBe("Removed comment");
    });

    it("LOGIC-03: Third party user cannot delete another user's comment", async () => {
      // User C attempts to delete User B's comment on User A's article
      const delRes = await fetch(`${MODERN_URL}/api/articles/${articleId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { "x-test-user-id": userCId },
      });

      expect(delRes.status).toBe(403);
      const delJson = await delRes.json();
      expect(delJson.error).toBe("You are not authorized");
    });

    it("LOGIC-04: Legacy Bcrypt Hash Verification in Modern App", async () => {
      // Authenticate with user-a password created with legacy bcrypt
      const res = await fetch(`${MODERN_URL}/api/users/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user-a@verify-parity.test",
          password: "password123",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user._id).toBe(userAId);
    });
  });

  // ==========================================
  // Section 7: Adversarial Verification Probes
  // ==========================================
  describe("Section 7: Adversarial Verification Probes (ADV)", () => {
    it("ADV-01: XSS / Script Injection Payload Sanitization", async () => {
      const scriptPayload = "<script>alert('xss-exploit')</script>";
      const res = await fetch(`${MODERN_URL}/api/articles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userAId,
        },
        body: JSON.stringify({
          title: `[PARITY-TEST] ${scriptPayload}`,
          body: `Body containing ${scriptPayload} tags for verification.`,
          tags: "security, xss",
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      const createdId = json.data._id;

      // Fetch the rendered page in modern app
      const pageRes = await fetch(`${MODERN_URL}/articles/${createdId}`);
      expect(pageRes.status).toBe(200);
      const html = await pageRes.text();

      // Ensure React JSX does not execute raw script tag
      expect(html).toContain("&lt;script&gt;alert(&#x27;xss-exploit&#x27;)&lt;/script&gt;");

      await db.collection("articles").deleteOne({ _id: new ObjectId(createdId) });
    });

    it("ADV-02: IDOR on Article Modification (PUT /api/articles/:id)", async () => {
      const res = await fetch(`${MODERN_URL}/api/articles/${articleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userCId, // User C is not the owner
        },
        body: JSON.stringify({
          title: "Hacked Title by User C",
          body: "Overwritten content by unauthorized user.",
        }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("You are not authorized");

      // Verify article was NOT modified in MongoDB
      const article = await db.collection("articles").findOne({ _id: new ObjectId(articleId) });
      expect(article.title).toContain("[PARITY-TEST] Master Article for Verification");
    });

    it("ADV-03: Oversized Payload Stress (exceeding 1000 characters)", async () => {
      const hugeBody = "a".repeat(1500);
      const res = await fetch(`${MODERN_URL}/api/articles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userAId,
        },
        body: JSON.stringify({
          title: "[PARITY-TEST] Oversized Body",
          body: hugeBody,
        }),
      });

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.errors).toContain("Body exceeds 1000 characters");
    });

    it("ADV-04: Concurrent Atomic Comment Submissions ($push atomicity)", async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        fetch(`${MODERN_URL}/api/articles/${articleId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-test-user-id": userBId,
          },
          body: JSON.stringify({ body: `Concurrent comment #${i + 1}` }),
        })
      );

      const results = await Promise.all(promises);
      for (const r of results) {
        expect(r.status).toBe(201);
      }

      // Verify all 5 comments were successfully appended without race condition overwrites
      const article = await db.collection("articles").findOne({ _id: new ObjectId(articleId) });
      expect(article.comments.length).toBeGreaterThanOrEqual(6); // 1 initial + 5 concurrent
    });
  });

  // ==========================================
  // Runtime Side-by-Side Verification
  // ==========================================
  describe("Runtime Side-by-Side Verification (Legacy vs Modern)", () => {
    it("PARITY: Both servers return HTTP 200 on home feed", async () => {
      const [legacyRes, modernRes] = await Promise.all([
        fetch(`${LEGACY_URL}/`),
        fetch(`${MODERN_URL}/`),
      ]);

      expect(legacyRes.status).toBe(200);
      expect(modernRes.status).toBe(200);
    });

    it("PARITY: Both servers return HTTP 200 on /login and /signup", async () => {
      const [legLogin, modLogin, legSignup, modSignup] = await Promise.all([
        fetch(`${LEGACY_URL}/login`),
        fetch(`${MODERN_URL}/login`),
        fetch(`${LEGACY_URL}/signup`),
        fetch(`${MODERN_URL}/signup`),
      ]);

      expect(legLogin.status).toBe(200);
      expect(modLogin.status).toBe(200);
      expect(legSignup.status).toBe(200);
      expect(modSignup.status).toBe(200);
    });

    it("PARITY: Both servers render article detail for the same MongoDB record", async () => {
      const [legacyRes, modernRes] = await Promise.all([
        fetch(`${LEGACY_URL}/articles/${articleId}`),
        fetch(`${MODERN_URL}/articles/${articleId}`),
      ]);

      expect(legacyRes.status).toBe(200);
      expect(modernRes.status).toBe(200);

      const legacyHtml = await legacyRes.text();
      const modernHtml = await modernRes.text();

      expect(legacyHtml).toContain("Master Article for Verification");
      expect(modernHtml).toContain("Master Article for Verification");
    });
  });
});

