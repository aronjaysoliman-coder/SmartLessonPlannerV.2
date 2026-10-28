import { File as ExpoFile, Paths } from 'expo-file-system';
import { PDFDocument, StandardFonts } from 'pdf-lib/cjs';
import { Platform } from 'react-native';
import { FlatTemplateField, LessonTemplate } from './db';
import { LessonPlanCore } from './types';

function planFieldValue(plan: LessonPlanCore, key: string): string {
  if (key.startsWith('ilaw.')) {
    const ilawKey = key.slice('ilaw.'.length) as keyof NonNullable<LessonPlanCore['ilaw']>;
    return plan.ilaw?.[ilawKey] ?? '';
  }
  switch (key) {
    case 'objectives':
      return plan.objectives.filter(Boolean).map((item, index) => `${index + 1}. ${item}`).join('\n');
    case 'activities':
      return plan.activities.map((item) => `${item.title}: ${item.description}`).join('\n');
    default: {
      const value = plan[key as keyof LessonPlanCore];
      return typeof value === 'string' ? value : '';
    }
  }
}

function wrapText(text: string, maxWidth: number, font: Awaited<ReturnType<PDFDocument['embedFont']>>, size: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        if (line) {
          lines.push(line);
          line = '';
        }
        let fragment = '';
        for (const character of word) {
          const candidate = fragment + character;
          if (fragment && font.widthOfTextAtSize(candidate, size) > maxWidth) {
            lines.push(fragment);
            fragment = character;
          } else {
            fragment = candidate;
          }
        }
        line = fragment;
        continue;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawFlatField(
  page: ReturnType<PDFDocument['getPages']>[number],
  field: FlatTemplateField,
  value: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
) {
  if (!value.trim()) return;
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const x = field.x * pageWidth;
  const boxWidth = field.width * pageWidth;
  const boxHeight = field.height * pageHeight;
  let fontSize = 10;
  let lines = wrapText(value, Math.max(boxWidth - 6, 1), font, fontSize);
  while (lines.length > Math.floor(boxHeight / (fontSize * 1.2)) && fontSize > 5) {
    fontSize -= 0.5;
    lines = wrapText(value, Math.max(boxWidth - 6, 1), font, fontSize);
  }
  const maxLines = Math.floor(boxHeight / (fontSize * 1.2));
  if (lines.length > maxLines) {
    throw new Error(`Content mapped to page ${field.page} does not fit its box. Increase the box size or shorten that lesson-plan field.`);
  }
  let y = pageHeight * (1 - field.y) - fontSize - 2;
  for (const line of lines) {
    if (line) page.drawText(line, { x: x + 3, y, size: fontSize, font });
    y -= fontSize * 1.2;
  }
}

export async function createFilledTemplatePdf(
  template: LessonTemplate,
  plan: LessonPlanCore,
): Promise<string> {
  const pdf = await PDFDocument.load(template.pdfData);
  if (template.formFields.length > 0) {
    const form = pdf.getForm();
    for (const [fieldName, dataKey] of Object.entries(template.formMappings)) {
      if (dataKey) form.getTextField(fieldName).setText(planFieldValue(plan, dataKey));
    }
    form.flatten();
  } else {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const pages = pdf.getPages();
    for (const field of template.flatFields) {
      const page = pages[field.page - 1];
      if (!page) throw new Error(`The template mapping refers to missing page ${field.page}.`);
      drawFlatField(page, field, planFieldValue(plan, field.dataKey), font);
    }
  }

  const bytes = await pdf.save();
  const fileName = `${(plan.lessonTitle || 'lesson-plan').replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)}-template.pdf`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return url;
  }

  const output = new ExpoFile(Paths.cache, fileName);
  if (output.exists) output.delete();
  output.create();
  output.write(bytes);
  return output.uri;
}
