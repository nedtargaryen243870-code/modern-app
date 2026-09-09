import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { getDb } from "../db/mongodb";
import {
  Article,
  User,
  ArticleWithRelations,
  PopulatedComment,
  UserPublic,
} from "./types";

/**
 * Normalizes tags from comma-separated string or array to trimmed string array (max 10).
 */
export function normalizeTags(tags: string | string[] | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((t) => t.trim()).filter(Boolean).slice(0, 10);
  }
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
}

/**
 * Legacy-compatible password hashing using bcrypt with 10 salt rounds.
 */
export function hashPassword(password: string): string {
  if (!password) return "";
  return bcrypt.hashSync(password, 10);
}

/**
 * Validates candidate password against hashed password in database.
 */
export function verifyPassword(password: string, hash: string): boolean {
  if (!password || !hash) return false;
  return bcrypt.compareSync(password, hash);
}

/**
 * Safe ObjectId parsing helper. Returns null if string is invalid hex ObjectId.
 */
export function parseObjectId(id: string | ObjectId | undefined | null): ObjectId | null {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  if (typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)) {
    return new ObjectId(id);
  }
  return null;
}

/**
 * Queries paginated articles with populated author info.
 */
export async function listArticles(options: {
  page?: number;
  limit?: number;
  criteria?: Record<string, unknown>;
} = {}) {
  const db = await getDb();
  const page = Math.max(1, options.page || 1);
  const limit = options.limit || 15;
  const skip = (page - 1) * limit;
  const criteria = options.criteria || {};

  const [articles, total] = await Promise.all([
    db
      .collection("articles")
      .find(criteria)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("articles").countDocuments(criteria),
  ]);

  // Fetch unique user IDs to populate author details
  const userIds = [
    ...new Set(
      articles
        .map((a) => a.user)
        .filter(Boolean)
        .map((u) => (u instanceof ObjectId ? u : parseObjectId(u)))
        .filter((u): u is ObjectId => u !== null)
    ),
  ];

  const users = userIds.length
    ? await db
        .collection("users")
        .find({ _id: { $in: userIds } }, { projection: { name: 1, username: 1, email: 1 } })
        .toArray()
    : [];

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const populatedArticles = articles.map((article) => {
    const authorId = article.user?.toString();
    const author = authorId ? userMap.get(authorId) : null;
    return {
      ...article,
      _id: article._id.toString(),
      user: author
        ? { _id: author._id.toString(), name: author.name, username: author.username, email: author.email }
        : null,
      comments: article.comments || [],
    };
  });

  return {
    articles: populatedArticles,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Loads a single article by ID with populated author and comment authors.
 */
export async function getArticleById(id: string | ObjectId): Promise<ArticleWithRelations | null> {
  const objectId = parseObjectId(id);
  if (!objectId) return null;

  const db = await getDb();
  const article = await db.collection("articles").findOne({ _id: objectId });
  if (!article) return null;

  // Collect user IDs from article author and all comment authors
  const authorId = parseObjectId(article.user);
  const commentUserIds: ObjectId[] = (article.comments || [])
    .map((c: { user?: unknown }) => parseObjectId(c.user as string))
    .filter((u: ObjectId | null): u is ObjectId => u !== null);

  const rawUserIds = [authorId, ...commentUserIds].filter(
    (u: ObjectId | null): u is ObjectId => u !== null
  );
  const allUserIds = [...new Set(rawUserIds.map((id) => id.toString()))].map(
    (id) => new ObjectId(id)
  );

  const users = allUserIds.length
    ? await db
        .collection("users")
        .find({ _id: { $in: allUserIds } }, { projection: { name: 1, username: 1, email: 1 } })
        .toArray()
    : [];

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const author = authorId ? userMap.get(authorId.toString()) : null;

  const populatedComments: PopulatedComment[] = (article.comments || []).map((c: any) => {
    const cuId = parseObjectId(c.user);
    const commentAuthor = cuId ? userMap.get(cuId.toString()) : null;
    return {
      _id: c._id ? c._id.toString() : new ObjectId().toString(),
      body: c.body || "",
      createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      user: commentAuthor
        ? { _id: commentAuthor._id.toString(), name: commentAuthor.name, username: commentAuthor.username }
        : cuId
        ? { _id: cuId.toString(), name: "Anonymous", username: "anonymous" }
        : null,
    };
  });

  return {
    ...article,
    _id: article._id.toString(),
    title: article.title || "",
    body: article.body || "",
    tags: article.tags || [],
    image: article.image || { files: [] },
    createdAt: article.createdAt ? new Date(article.createdAt) : new Date(),
    user: author
      ? { _id: author._id.toString(), name: author.name, username: author.username, email: author.email }
      : authorId
      ? { _id: authorId.toString(), name: "Anonymous", username: "anonymous" }
      : null,
    comments: populatedComments,
  };
}

/**
 * Finds user by ID (stripping hashed_password for public use).
 */
export async function getUserById(id: string | ObjectId): Promise<UserPublic | null> {
  const objectId = parseObjectId(id);
  if (!objectId) return null;

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: objectId }, { projection: { hashed_password: 0 } });

  if (!user) return null;
  return {
    ...user,
    _id: user._id.toString(),
    name: user.name || "",
    email: user.email || "",
    username: user.username || "",
    provider: user.provider || "local",
  } as unknown as UserPublic;
}

/**
 * Finds full user record by email (including hashed_password for authentication).
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  if (!email) return null;
  const db = await getDb();
  const user = await db.collection("users").findOne({ email: email.trim().toLowerCase() });
  return user as unknown as User | null;
}
