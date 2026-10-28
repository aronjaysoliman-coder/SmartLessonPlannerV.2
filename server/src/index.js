require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDb } = require("./db");
const { requireAuth } = require("./middleware/auth");
const lessonPlansRouter = require("./routes/lessonPlans");
const generateRouter = require("./routes/generate");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const filesRouter = require("./routes/files");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/files", filesRouter);
app.use("/api/lesson-plans", requireAuth, lessonPlansRouter);
app.use("/api/generate", requireAuth, generateRouter);
app.use("/api/users", requireAuth, usersRouter);

// Last-resort handler so a crash never leaks a raw stack trace to the app (Module 6.6).
app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res
    .status(500)
    .json({ error: "Something went wrong on the server. Please try again." });
});

const PORT = process.env.PORT || 5000;

connectDb()
  .then(() => {
    app.listen(PORT, () =>
      console.log(
        `[server] Smart Lesson Planner API listening on port ${PORT}`,
      ),
    );
  })
  .catch((err) => {
    console.error("[server] Failed to start:", err.message);
    process.exit(1);
  });
