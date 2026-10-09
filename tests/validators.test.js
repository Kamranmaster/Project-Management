import { describe, expect, it, vi } from "vitest";
import { validate } from "../src/middlewares/validator.middleware.js";
import {
  addMembertoProjectorValidator,
  createProjectValidator,
  createTaskValidator,
  userLoginValidator,
  userRegisterValidator,
} from "../src/validators/index.js";
import { ApiError } from "../src/utils/api-error.js";

/** Runs a validator chain against a fake request body, then the validate middleware. */
async function runValidation(chains, body) {
  const req = { body };
  for (const chain of chains) await chain.run(req);
  const next = vi.fn();
  try {
    validate(req, {}, next);
    return { passed: next.mock.calls.length === 1, error: null };
  } catch (error) {
    return { passed: false, error };
  }
}

describe("userRegisterValidator", () => {
  it("accepts a valid registration", async () => {
    const result = await runValidation(userRegisterValidator(), {
      email: "kamran@example.com",
      username: "kamran",
      password: "secret123",
    });
    expect(result.passed).toBe(true);
  });

  it("rejects a bad email, uppercase username and missing password", async () => {
    const { passed, error } = await runValidation(userRegisterValidator(), {
      email: "not-an-email",
      username: "Kamran",
    });

    expect(passed).toBe(false);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(422);
    expect(error.errors).toEqual(
      expect.arrayContaining([
        { email: "Email is invalid" },
        { username: "Username must be in lowercase" },
        { password: "Password is reqired" },
      ]),
    );
  });

  it("rejects usernames shorter than 3 characters", async () => {
    const { error } = await runValidation(userRegisterValidator(), {
      email: "a@b.com",
      username: "ab",
      password: "x",
    });
    expect(error.errors).toContainEqual({
      username: "Username must be at least 3 character long",
    });
  });
});

describe("userLoginValidator", () => {
  it("requires a password", async () => {
    const { error } = await runValidation(userLoginValidator(), { email: "a@b.com" });
    expect(error.errors).toContainEqual({ password: "Password is reqired" });
  });
});

describe("createProjectValidator", () => {
  it("requires a name", async () => {
    expect((await runValidation(createProjectValidator(), { name: "Website" })).passed).toBe(true);
    expect((await runValidation(createProjectValidator(), {})).passed).toBe(false);
  });
});

describe("addMembertoProjectorValidator", () => {
  it("accepts only known roles", async () => {
    const ok = await runValidation(addMembertoProjectorValidator(), {
      email: "a@b.com",
      role: "member",
    });
    const bad = await runValidation(addMembertoProjectorValidator(), {
      email: "a@b.com",
      role: "owner",
    });

    expect(ok.passed).toBe(true);
    expect(bad.error.errors).toContainEqual({ role: "Role is invalid" });
  });
});

describe("createTaskValidator", () => {
  it("rejects a whitespace-only title", async () => {
    const { error } = await runValidation(createTaskValidator(), { title: "   " });
    expect(error.errors).toContainEqual({ title: "Title is required" });
  });
});
