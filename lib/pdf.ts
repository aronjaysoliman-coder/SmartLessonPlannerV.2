import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LessonPlanCore } from './types';

function esc(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

function section(title: string, body: string): string {
  return `<div class="section"><h3>${esc(title)}</h3><div class="body">${body}</div></div>`;
}

function buildHtml(plan: LessonPlanCore): string {
  const activitiesHtml = plan.activities
    .map(
      (a) =>
        `<li><strong>${esc(a.title)}</strong> (${esc(a.type)}${a.durationMinutes ? `, ${a.durationMinutes} min` : ''})<br/>${esc(a.description)}${a.materials ? `<br/><em>Materials: ${esc(a.materials)}</em>` : ''}</li>`
    )
    .join('');

  const objectivesHtml = plan.objectives.filter((o) => o.trim()).map((o) => `<li>${esc(o)}</li>`).join('');

  const ilawExtra = plan.ilaw
    ? section('Content Standard', esc(plan.ilaw.contentStandard)) +
      section('Performance Standard', esc(plan.ilaw.performanceStandard)) +
      section('Pre-Lesson', esc(plan.ilaw.preLesson)) +
      section('Flow / Daloy ng Aralin', esc(plan.ilaw.flow)) +
      section('Opportunities for Integration', esc(plan.ilaw.integration)) +
      section('Extended Learning Opportunities (Ways Forward)', esc(plan.ilaw.extendedLearning))
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color:#111827; padding: 24px; }
    h1 { font-size: 20px; color:#1e3a8a; margin-bottom: 4px; }
    .meta { font-size: 12px; color:#6b7280; margin-bottom: 16px; }
    .badge { display:inline-block; background:#eff6ff; color:#1e3a8a; border:1px solid #bfdbfe; border-radius: 6px; padding: 2px 8px; font-size: 11px; margin-right:6px; }
    .section { margin-bottom: 14px; }
    .section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color:#1e3a8a; border-bottom: 1px solid #dbeafe; padding-bottom: 3px; margin-bottom: 6px; }
    .body, li { font-size: 13px; line-height: 1.6; }
    ul { margin: 0; padding-left: 18px; }
  </style></head><body>
    <h1>${esc(plan.lessonTitle || 'Untitled Lesson Plan')}</h1>
    <div class="meta">
      <span class="badge">${esc(plan.planType)}</span>
      <span class="badge">${esc(plan.gradeLevel)}</span>
      <span class="badge">${esc(plan.subject)}</span>
      ${plan.term ? `<span class="badge">${esc(plan.term)}</span>` : ''}
      ${plan.week ? `<span class="badge">${esc(plan.week)}</span>` : ''}
    </div>
    <div class="meta">Teacher: ${esc(plan.teacherName || 'N/A')} &nbsp;|&nbsp; Section: ${esc(plan.section || 'N/A')}</div>
    ${section('Learning Competencies', esc(plan.learningCompetencies))}
    ${section('Learning Objectives', `<ul>${objectivesHtml}</ul>`)}
    ${section('Subject Matter', esc(plan.subjectMatter))}
    ${section('Learning Resources', esc(plan.learningResources))}
    ${ilawExtra}
    ${section('Classroom Activities', `<ul>${activitiesHtml}</ul>`)}
    ${plan.planType !== 'ILAW' ? section('Procedure', esc(plan.procedure)) : ''}
    ${section('Assessment', esc(plan.assessment))}
    ${section('Assignment', esc(plan.assignment))}
    ${section('Reflection', esc(plan.reflection))}
    ${plan.additionalNotes ? section('Additional Notes', esc(plan.additionalNotes)) : ''}
  </body></html>`;
}

/** Module 6.2 — validates then exports the plan as a PDF file. */
export async function exportLessonPlanPdf(plan: LessonPlanCore): Promise<string> {
  const html = buildHtml(plan);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

/** Module 6.3 — hands the generated PDF to the device's native share sheet. */
export async function shareLessonPlanPdf(fileUri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Share Lesson Plan' });
}
