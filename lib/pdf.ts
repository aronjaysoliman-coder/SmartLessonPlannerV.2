import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildClassicHtml, CLASSIC_PDF } from './pdf-classic';
import { LessonPlanCore } from './types';

/** Default finished-plan export: Classic School layout on A4 pages. */
export async function exportLessonPlanPdf(plan: LessonPlanCore): Promise<string> {
  const html = buildClassicHtml(plan);
  const { uri } = await Print.printToFileAsync({ html, width: CLASSIC_PDF.width, height: CLASSIC_PDF.height, margins: { top: 0, right: 0, bottom: 0, left: 0 }, base64: false });
  return uri;
}

export async function shareLessonPlanPdf(fileUri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Share Lesson Plan' });
}
