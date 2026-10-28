const express = require("express");
const User = require("../models/User");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

async function upsertProfile(uid, auth, fullName) {
  const email =
    typeof auth.email === "string" ? auth.email.trim().toLowerCase() : "";
  if (!email)
    throw Object.assign(new Error("Your account must have an email address."), {
      status: 400,
    });
  if (!fullName || fullName.length > 120) {
    throw Object.assign(
      new Error("Full name must be between 1 and 120 characters."),
      { status: 400 },
    );
  }

  const profile = { fullName, email };
  if (typeof auth.picture === "string") profile.photoUrl = auth.picture;

  return User.findOneAndUpdate(
    { uid },
    { $set: profile, $setOnInsert: { uid } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).select("uid fullName email photoUrl role createdAt");
}

/** PUT /api/users/me — create or update the caller's MongoDB profile. */
router.put("/me", async (req, res) => {
  try {
    const fullName =
      typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const user = await upsertProfile(req.uid, req.auth, fullName);
    res.json({ user });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error("[users] profile sync failed:", err.message);
    res.status(500).json({ error: "We couldn't save your account profile." });
  }
});

/** GET /api/users/me — return the caller's persisted profile and role. */
router.get("/me", async (req, res) => {
  try {
    const existing = await User.findOne({ uid: req.uid })
      .select("fullName")
      .lean();
    const email =
      typeof req.auth.email === "string"
        ? req.auth.email.trim().toLowerCase()
        : "";
    const fullName =
      existing?.fullName || req.auth.name || email.split("@")[0] || "Teacher";
    const user = await upsertProfile(req.uid, req.auth, fullName);
    res.json({ user });
  } catch (err) {
    console.error("[users] profile load failed:", err.message);
    res.status(500).json({ error: "We couldn't load your account profile." });
  }
});

/** GET /api/users/admin — list account profiles for administrators. */
router.get("/admin", requireAdmin, async (_req, res) => {
  try {
    const users = await User.find()
      .select("uid fullName email photoUrl role createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ users });
  } catch (err) {
    console.error("[users] admin list failed:", err.message);
    res.status(500).json({ error: "We couldn't load the user list." });
  }
});

/** PATCH /api/users/admin/:uid/role — change another user's role. */
router.patch("/admin/:uid/role", requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ error: "Role must be user or admin." });
  }
  if (req.params.uid === req.uid && role !== "admin") {
    return res
      .status(400)
      .json({ error: "You cannot remove your own admin access." });
  }

  try {
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { $set: { role } },
      { new: true, runValidators: true },
    ).select("uid fullName email photoUrl role createdAt");
    if (!user)
      return res.status(404).json({ error: "That user was not found." });
    res.json({ user });
  } catch (err) {
    console.error("[users] role update failed:", err.message);
    res.status(500).json({ error: "We couldn't update this user's role." });
  }
});

module.exports = router;
