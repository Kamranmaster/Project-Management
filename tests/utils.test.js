import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/utils/api-error.js";
import { ApiResponse } from "../src/utils/api-response.js";
import { asyncHandler } from "../src/utils/async-handles.js";
import {
  AvailalbeTaskStatus,
  AvailalbeUserRole,
  TaskStutusEnum,
  UserRolesEnum,
} from "../src/utils/constants.js";

describe("ApiError", () => {
  it("stores status code, message and validation errors", () => {
    const errors = [{ email: "Email is invalid" }];
    const error = new ApiError(422, "Received data is not valid", errors);

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe("Received data is not valid");
    expect(error.errors).toEqual(errors);
    expect(error.data).toBeNull();
  });

  it("falls back to a default message", () => {
    const error = new ApiError(500);
    expect(error.message).toBe("Something went wrong");
    expect(error.errors).toEqual([]);
  });

  it("keeps a custom stack when one is given", () => {
    const error = new ApiError(400, "Bad", [], "custom stack");
    expect(error.stack).toBe("custom stack");
  });
});

describe("ApiResponse", () => {
  it("marks responses below 400 as successful", () => {
    const response = new ApiResponse(200, { id: 1 });
    expect(response).toEqual({
      statusCode: 200,
      data: { id: 1 },
      message: "Success",
      success: true,
    });
  });

  it("marks responses of 400 and above as unsuccessful", () => {
    expect(new ApiResponse(404, null, "Not found").success).toBe(false);
  });
});

describe("asyncHandler", () => {
  it("passes rejected promises to next()", async () => {
    const failure = new Error("boom");
    const next = vi.fn();
    await asyncHandler(async () => {
      throw failure;
    })({}, {}, next);

    expect(next).toHaveBeenCalledWith(failure);
  });

  it("does not call next() when the handler succeeds", async () => {
    const next = vi.fn();
    const res = { json: vi.fn() };
    await asyncHandler(async (req, res) => res.json({ ok: true }))({}, res, next);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("constants", () => {
  it("lists every user role", () => {
    expect(AvailalbeUserRole).toEqual(Object.values(UserRolesEnum));
    expect(AvailalbeUserRole).toEqual(["admin", "project_admin", "member"]);
  });

  it("lists every task status", () => {
    expect(AvailalbeTaskStatus).toEqual(Object.values(TaskStutusEnum));
    expect(AvailalbeTaskStatus).toEqual(["todo", "in_progress", "done"]);
  });
});
