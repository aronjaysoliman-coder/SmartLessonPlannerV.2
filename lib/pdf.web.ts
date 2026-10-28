import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';
import { LessonPlanCore } from './types';

export async function exportLessonPlanPdf(plan: LessonPlanCore): Promise<string> {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 44;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lineHeight = 16;
  let y = margin;

  const addText = (text: string, fontSize: number, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text || ' ', pageWidth - margin * 2) as string[];
    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    }
  };

  addText(plan.lessonTitle || 'Untitled Lesson Plan', 19, true);
  addText([plan.planType, plan.gradeLevel, plan.subject, plan.term, plan.week].filter(Boolean).join(' | '), 10);
  addText(`Teacher: ${plan.teacherName || 'N/A'} | Section: ${plan.section || 'N/A'}`, 10);
  y += 8;

  const sections: [string, string][] = [
    ['Learning Competencies', plan.learningCompetencies],
    ['Learning Objectives', plan.objectives.filter((item) => item.trim()).map((item) => `- ${item}`).join('\n')],
    ['Subject Matter', plan.subjectMatter],
    ['Learning Resources', plan.learningResources],
  ];
  if (plan.ilaw) {
    sections.push(
      ['Content Standard', plan.ilaw.contentStandard],
      ['Performance Standard', plan.ilaw.performanceStandard],
      ['Pre-Lesson', plan.ilaw.preLesson],
      ['Flow / Daloy ng Aralin', plan.ilaw.flow],
      ['Opportunities for Integration', plan.ilaw.integration],
      ['Extended Learning Opportunities', plan.ilaw.extendedLearning],
    );
  }
  sections.push([
    'Classroom Activities',
    plan.activities.map((item) => `${item.title} (${item.type})\n${item.description}${item.materials ? `\nMaterials: ${item.materials}` : ''}`).join('\n\n'),
  ]);
  if (plan.planType !== 'ILAW') sections.push(['Procedure', plan.procedure]);
  sections.push(
    ['Assessment', plan.assessment],
    ['Assignment', plan.assignment],
    ['Reflection', plan.reflection],
  );
  if (plan.additionalNotes) sections.push(['Additional Notes', plan.additionalNotes]);

  for (const [title, content] of sections) {
    if (!content.trim()) continue;
    y += 4;
    addText(title.toUpperCase(), 11, true);
    addText(content, 10);
  }

  return URL.createObjectURL(pdf.output('blob'));
}

export async function shareLessonPlanPdf(fileUri: string): Promise<void> {
  const link = document.createElement('a');
  link.href = fileUri;
  link.download = 'lesson-plan.pdf';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(fileUri), 1000);
}