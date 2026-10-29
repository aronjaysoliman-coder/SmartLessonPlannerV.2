import type { jsPDF } from 'jspdf';
import { buildClassicLayout } from './pdf-classic';
import type { LessonPlanCore } from './types';

/** Render the shared Classic School layout using searchable PDF text and lines. */
export function renderClassicPdf(pdf: jsPDF, plan: LessonPlanCore): void {
  const pages = buildClassicLayout(plan);
  pdf.setProperties({ title: plan.lessonTitle || 'Lesson Plan', author: 'SmartLessonPlanner', subject: `${plan.planType} Lesson Plan` });
  pages.forEach((page, index) => {
    if (index) pdf.addPage();
    pdf.setDrawColor(51); pdf.setLineWidth(0.5); pdf.setTextColor(17);
    for (const item of page.items) {
      if (item.kind === 'text') {
        pdf.setFont('times', item.bold ? 'bold' : 'normal'); pdf.setFontSize(item.size);
        pdf.text(item.text, item.x, item.y, { align: item.align ?? 'left' });
      } else if (item.kind === 'line') pdf.line(item.x, item.y, item.x2, item.y2);
      else {
        const gray = item.gray ?? 255;
        pdf.setFillColor(gray, gray, gray);
        pdf.rect(item.x, item.y, item.width, item.height, 'FD');
      }
    }
  });
}
