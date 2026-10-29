import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { PDFDocument, PDFTextField } from 'pdf-lib/cjs';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PdfPlacement, PdfPlacementPreview } from '@/components/lesson/pdf-placement-preview';
import { ErrorBanner, PrimaryButton, ScreenHeader, SelectField, TextField } from '@/components/ui/form-fields';
import { useAuth } from '@/lib/auth';
import { FlatTemplateField, LessonTemplateSummary, listLessonTemplates, saveLessonTemplate } from '@/lib/db';
import { useDraft } from '@/lib/draft';
import { friendlyMessage } from '@/lib/errors';
import { colors, fonts, fontSize, radius, spacing } from '@/lib/theme';
import { GRADE_LEVEL_GROUPS } from '@/lib/types';

const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;

const PLAN_FIELDS = [
  { key: 'lessonTitle', label: 'Lesson title' },
  { key: 'subject', label: 'Subject' },
  { key: 'gradeLevel', label: 'Grade level' },
  { key: 'term', label: 'Term' },
  { key: 'week', label: 'Week' },
  { key: 'learningCompetencies', label: 'Learning competencies' },
  { key: 'teacherName', label: "Teacher's name" },
  { key: 'section', label: 'Section / class' },
  { key: 'planType', label: 'Plan type' },
  { key: 'subjectMatter', label: 'Subject matter' },
  { key: 'objectives', label: 'Learning objectives' },
  { key: 'learningResources', label: 'Learning resources' },
  { key: 'activities', label: 'Activities' },
  { key: 'procedure', label: 'Procedure' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'assignment', label: 'Assignment' },
  { key: 'reflection', label: 'Reflection' },
  { key: 'additionalNotes', label: 'Additional notes' },
  { key: 'ilaw.contentStandard', label: 'ILAW content standard' },
  { key: 'ilaw.performanceStandard', label: 'ILAW performance standard' },
  { key: 'ilaw.preLesson', label: 'ILAW pre-lesson' },
  { key: 'ilaw.flow', label: 'ILAW lesson flow' },
  { key: 'ilaw.integration', label: 'ILAW integration' },
  { key: 'ilaw.extendedLearning', label: 'ILAW ways forward' },
];

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const hasB = index + 1 < bytes.length;
    const hasC = index + 2 < bytes.length;
    const b = hasB ? bytes[index + 1] : 0;
    const c = hasC ? bytes[index + 2] : 0;
    result += alphabet[a >> 2];
    result += alphabet[((a & 3) << 4) | (b >> 4)];
    result += hasB ? alphabet[((b & 15) << 2) | (c >> 6)] : '=';
    result += hasC ? alphabet[c & 63] : '=';
  }
  return result;
}

export default function UploadTemplateScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { resetDraft, setDraft, setTemplateId } = useDraft();
  const [templates, setTemplates] = useState<LessonTemplateSummary[]>([]);
  const [fileName, setFileName] = useState('');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfBase64, setPdfBase64] = useState('');
  const [formFields, setFormFields] = useState<string[]>([]);
  const [formMappings, setFormMappings] = useState<Record<string, string>>({});
  const [formMappingInputs, setFormMappingInputs] = useState<Record<string, string>>({});
  const [flatFields, setFlatFields] = useState<FlatTemplateField[]>([]);
  const [selectedDataKey, setSelectedDataKey] = useState('');
  const [selectedDataInput, setSelectedDataInput] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (profile) setTemplates(await listLessonTemplates(profile.uid));
  }, [profile]);

  useEffect(() => {
    loadTemplates().catch((err: unknown) => {
      setError(friendlyMessage(err, 'load'));
    });
  }, [loadTemplates]);

  function mappingKey(input: string) {
    const normalized = input.trim().toLowerCase();
    return PLAN_FIELDS.find((field) =>
      field.label.toLowerCase() === normalized || field.key.toLowerCase() === normalized
    )?.key ?? '';
  }

  function resetUploadedTemplate() {
    setFileName('');
    setPdfBytes(null);
    setPdfBase64('');
    setFormFields([]);
    setFormMappings({});
    setFormMappingInputs({});
    setFlatFields([]);
    setSelectedDataKey('');
    setSelectedDataInput('');
    setError('');
  }

  async function chooseTemplate() {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_TEMPLATE_BYTES) {
        setError('Choose a PDF smaller than 10 MB.');
        return;
      }

      setIsBusy(true);
      const file = Platform.OS === 'web' ? asset.file : new ExpoFile(asset.uri);
      if (!file) throw new Error('Could not read the selected PDF.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length > MAX_TEMPLATE_BYTES) throw new Error('Choose a PDF smaller than 10 MB.');
      if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') {
        throw new Error('The selected file is not a valid PDF.');
      }
      const pdf = await PDFDocument.load(bytes);
      const textFields = pdf.getForm().getFields()
        .filter((field): field is PDFTextField => field instanceof PDFTextField)
        .map((field) => field.getName());
      setFileName(asset.name);
      setPdfBytes(bytes);
      setPdfBase64(bytesToBase64(bytes));
      setFormFields(textFields);
      setFormMappings({});
      setFormMappingInputs({});
      setFlatFields([]);
      setSelectedDataKey(PLAN_FIELDS[0].key);
      setSelectedDataInput(PLAN_FIELDS[0].label);
      if (textFields.length === 0) {
        setError('This PDF has no fillable text fields. Drag boxes on the preview to mark where lesson-plan content should go.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      resetUploadedTemplate();
      setError(
        /Choose a PDF|not a valid PDF/i.test(message)
          ? message
          : 'Could not open this PDF template. Choose an unencrypted, valid PDF and try again.'
      );
    } finally {
      setIsBusy(false);
    }
  }

  function placeFlatField(placement: PdfPlacement) {
    if (!selectedDataKey) return;
    setFlatFields((current) => [
      ...current.filter((field) => field.dataKey !== selectedDataKey),
      { ...placement, dataKey: selectedDataKey },
    ]);
  }

  async function selectTemplate(id: string) {
    if (!profile) return;
    try { await resetDraft(profile.uid); } catch { setError('Could not preserve your unfinished lesson. Please try again.'); return; }
    setDraft((current) => ({ ...current, gradeLevel: selectedGradeLevel }));
    setTemplateId(id);
    router.push('/create/setup');
  }

  async function saveAndUseTemplate() {
    if (!profile || !pdfBytes) return;
    const hasMappings = formFields.length > 0
      ? Object.values(formMappings).some(Boolean)
      : flatFields.length > 0;
    if (!hasMappings) {
      setError('Map at least one template field before saving.');
      return;
    }
    if (Object.entries(formMappingInputs).some(([field, input]) => input.trim() && !formMappings[field])) {
      setError('Use an exact lesson-plan field label or key for each mapping.');
      return;
    }
    setIsBusy(true);
    setError('');
    try {
      const id = Crypto.randomUUID();
      await saveLessonTemplate({
        id,
        ownerId: profile.uid,
        name: fileName,
        pdfData: pdfBytes,
        formFields,
        formMappings,
        flatFields,
      });
      await loadTemplates();
      await selectTemplate(id);
    } catch (err) {
      setError(friendlyMessage(err, 'save'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Upload Lesson Template" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Upload a PDF template to fill with a lesson plan. Your template and field mapping are saved on this device.</Text>
        <ErrorBanner message={error} />

        <PrimaryButton title={isBusy ? 'Processing PDF…' : 'Choose PDF template'} onPress={chooseTemplate} loading={isBusy} />

        {!!pdfBytes && (
          <View style={styles.mappingCard}>
            <View style={styles.templateHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{fileName}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Remove uploaded PDF template"
                hitSlop={8}
                style={styles.resetButton}
                onPress={resetUploadedTemplate}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <SelectField
              label="Grade Level"
              value={selectedGradeLevel}
              placeholder="Select grade level"
              options={GRADE_LEVEL_GROUPS}
              onSelect={setSelectedGradeLevel}
            />
            {formFields.length > 0 ? (
              <>
                <Text style={styles.description}>Select Grade Level</Text>
                {formFields.map((field) => {
                  const value = PLAN_FIELDS.find((option) => option.key === formMappings[field])?.label ?? '';
                  return (
                    <TextField
                      key={field}
                      label={field}
                      value={formMappingInputs[field] ?? value}
                      placeholder="Type a lesson-plan field label or key"
                      onChangeText={(input) => {
                        setFormMappingInputs((current) => ({ ...current, [field]: input }));
                        setFormMappings((current) => ({ ...current, [field]: mappingKey(input) }));
                      }}
                      optional
                    />
                  );
                })}
              </>
            ) : (
              <>
                <Text style={styles.description}>Type an exact lesson-plan field label or key, then drag a box over its area in the PDF preview. Large text that does not fit will need a larger box or shorter content.</Text>
                <TextField
                  label="Field to place"
                  value={selectedDataInput}
                  placeholder="Type a lesson-plan field label or key"
                  onChangeText={(input) => {
                    setSelectedDataInput(input);
                    setSelectedDataKey(mappingKey(input));
                  }}
                />
                {!!flatFields.length && (
                  <View style={styles.placedList}>
                    {flatFields.map((field) => (
                      <TouchableOpacity
                        key={field.dataKey}
                        style={styles.placedField}
                        onPress={() => setFlatFields((current) => current.filter((entry) => entry.dataKey !== field.dataKey))}
                      >
                        <Text style={styles.placedText}>
                          {PLAN_FIELDS.find((option) => option.key === field.dataKey)?.label} · Page {field.page}
                        </Text>
                        <Ionicons name="close-circle" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <PdfPlacementPreview base64Pdf={pdfBase64} onPlace={placeFlatField} />
                <Text style={styles.description}>PDF preview loads the PDF.js viewer from a public CDN. Your PDF stays on this device.</Text>
              </>
            )}
            <PrimaryButton title="Save mapping and create plan" onPress={saveAndUseTemplate} loading={isBusy} />
          </View>
        )}

        {!!templates.length && (
          <View style={styles.savedSection}>
            <Text style={styles.sectionTitle}>Saved templates</Text>
            {templates.map((template) => (
              <TouchableOpacity key={template.id} style={styles.savedRow} onPress={() => selectTemplate(template.id)}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <Text style={styles.savedName} numberOfLines={1}>{template.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: { color: colors.muted, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
  mappingCard: { marginTop: spacing.lg, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { flex: 1, color: colors.text, fontSize: fontSize.base, fontFamily: fonts.bold },
  resetButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  description: { color: colors.muted, fontStyle: 'italic', fontSize: fontSize.xs, lineHeight: 18, marginBottom: spacing.md },
  placedList: { gap: spacing.xs, marginBottom: spacing.md },
  placedField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primaryLight, borderRadius: radius.sm, padding: spacing.sm },
  placedText: { color: colors.text, fontSize: fontSize.sm, fontFamily: fonts.medium },
  savedSection: { marginTop: spacing.xl },
  sectionTitle: { color: colors.text, fontSize: fontSize.md, fontFamily: fonts.bold, marginBottom: spacing.sm },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  savedName: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontFamily: fonts.medium },
});
