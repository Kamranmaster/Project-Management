import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/api-error.js";

import projectRouter from "./routes/project.routes.js";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.use(cookieParser());

//cors configuration,it may take 4 to 5 second to allowed CORS ,be patient!!

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);


//import the routes

import healthCheckRouter from "./routes/healthcheck.routes.js";

import authRouter from "./routes/auth.routes.js";

import taskRouter from "./routes/task.routes.js";

import noteRouter from "./routes/note.routes.js";

app.use("/api/v1/healthcheck",healthCheckRouter);
app.use("/api/v1/auth",authRouter);
app.use("/api/v1/projects",projectRouter);
app.use("/api/v1/tasks",taskRouter);
app.use("/api/v1/notes",noteRouter);

app.get("/", (req, res) => {
  res.send("welcome to basecampy");
});

app.use((err, req, res, next) => {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err.message || "Internal server error";

  // Malformed ObjectId in a route param (e.g. /projects/not-an-id)
  if (err.name === "BSONError" || err.name === "CastError") {
    statusCode = 400;
    message = "Invalid id";
  }

  // Unique index violation, e.g. duplicate project name
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "value";
    statusCode = 409;
    message = `A record with this ${field} already exists`;
  }

  // Upload errors such as LIMIT_FILE_SIZE / LIMIT_UNEXPECTED_FILE
  if (err.name === "MulterError") {
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
  });
});
 
export default app;
