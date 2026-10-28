/**
 * Standalone smoke test for the AI drafting service.
 *
 * Run from the server/ folder:
 *   node test-ai.js
 *
 * It loads server/.env, sends one sample payload through the same
 * generateLessonDraft() the /api/generate route uses, and prints the result.
 * Handy for checking NVIDIA_API_KEY / NVIDIA_MODEL without starting the app.
 */
require('dotenv').config();
const { generateLessonDraft } = require('./src/services/aiService');

const samplePayload = {
  planType: 'Semi-Detailed',
  gradeLevel: 'Grade 7',
  subject: 'Science',
  topic: 'Photosynthesis',
  learningCompetencies: 'Describe the process of photosynthesis and its importance to life.',
  objectives: [
    'Identify the raw materials and products of photosynthesis.',
    'Explain why photosynthesis is important to living things.',
  ],
  activityTitles: ['Picture Analysis', 'Think-Pair-Share', 'Concept Mapping'],
};

(async () => {
  console.log('[test-ai] Model:', process.env.NVIDIA_MODEL || 'meta/muse-glimmer-30b');
  console.log('[test-ai] Sending sample request to the AI service...\n');

  try {
    const draft = await generateLessonDraft(samplePayload);
    console.log('[test-ai] Success. Draft returned:\n');
    console.log(JSON.stringify(draft, null, 2));
  } catch (err) {
    console.error('[test-ai] Failed:', err.message);
    process.exit(1);
  }
})();
