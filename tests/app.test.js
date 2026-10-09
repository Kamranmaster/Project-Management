import { describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";

// Every request here is answered before any database query runs,
// so the suite needs no MongoDB connection.

describe("GET /api/v1/healthcheck", () => {
  it("reports that the server is running", async () => {
    const res = await request(app).get("/api/v1/healthcheck");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      statusCode: 200,
      success: true,
      data: { message: "Server is running" },
    });
  });
});

describe("CORS", () => {
  it("allows the configured frontend origin with credentials", async () => {
    const res = await request(app)
      .get("/api/v1/healthcheck")
      .set("Origin", "http://localhost:5173");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not allow unknown origins", async () => {
    const res = await request(app)
      .get("/api/v1/healthcheck")
      .set("Origin", "https://evil.example.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("request validation", () => {
  it("returns 422 with field errors for an invalid registration", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "nope", username: "AB", password: "" });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Received data is not valid");
    expect(res.body.errors).toContainEqual({ email: "Email is invalid" });
  });

  it("returns 422 when forgot-password gets an invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "not-an-email" });

    expect(res.status).toBe(422);
    expect(res.body.errors).toContainEqual({ email: "Email is invalid" });
  });
});

describe("authentication", () => {
  it.each([
    ["post", "/api/v1/auth/current-user"],
    ["post", "/api/v1/auth/logout"],
    ["get", "/api/v1/projects"],
  ])("rejects %s %s without a token", async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Unauthorized request",
      errors: [],
    });
  });

  it("rejects a token signed with the wrong secret", async () => {
    const token = jwt.sign({ _id: "507f1f77bcf86cd799439011" }, "wrong-secret");
    const res = await request(app)
      .get("/api/v1/projects")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid access token");
  });

  it("rejects a malformed token sent as a cookie", async () => {
    const res = await request(app)
      .get("/api/v1/projects")
      .set("Cookie", "accessToken=garbage");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid access token");
  });
});
