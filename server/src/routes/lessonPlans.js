const express = require('express');
const LessonPlan = require('../models/LessonPlan');

const router = express.Router();

/** POST /api/lesson-plans — upsert (create or update) a plan owned by the caller. */
router.post('/', async (req, res) => {
  try {
    const plan = { ...req.body, ownerId: req.uid };
    if (!plan.id) return res.status(400).json({ error: 'Missing lesson plan id.' });

    await LessonPlan.findOneAndUpdate({ id: plan.id, ownerId: req.uid }, plan, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.json({ ok: true });
  } catch (err) {
    console.error('[lesson-plans] save failed:', err.message);
    res.status(500).json({ error: "We couldn't save this lesson plan to the cloud." });
  }
});

/** GET /api/lesson-plans — every plan owned by the caller. */
router.get('/', async (req, res) => {
  try {
    const plans = await LessonPlan.find({ ownerId: req.uid }).sort({ updatedAt: -1 }).lean();
    res.json(plans);
  } catch (err) {
    console.error('[lesson-plans] list failed:', err.message);
    res.status(500).json({ error: "We couldn't load your lesson plans right now." });
  }
});

/** DELETE /api/lesson-plans/:id */
router.delete('/:id', async (req, res) => {
  try {
    await LessonPlan.deleteOne({ id: req.params.id, ownerId: req.uid });
    res.json({ ok: true });
  } catch (err) {
    console.error('[lesson-plans] delete failed:', err.message);
    res.status(500).json({ error: "We couldn't delete this lesson plan." });
  }
});

module.exports = router;
