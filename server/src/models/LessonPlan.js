const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    type: String,
    description: String,
    materials: String,
    durationMinutes: Number,
    isSuggested: Boolean,
  },
  { _id: false }
);

const IlawSchema = new mongoose.Schema(
  {
    contentStandard: String,
    performanceStandard: String,
    preLesson: String,
    flow: String,
    integration: String,
    extendedLearning: String,
  },
  { _id: false }
);

const LessonPlanSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    status: { type: String, enum: ['draft', 'completed'], default: 'draft' },

    gradeLevel: String,
    subject: String,
    term: String,
    week: String,
    learningCompetencies: String,
    teacherName: String,
    section: String,
    planType: { type: String, enum: ['ILAW', 'Detailed', 'Semi-Detailed'], default: 'Detailed' },

    lessonTitle: String,
    subjectMatter: String,
    objectives: [String],
    learningResources: String,
    activities: [ActivitySchema],
    procedure: String,
    assessment: String,
    assignment: String,
    reflection: String,
    additionalNotes: String,
    ilaw: IlawSchema,

    category: String,
    folder: String,
    tags: [String],

    createdAt: Number,
    updatedAt: Number,
  },
  { timestamps: false, minimize: false }
);

module.exports = mongoose.model('LessonPlan', LessonPlanSchema);
