import { describe, expect, it } from "vitest";
import { emailSchema, newPasswordSchema, usernameSchema } from "./validation";

describe("emailSchema", () => {
  it("trims and accepts a valid email", () => {
    expect(emailSchema.parse("  kamran@example.com ")).toBe("kamran@example.com");
  });

  it("rejects empty and invalid emails", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("requires 8 to 128 characters", () => {
    expect(newPasswordSchema.safeParse("short").success).toBe(false);
    expect(newPasswordSchema.safeParse("longenough").success).toBe(true);
    expect(newPasswordSchema.safeParse("x".repeat(129)).success).toBe(false);
  });
});

describe("usernameSchema", () => {
  it("accepts lowercase letters, numbers, dots, dashes and underscores", () => {
    expect(usernameSchema.safeParse("kamran_ahmed.1-x").success).toBe(true);
  });

  it("rejects uppercase, spaces and names that are too short", () => {
    expect(usernameSchema.safeParse("Kamran").success).toBe(false);
    expect(usernameSchema.safeParse("kam ran").success).toBe(false);
    expect(usernameSchema.safeParse("ka").success).toBe(false);
  });
});
