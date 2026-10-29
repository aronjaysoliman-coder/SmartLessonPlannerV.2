const express = require('express');
const { generateLessonDraft, isValidSection } = require('../services/aiService');

const router = express.Router();

/** POST /api/generate — the mobile app never talks to the AI provider directly. */
router.post('/', async (req, res) => {
  const { planType, gradeLevel, subject, topic, learningCompetencies, objectives, activityTitles, section } = req.body || {};
  if (!planType || !gradeLevel || !subject) {
    return res.status(400).json({ error: 'planType, gradeLevel, and subject are required.' });
  }

  if (section !== undefined && !isValidSection(section, planType)) return res.status(400).json({ error: 'Choose a valid AI section for this lesson plan type.' });
  const controller = new AbortController();
  const onClose = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', onClose);
  try {
    const draft = await generateLessonDraft({
      planType,
      section,
      gradeLevel,
      subject,
      topic: topic || '',
      learningCompetencies: learningCompetencies || '',
      objectives: Array.isArray(objectives) ? objectives : [],
      activityTitles: Array.isArray(activityTitles) ? activityTitles : [],
    }, { signal: controller.signal });
    if (!controller.signal.aborted) res.json(draft);
  } catch (err) {
    if (controller.signal.aborted) return;
    console.error('[generate] failed:', err.message);
    if (err.name === 'APIConnectionTimeoutError') return res.status(504).json({ error: 'AI suggestion took too long. Please try again or write this section manually.' });
    res.status(502).json({ error: "The AI assistant couldn't draft this section right now. Please try again or fill it in manually." });
  } finally {
    res.off('close', onClose);
  }
});

module.exports = router;
