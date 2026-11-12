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
    if (err.code === 'AI_NOT_CONFIGURED') return res.status(503).json({ error: err.message });
    if (err.status === 401 || err.status === 403) return res.status(503).json({ error: 'The AI provider rejected the server credentials. Check NVIDIA_API_KEY and model access in Render.' });
    if (err.status === 404) return res.status(503).json({ error: 'The configured AI model or endpoint is unavailable. Check NVIDIA_MODEL and NVIDIA_BASE_URL in Render.' });
    if (err.status === 429) return res.status(429).json({ error: 'The AI provider usage limit was reached. Please try again later.' });
    if (err.name === 'APIConnectionTimeoutError') return res.status(504).json({ error: 'AI suggestion took too long. Please try again or write this section manually.' });
    res.status(502).json({ error: "The AI assistant couldn't draft this section right now. Please try again or fill it in manually." });
  } finally {
    res.off('close', onClose);
  }
});

module.exports = router;
