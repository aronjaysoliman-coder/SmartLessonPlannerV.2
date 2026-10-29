import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';
import { renderClassicPdf } from './pdf-classic-renderer';
import { LessonPlanCore } from './types';

/** Same Classic School layout and pagination as the native export. */
export async function exportLessonPlanPdf(plan: LessonPlanCore): Promise<string> {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  renderClassicPdf(pdf, plan);
  return URL.createObjectURL(pdf.output('blob'));
}

export async function shareLessonPlanPdf(fileUri: string): Promise<void> {
  const link = document.createElement('a');
  link.href = fileUri;
  link.download = 'lesson-plan.pdf';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(fileUri), 1000);
}
