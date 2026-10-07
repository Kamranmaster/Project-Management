import { z } from "zod";

// Client-side rules mirror src/validators/index.js in the backend, plus a
// minimum password length for new passwords (the backend only requires non-empty).
export const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email address");

export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-z0-9._-]+$/, "Use lowercase letters, numbers, dots, dashes or underscores");

export const PASSWORD_MISMATCH = { message: "Passwords don't match", path: ["confirmPassword"] };
