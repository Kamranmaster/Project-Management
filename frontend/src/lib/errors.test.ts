import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it, vi } from "vitest";
import { applyApiErrorToForm, parseApiError } from "./errors";

function apiError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  const response = { status, data, statusText: "", headers: {}, config } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, {}, response);
}

describe("parseApiError", () => {
  it("flattens express-validator errors into field errors", () => {
    const parsed = parseApiError(
      apiError(422, {
        success: false,
        message: "Received data is not valid",
        errors: [{ email: "Email is invalid" }, { password: "Password is reqired" }],
      }),
    );

    expect(parsed).toEqual({
      status: 422,
      message: "Received data is not valid",
      fieldErrors: { email: "Email is invalid", password: "Password is reqired" },
    });
  });

  it("hides server messages for 5xx errors", () => {
    const parsed = parseApiError(apiError(500, { message: "MongoServerError: secret detail" }));
    expect(parsed.message).toBe("Something went wrong on our side. Please try again.");
  });

  it("uses a fallback message when the body has none", () => {
    expect(parseApiError(apiError(403, {})).message).toBe("You don't have permission to do that.");
  });

  it("reports network errors without a status", () => {
    const parsed = parseApiError(new AxiosError("Network Error", "ERR_NETWORK"));
    expect(parsed.status).toBeUndefined();
    expect(parsed.message).toMatch(/Can't reach the server/);
  });

  it("handles non-Axios errors", () => {
    expect(parseApiError(new Error("boom")).fieldErrors).toEqual({});
  });
});

describe("applyApiErrorToForm", () => {
  it("puts known field errors on their fields", () => {
    const setError = vi.fn();
    applyApiErrorToForm(apiError(422, { message: "Invalid", errors: [{ email: "Taken" }] }), setError, {
      fields: ["email"],
    });

    expect(setError).toHaveBeenCalledWith("email", { type: "server", message: "Taken" });
    expect(setError).toHaveBeenCalledTimes(1);
  });

  it("routes a status to a chosen field", () => {
    const setError = vi.fn();
    applyApiErrorToForm(apiError(409, { message: "A record with this name already exists" }), setError, {
      fieldForStatus: { 409: "name" },
    });

    expect(setError).toHaveBeenCalledWith("name", {
      type: "server",
      message: "A record with this name already exists",
    });
  });

  it("falls back to a form-level root error", () => {
    const setError = vi.fn();
    applyApiErrorToForm(apiError(400, { message: "Invalid id" }), setError);

    expect(setError).toHaveBeenCalledWith("root.server", { type: "server", message: "Invalid id" });
  });
});
