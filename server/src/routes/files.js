const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const LessonPlan = require('../models/LessonPlan');
const { requireAuth } = require('../middleware/auth');
const { extractLearningCompetencies } = require('../services/aiService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const BUCKET_NAME = 'lessonPlanFiles';

router.post('/extract-competencies', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a curriculum PDF to upload.' });
  if (req.file.buffer.subarray(0, 5).toString() !== '%PDF-') {
    return res.status(400).json({ error: 'The selected file is not a valid PDF.' });
  }

  let parser;
  try {
    parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    const text = result.text.trim();
    if (!text) {
      return res.status(422).json({ error: 'This PDF has no selectable text. Scanned PDFs need OCR and cannot be read yet.' });
    }
    const learningCompetencies = await extractLearningCompetencies({
      text: text.slice(0, 60000),
      gradeLevel: String(req.body?.gradeLevel || '').slice(0, 80),
      subject: String(req.body?.subject || '').slice(0, 120),
    });
    if (!learningCompetencies.trim()) {
      return res.status(422).json({ error: 'No matching learning competencies were found in this PDF.' });
    }
    res.json({ learningCompetencies });
  } catch (err) {
    console.error('[files] competency extraction failed:', err.message);
    res.status(502).json({ error: "Couldn't read competencies from this PDF. Please try again or enter them manually." });
  } finally {
    if (parser) await parser.destroy();
  }
});

function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
}

function canAccess(file, user) {
  return user.role === 'admin' || file.metadata?.ownerUid === user.uid;
}

router.post('/lesson-plans/:planId/pdf', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a PDF file to upload.' });
  if (req.file.mimetype !== 'application/pdf' || req.file.buffer.subarray(0, 5).toString() !== '%PDF-') {
    return res.status(400).json({ error: 'Only valid PDF files can be archived.' });
  }

  try {
    const plan = await LessonPlan.findOne({ id: req.params.planId, ownerId: req.uid }).select('id').lean();
    if (!plan && req.auth.role !== 'admin') return res.status(404).json({ error: 'Lesson plan not found.' });

    const bucket = getBucket();
    const filename = `${new mongoose.Types.ObjectId().toString()}.pdf`;
    const safeOriginalName = req.file.originalname.replace(/[\\/\0]/g, '_').slice(0, 180);
    const stream = bucket.openUploadStream(filename, {
      contentType: 'application/pdf',
      metadata: { ownerUid: req.uid, lessonPlanId: req.params.planId, originalName: safeOriginalName },
    });
    const uploaded = new Promise((resolve, reject) => {
      stream.once('finish', resolve);
      stream.once('error', reject);
    });
    stream.end(req.file.buffer);
    await uploaded;
    res.status(201).json({ id: stream.id.toString(), filename: safeOriginalName });
  } catch (err) {
    console.error('[files] PDF upload failed:', err.message);
    res.status(500).json({ error: "Couldn't archive the PDF in MongoDB." });
  }
});

router.get('/lesson-plans/:planId', requireAuth, async (req, res) => {
  try {
    const filter = { 'metadata.lessonPlanId': req.params.planId };
    if (req.auth.role !== 'admin') filter['metadata.ownerUid'] = req.uid;
    const files = await getBucket().find(filter).toArray();
    res.json({
      files: files.map((file) => ({
        id: file._id.toString(),
        filename: file.metadata.originalName,
        uploadedAt: file.uploadDate,
        size: file.length,
      })),
    });
  } catch (err) {
    console.error('[files] list failed:', err.message);
    res.status(500).json({ error: "Couldn't load archived PDFs." });
  }
});

router.get('/:fileId/download', requireAuth, async (req, res) => {
  let fileId;
  try {
    fileId = new mongoose.Types.ObjectId(req.params.fileId);
  } catch {
    return res.status(400).json({ error: 'Invalid file id.' });
  }

  try {
    const bucket = getBucket();
    const file = (await bucket.find({ _id: fileId }).limit(1).toArray())[0];
    if (!file) return res.status(404).json({ error: 'PDF not found.' });
    if (!canAccess(file, req.auth)) return res.status(403).json({ error: 'You cannot access this PDF.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.metadata.originalName.replace(/["]/g, '')}"`);
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (err) {
    console.error('[files] download failed:', err.message);
    res.status(500).json({ error: "Couldn't download this PDF." });
  }
});

router.delete('/:fileId', requireAuth, async (req, res) => {
  let fileId;
  try {
    fileId = new mongoose.Types.ObjectId(req.params.fileId);
  } catch {
    return res.status(400).json({ error: 'Invalid file id.' });
  }

  try {
    const bucket = getBucket();
    const file = (await bucket.find({ _id: fileId }).limit(1).toArray())[0];
    if (!file) return res.status(404).json({ error: 'PDF not found.' });
    if (!canAccess(file, req.auth)) return res.status(403).json({ error: 'You cannot delete this PDF.' });
    await bucket.delete(fileId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[files] delete failed:', err.message);
    res.status(500).json({ error: "Couldn't delete this PDF." });
  }
});

module.exports = router;