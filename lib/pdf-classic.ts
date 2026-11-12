import type { LessonPlanCore } from './types';
import { TIMES_WIDTHS } from './pdf-times-metrics';

export const CLASSIC_PDF = { width: 595.28, height: 841.89, margin: 42, labelWidth: 126, padding: 9, fontSize: 10.5, lineHeight: 14.5 };
export type ClassicText = { kind: 'text'; x: number; y: number; text: string; size: number; bold?: boolean; italic?: boolean; color?: [number, number, number]; align?: 'left' | 'center' };
export type ClassicPrimitive = ClassicText | { kind: 'rect'; x: number; y: number; width: number; height: number; gray?: number; color?: [number, number, number] } | { kind: 'line'; x: number; y: number; x2: number; y2: number };
export interface ClassicPage { items: ClassicPrimitive[] }
export interface ClassicSection { label: string; content: string }
export function classicPageSize(plan: LessonPlanCore) {
  return plan.planType === 'ILAW' ? { width: CLASSIC_PDF.height, height: CLASSIC_PDF.width } : { width: CLASSIC_PDF.width, height: CLASSIC_PDF.height };
}

function textWidth(text: string, size: number, bold = false): number {
  const widths = TIMES_WIDTHS[bold ? 'bold' : 'normal'];
  return Array.from(text).reduce((sum, character) => sum + (widths[character.codePointAt(0)!] ?? 1000) * size / 1000, 0);
}
/** Wrap paragraphs and long unbroken strings without discarding text. A little
 * extra width is reserved for platform serif-font metric differences. */
export function wrapClassicText(value: string, width: number, size: number, bold = false): string[] {
  const limit = width / 1.08;
  const lines: string[] = [];
  for (const paragraph of String(value ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
    if (!paragraph) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && textWidth(`${line} ${word}`, size, bold) <= limit) { line += ` ${word}`; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const character of word) {
        if (line && textWidth(line + character, size, bold) > limit) { lines.push(line); line = ''; }
        line += character;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [''];
}
function roman(number: number): string {
  const values: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let result = '';
  for (const [value, symbol] of values) while (number >= value) { result += symbol; number -= value; }
  return result;
}
export function classicSections(plan: LessonPlanCore): ClassicSection[] {
  const sections: [string, string | undefined][] = [
    ['Learning Competencies', plan.learningCompetencies],
    ['Learning Objectives', plan.objectives.filter((value) => value.trim()).map((value, index) => `${index + 1}. ${value}`).join('\n')],
    ['Subject Matter', plan.subjectMatter],
    ['Learning Resources', plan.learningResources],
  ];
  if (plan.planType === 'ILAW') sections.push(
    ['Content Standard', plan.ilaw?.contentStandard],
    ['Performance Standard', plan.ilaw?.performanceStandard],
    ['Pre-Lesson', plan.ilaw?.preLesson],
  );
  sections.push(['Classroom Activities', plan.activities.map((activity, index) => [
    `${index + 1}. ${activity.title || 'Untitled activity'}${activity.type ? ` (${activity.type})` : ''}${activity.durationMinutes ? ` - ${activity.durationMinutes} min` : ''}`,
    activity.description,
    activity.materials ? `Materials: ${activity.materials}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')]);
  if (plan.planType === 'ILAW') sections.push(['Flow / Daloy ng Aralin', plan.ilaw?.flow], ['Opportunities for Integration', plan.ilaw?.integration]);
  else sections.push(['Procedure', plan.procedure]);
  sections.push(['Assessment', plan.assessment]);
  if (plan.assignment?.trim()) sections.push(['Assignment', plan.assignment]);
  if (plan.planType === 'ILAW' && plan.ilaw?.extendedLearning?.trim()) sections.push(['Extended Learning / Ways Forward', plan.ilaw.extendedLearning]);
  if (plan.reflection?.trim()) sections.push(['Reflection', plan.reflection]);
  if (plan.additionalNotes?.trim()) sections.push(['Additional Notes', plan.additionalNotes]);
  return sections.map(([label, content], index) => ({ label: `${roman(index + 1)}. ${label}`, content: content?.trim() || 'Not provided.' }));
}

/** Draw commands are shared by the web PDF and the native vector print output. */
export function buildClassicLayout(plan: LessonPlanCore): ClassicPage[] {
  if (plan.planType === 'ILAW') return buildIlawGridLayout(plan);
  const { width, height, margin, labelWidth, padding, fontSize, lineHeight } = CLASSIC_PDF;
  const tableWidth = width - margin * 2;
  const bottom = height - 62;
  const pages: ClassicPage[] = [];
  let items: ClassicPrimitive[] = [];
  let y = margin;
  function addText(text: string, x: number, baseline: number, size: number, bold = false, align: 'left' | 'center' = 'left') {
    items.push({ kind: 'text', text, x, y: baseline, size, bold, align });
  }
  function newPage() {
    items = []; pages.push({ items }); y = margin;
    addText(`${plan.planType === 'ILAW' ? 'ILAW' : plan.planType === 'Semi-Detailed' ? 'SEMI-DETAILED' : 'DETAILED'} LESSON PLAN`, width / 2, y + 11, 12, true, 'center'); y += 27;
    const titleLines = wrapClassicText(plan.lessonTitle || 'Untitled Lesson Plan', tableWidth, 17, true);
    for (const title of titleLines) { addText(title, width / 2, y + 14, 17, true, 'center'); y += 21; }
    y += 12;
    const metadata = [
      ["Teacher:", plan.teacherName || 'Not specified', 'Grade & Section:', [plan.gradeLevel, plan.section].filter(Boolean).join(' - ') || 'Not specified'],
      ['Learning Area:', plan.subject || 'Not specified', 'Term & Week:', [plan.term, plan.week].filter(Boolean).join(' - ') || 'Not specified'],
    ];
    const widths = [78, tableWidth / 2 - 78, 88, tableWidth / 2 - 88];
    for (const row of metadata) {
      const wrapped = row.map((value, index) => wrapClassicText(value, widths[index] - 14, 9.5, index % 2 === 0));
      const rowHeight = Math.max(...wrapped.map((lines) => lines.length)) * 12.5 + 15;
      let x = margin;
      wrapped.forEach((lines, index) => {
        items.push({ kind: 'rect', x, y, width: widths[index], height: rowHeight, gray: index % 2 === 0 ? 240 : undefined });
        lines.forEach((line, lineIndex) => addText(line, x + 7, y + 16 + lineIndex * 12.5, 9.5, index % 2 === 0));
        x += widths[index];
      });
      y += rowHeight;
    }
    y += 18;
    if (y > bottom - 90) throw new Error('The lesson title or class details are too long for the PDF header. Shorten those fields and export again.');
  }
  newPage();
  for (const section of classicSections(plan)) {
    const bodyLines = wrapClassicText(section.content, tableWidth - labelWidth - padding * 2, fontSize);
    let offset = 0;
    while (offset < bodyLines.length) {
      const labelLines = wrapClassicText(section.label + (offset ? ' (continued)' : ''), labelWidth - padding * 2, 10, true);
      const labelHeight = labelLines.length * 13 + padding * 2;
      if (bottom - y < Math.max(labelHeight, lineHeight + padding * 2)) newPage();
      const capacity = Math.floor((bottom - y - padding * 2) / lineHeight);
      if (capacity < 1 || labelHeight > bottom - y) throw new Error('A PDF section label does not fit on the page.');
      let count = Math.min(capacity, bodyLines.length - offset);
      if (bodyLines.length - offset - count === 1 && count > 1) count -= 1;
      const rowHeight = Math.max(labelHeight, count * lineHeight + padding * 2);
      items.push({ kind: 'rect', x: margin, y, width: labelWidth, height: rowHeight, gray: 242 });
      items.push({ kind: 'rect', x: margin + labelWidth, y, width: tableWidth - labelWidth, height: rowHeight });
      labelLines.forEach((line, index) => addText(line, margin + padding, y + padding + 10 + index * 13, 10, true));
      bodyLines.slice(offset, offset + count).forEach((line, index) => addText(line, margin + labelWidth + padding, y + padding + fontSize + index * lineHeight, fontSize));
      y += rowHeight; offset += count;
      if (offset < bodyLines.length) newPage();
    }
  }
  pages.forEach((page, index) => {
    page.items.push({ kind: 'line', x: margin, y: height - 40, x2: width - margin, y2: height - 40 });
    page.items.push({ kind: 'text', x: width / 2, y: height - 25, text: `SmartLessonPlanner | Page ${index + 1} of ${pages.length}`, size: 8, align: 'center' });
  });
  return pages;
}
function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/** Native printing uses vector text/shapes with the same pagination as web. */
export function buildClassicHtml(plan: LessonPlanCore): string {
  const { width, height } = classicPageSize(plan);
  const pages = buildClassicLayout(plan);
  const content = pages.map((page, index) => `<div class="page"><svg xmlns="http://www.w3.org/2000/svg" width="${width}pt" height="${height}pt" viewBox="0 0 ${width} ${height}" role="img"><title>${escapeXml(plan.lessonTitle || 'Lesson plan')} - Page ${index + 1}</title>${page.items.map((item) => {
    if (item.kind === 'text') return `<text x="${item.x}" y="${item.y}" font-size="${item.size}" font-weight="${item.bold ? 'bold' : 'normal'}" font-style="${item.italic ? 'italic' : 'normal'}" style="fill:rgb(${(item.color ?? [17,17,17]).join(',')})" text-anchor="${item.align === 'center' ? 'middle' : 'start'}" xml:space="preserve">${escapeXml(item.text)}</text>`;
    if (item.kind === 'line') return `<line x1="${item.x}" y1="${item.y}" x2="${item.x2}" y2="${item.y2}" stroke="#333" stroke-width="0.5"/>`;
    const gray = item.gray ?? 255;
    return `<rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" fill="rgb(${(item.color ?? [gray,gray,gray]).join(',')})" stroke="#333" stroke-width="0.5"/>`;
  }).join('')}</svg></div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeXml(plan.lessonTitle || 'Lesson plan')}</title><style>@page{size:A4 ${plan.planType === 'ILAW' ? 'landscape' : 'portrait'};margin:0}html,body{margin:0;padding:0;color:#111;font-family:'Times New Roman',Times,serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:${width}pt;height:${height}pt;page-break-after:always;overflow:hidden}.page:last-child{page-break-after:auto}svg{display:block}text{font-family:'Times New Roman',Times,serif;fill:#111}</style></head><body>${content}</body></html>`;
}

/** Landscape two-column ILAW grid, with section bands and continuous page borders. */
function buildIlawGridLayout(plan: LessonPlanCore): ClassicPage[] {
  const { width, height } = classicPageSize(plan);
  const margin = 28, tableWidth = width - margin * 2, labelWidth = 175, pad = 6, lineHeight = 12;
  const bottom = height - 34;
  const pages: ClassicPage[] = [];
  let items: ClassicPrimitive[] = [], y = margin;
  let activeBand: { title: string; guidance: string } | null = null;
  const text = (value: string, x: number, baseline: number, size = 10.5, bold = false, extra: Partial<ClassicText> = {}) => {
    items.push({ kind: 'text', text: value, x, y: baseline, size, bold, ...extra });
  };
  const rect = (x: number, top: number, w: number, h: number, color?: [number, number, number]) => {
    items.push({ kind: 'rect', x, y: top, width: w, height: h, color });
  };
  function band(title: string, guidance: string, continued = false) {
    const heading = wrapClassicText(title + (continued ? ' (continued)' : ''), labelWidth - pad * 2, 11, true);
    const lines = wrapClassicText(guidance, tableWidth - labelWidth - pad * 2, 9);
    const h = Math.max(heading.length, lines.length) * lineHeight + pad * 2;
    rect(margin, y, labelWidth, h, [194, 230, 242]); rect(margin + labelWidth, y, tableWidth - labelWidth, h, [194, 230, 242]);
    heading.forEach((line, index) => text(line, margin + pad, y + pad + 10 + index * lineHeight, 11, true));
    lines.forEach((line, index) => text(line, margin + labelWidth + pad, y + pad + 10 + index * lineHeight, 9));
    y += h;
  }
  function nextPage() {
    items = []; pages.push({ items }); y = margin;
    if (pages.length > 1) {
      rect(margin, y, tableWidth, 22, [24, 61, 91]); text('ILAW LESSON PLAN - continued', width / 2, y + 15, 11, true, { align: 'center', color: [255, 255, 255] }); y += 22;
      if (activeBand) band(activeBand.title, activeBand.guidance, true);
    }
  }
  function row(label: string, guidance: string, content: string, minimumHeight = 0) {
    const labelLines = wrapClassicText(label, labelWidth - pad * 2, 10.5, true);
    const hints = wrapClassicText(guidance, labelWidth - pad * 2, 10);
    const leftLines = [...labelLines, ...hints];
    const rightLines = wrapClassicText(content.trim() || 'Not provided.', tableWidth - labelWidth - pad * 2, 10.5);
    let left = 0, right = 0;
    while (left < leftLines.length || right < rightLines.length) {
      if (bottom - y < lineHeight + pad * 2) nextPage();
      const capacity = Math.floor((bottom - y - pad * 2) / lineHeight);
      const leftCount = Math.min(capacity, leftLines.length - left), rightCount = Math.min(capacity, rightLines.length - right);
      const remainingHeight = Math.max(leftCount, rightCount) * lineHeight + pad * 2;
      const h = Math.max(remainingHeight, Math.min(minimumHeight, bottom - y));
      rect(margin, y, labelWidth, h); rect(margin + labelWidth, y, tableWidth - labelWidth, h);
      leftLines.slice(left, left + leftCount).forEach((line, index) => text(line, margin + pad, y + pad + 10.5 + index * lineHeight, left + index < labelLines.length ? 10.5 : 10, left + index < labelLines.length, { italic: left + index >= labelLines.length }));
      rightLines.slice(right, right + rightCount).forEach((line, index) => text(line, margin + labelWidth + pad, y + pad + 10.5 + index * lineHeight));
      y += h; left += leftCount; right += rightCount;
      if (left < leftLines.length || right < rightLines.length) nextPage();
    }
  }
  function section(title: string, guidance: string) {
    activeBand = null;
    const bandHeight = Math.max(wrapClassicText(title, labelWidth - pad * 2, 11, true).length, wrapClassicText(guidance, tableWidth - labelWidth - pad * 2, 9).length) * lineHeight + pad * 2;
    if (bottom - y < bandHeight + 53) nextPage();
    activeBand = { title, guidance }; band(title, guidance);
  }
  nextPage();
  const logoWidth = 116, headerX = margin + logoWidth, headerWidth = tableWidth - logoWidth;
  const metadata = [
    ['Lesson Title:', plan.lessonTitle || 'Untitled Lesson Plan'],
    ['Learning Area/s:', plan.subject || 'Not specified'],
    ['Name of Teacher:', plan.teacherName || 'Not specified'],
    ['Grade Level and Section:', [plan.gradeLevel, plan.section].filter(Boolean).join(' - ') || 'Not specified'],
    ['Term and Week:', [plan.term, plan.week].filter(Boolean).join(' - ') || 'Not specified'],
    ['References:', plan.learningResources || 'Not provided.'],
  ];
  const headerRows = metadata.map(([label, value]) => wrapClassicText(`${label} ${value}`, headerWidth - pad * 2, 10.5));
  const headerHeight = 22 + headerRows.reduce((sum, lines) => sum + lines.length * lineHeight + 6, 0);
  if (headerHeight > 240) throw new Error('The ILAW header is too long. Shorten the title or references and export again.');
  rect(margin, y, logoWidth, headerHeight);
  text('SCHOOL LOGO', margin + logoWidth / 2, y + headerHeight / 2, 9, false, { align: 'center', color: [110, 110, 110] });
  rect(headerX, y, headerWidth, 22, [24, 61, 91]); text('ILAW LESSON PLAN', headerX + headerWidth / 2, y + 15, 12, true, { align: 'center', color: [255, 255, 255] }); y += 22;
  headerRows.forEach((lines) => { const h = lines.length * lineHeight + 6; rect(headerX, y, headerWidth, h); lines.forEach((line, index) => text(line, headerX + pad, y + 13 + index * lineHeight)); y += h; });
  y += 18;
  section('Intentions', 'Identify the learning competencies, curriculum standards, and objectives for the lesson.');
  row('Learning Competency and Curriculum Standards:', 'State the target competencies and applicable content and performance standards.', [plan.learningCompetencies, `Content Standard: ${plan.ilaw?.contentStandard || 'Not provided.'}`, `Performance Standard: ${plan.ilaw?.performanceStandard || 'Not provided.'}`].filter(Boolean).join('\n\n'));
  row('Learning Objectives:', 'State the knowledge, skills, and tasks learners should demonstrate by the end of the lesson.', plan.objectives.filter((value) => value.trim()).map((value, index) => `${index + 1}. ${value}`).join('\n'));
  row('Subject Matter:', 'Identify the topic and key concepts.', plan.subjectMatter);
  section('Learning Experience', 'Design purposeful activities and interactions that build understanding and support all learners.');
  row('Pre-Lesson:', 'Describe how learners will get ready for the lesson.', plan.ilaw?.preLesson || '');
  row('Flow / Daloy ng Aralin:', 'Describe the sequence of teaching and learning experiences.', plan.ilaw?.flow || '');
  row('Classroom Activities:', 'Include instructions, timing, and materials for each activity.', plan.activities.map((activity, index) => [`${index + 1}. ${activity.title}${activity.type ? ` (${activity.type})` : ''}${activity.durationMinutes ? ` - ${activity.durationMinutes} min` : ''}`, activity.description, activity.materials ? `Materials: ${activity.materials}` : ''].filter(Boolean).join('\n')).join('\n\n'));
  row('Learning Resources:', 'List references, materials, and accessible alternatives.', plan.learningResources);
  row('Opportunities for Integration:', 'Connect the lesson to other learning areas, real-life situations, or technology.', plan.ilaw?.integration || '');
  section('Assessment', 'Gather evidence of learning and provide feedback to guide the next steps.');
  row('Formative Assessment:', 'Describe tasks, questions, criteria, and accommodations that allow learners to demonstrate understanding.', plan.assessment, 88);
  section('Ways Forward', 'Extend learning beyond the classroom and reflect on what learners need next.');
  row('Extended Learning Opportunities:', 'Suggest enrichment, support, or follow-up learning outside class.', [plan.assignment ? `Assignment:\n${plan.assignment}` : '', plan.ilaw?.extendedLearning].filter(Boolean).join('\n\n'));
  row('Reflections:', 'Record what worked and what to adjust after teaching.', plan.reflection || '', 50);
  if (plan.additionalNotes.trim()) row('Additional Notes:', 'Record accommodations and other teaching reminders.', plan.additionalNotes);
  pages.forEach((page, index) => page.items.push({ kind: 'text', x: width / 2, y: height - 17, text: `SmartLessonPlanner | Page ${index + 1} of ${pages.length}`, size: 8, align: 'center' }));
  return pages;
}
