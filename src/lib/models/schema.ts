import { z } from "zod";
import { ObjectId } from "mongodb";

// ObjectId custom validator for MongoDB BSON compatibility
export const ObjectIdSchema = z
  .union([
    z.instanceof(ObjectId),
    z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format"),
  ])
  .transform((val) => (val instanceof ObjectId ? val : new ObjectId(val)));

// Comment Subdocument Schema
export const CommentSchema = z.object({
  _id: ObjectIdSchema.default(() => new ObjectId()),
  body: z
    .string()
    .trim()
    .min(1, "Comment body cannot be blank")
    .max(1000, "Body exceeds 1000 characters"),
  user: ObjectIdSchema,
  createdAt: z.date().default(() => new Date()),
});

// Article Document Schema
export const ArticleSchema = z.object({
  _id: ObjectIdSchema.default(() => new ObjectId()),
  title: z
    .string()
    .trim()
    .min(1, "Article title cannot be blank")
    .max(400, "Title exceeds 400 characters"),
  body: z
    .string()
    .trim()
    .min(1, "Article body cannot be blank")
    .max(1000, "Body exceeds 1000 characters"),
  user: ObjectIdSchema,
  comments: z.array(CommentSchema).default([]),
  tags: z
    .array(z.string().trim())
    .max(10, "Maximum 10 tags allowed")
    .default([]),
  image: z
    .object({
      cdnUri: z.string().optional().default(""),
      files: z.array(z.string()).default([]),
    })
    .default({ cdnUri: "", files: [] }),
  createdAt: z.date().default(() => new Date()),
});

// User Document Schema
export const UserSchema = z.object({
  _id: ObjectIdSchema.default(() => new ObjectId()),
  name: z.string().trim().default(""),
  email: z.string().trim().default(""),
  username: z.string().trim().default(""),
  provider: z
    .enum(["local", "github", "twitter", "google", "linkedin"])
    .default("local"),
  hashed_password: z.string().default(""),
  authToken: z.string().optional().default(""),
  twitter: z.record(z.string(), z.unknown()).optional().default({}),
  github: z.record(z.string(), z.unknown()).optional().default({}),
  google: z.record(z.string(), z.unknown()).optional().default({}),
  linkedin: z.record(z.string(), z.unknown()).optional().default({}),
  createdAt: z.date().default(() => new Date()),
});

// Signup Input Schema
export const UserSignupSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be blank"),
  email: z
    .string()
    .trim()
    .min(1, "Email cannot be blank")
    .email("Invalid email address"),
  username: z.string().trim().optional().default(""),
  password: z.string().min(1, "Password cannot be blank"),
});

// Article Creation / Update Input Schema
export const ArticleInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Article title cannot be blank")
    .max(400, "Title exceeds 400 characters"),
  body: z
    .string()
    .trim()
    .min(1, "Article body cannot be blank")
    .max(1000, "Body exceeds 1000 characters"),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .default([]),
  image: z
    .object({
      cdnUri: z.string().optional().default(""),
      files: z.array(z.string()).default([]),
    })
    .optional()
    .default({ cdnUri: "", files: [] }),
});

// Comment Creation Input Schema
export const CommentInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Comment cannot be blank")
    .max(1000, "Comment cannot exceed 1000 characters"),
});
