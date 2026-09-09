import { z } from "zod";
import {
  UserSchema,
  ArticleSchema,
  CommentSchema,
  UserSignupSchema,
  ArticleInputSchema,
  CommentInputSchema,
} from "./schema";

export type User = z.infer<typeof UserSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type Comment = z.infer<typeof CommentSchema>;

export type UserSignupInput = z.infer<typeof UserSignupSchema>;
export type ArticleInput = z.infer<typeof ArticleInputSchema>;
export type CommentInput = z.infer<typeof CommentInputSchema>;

export interface UserPublic extends Omit<User, "hashed_password" | "_id"> {
  _id: string;
}

export interface PopulatedComment extends Omit<Comment, "user" | "_id"> {
  _id: string;
  user: {
    _id: string;
    name: string;
    username: string;
    email?: string;
  } | null;
}

export interface ArticleWithRelations extends Omit<Article, "user" | "comments" | "_id"> {
  _id: string;
  user: {
    _id: string;
    name: string;
    username: string;
    email?: string;
  } | null;
  comments: PopulatedComment[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  meta?: Record<string, unknown>;
}
