const express = require('express');
const { generateLessonDraft } = require('../services/aiService');

const router = express.Router();

/** POST /api/generate — the mobile app never talks to the AI provider directly. */
router.post('/', async (req, res) => {
  const { planType, gradeLevel, subject, topic, learningCompetencies, objectives, activityTitles } = req.body || {};
  if (!planType || !gradeLevel || !subject) {
    return res.status(400).json({ error: 'planType, gradeLevel, and subject are required.' });
  }

  try {
    const draft = await generateLessonDraft({
      planType,
      gradeLevel,
      subject,
      topic: topic || '',
      learningCompetencies: learningCompetencies || '',
      objectives: Array.isArray(objectives) ? objectives : [],
      activityTitles: Array.isArray(activityTitles) ? activityTitles : [],
    });
    res.json(draft);
  } catch (err) {
    console.error('[generate] failed:', err.message);
    res.status(502).json({ error: "The AI assistant couldn't draft this section right now. Please try again or fill it in manually." });
  }
});

module.exports = router;
