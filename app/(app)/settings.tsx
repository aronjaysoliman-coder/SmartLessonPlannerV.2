import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@/lib/theme';

function BookMark({ large = false }: { large?: boolean }) {
  return (
    <View style={[styles.bookMark, large && styles.bookMarkLarge]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ionicons name="book" size={large ? 46 : 29} color={colors.primary} />
      <View style={[styles.bookAccent, large && styles.bookAccentLarge]} />
    </View>
  );
}

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <BookMark />
            <Text style={styles.brandName}>Smart<Text style={styles.brandAccent}>Lesson</Text>Planner</Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text accessibilityRole="header" style={styles.title}>Settings</Text>
              <Text style={styles.subtitle}>Keep your planning experience connected.</Text>
            </View>
            <View style={styles.heroArtwork} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={styles.spark} />
              <Ionicons name="settings" size={54} color={colors.primaryLight} />
              <View style={styles.smallSpark} />
            </View>
          </View>

          <Text accessibilityRole="header" style={styles.sectionTitle}>Storage & backup</Text>
          <View style={styles.card}>
            <View style={styles.backupHeading}>
              <View style={styles.cloudIcon}>
                <Ionicons name="cloud-upload-outline" size={30} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Cloud backup</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Automatic</Text>
              </View>
            </View>
            <Text style={styles.description}>
              Plans are saved on your device first. When you save a plan, the app also tries to back up a copy to your account online.
            </Text>
          </View>

          <View style={styles.offlineNote}>
            <Ionicons name="shield-checkmark-outline" size={29} color={colors.primary} />
            <View style={styles.noteCopy}>
              <Text style={styles.noteTitle}>Keep planning, even offline.</Text>
              <Text style={styles.noteDescription}>Create and edit lessons saved on this device without an internet connection.</Text>
            </View>
          </View>

          <Text accessibilityRole="header" style={styles.sectionTitle}>About</Text>
          <View style={[styles.card, styles.aboutCard]}>
            <BookMark large />
            <View style={styles.aboutCopy}>
              <Text style={styles.aboutName}>SmartLessonPlanner</Text>
              <Text style={styles.aboutTagline}>Lesson planning made simpler.</Text>
            </View>
          </View>

          <View style={styles.versionBlock}>
            <Text style={styles.versionLabel}>App version</Text>
            <Text style={styles.versionNumber}>{version ?? 'Unavailable'}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 20 },
  brandName: { flexShrink: 1, fontFamily: fonts.extraBold, fontSize: 19, color: colors.primary, letterSpacing: -0.6 },
  brandAccent: { color: '#AD6800' },
  bookMark: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bookMarkLarge: { width: 56, height: 58 },
  bookAccent: { position: 'absolute', width: 5, height: 14, backgroundColor: colors.accent, right: 7, top: 5, borderBottomLeftRadius: 3 },
  bookAccentLarge: { width: 8, height: 23, right: 10, top: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary, borderRadius: 22, padding: 24, marginBottom: 28, overflow: 'hidden' },
  heroCopy: { flex: 1 },
  title: { fontFamily: fonts.extraBold, fontSize: 30, color: '#FFFFFF', letterSpacing: -0.7 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: '#E0E8FA', marginTop: 7 },
  heroArtwork: { width: 60, height: 76, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', width: 5, height: 14, borderRadius: 3, backgroundColor: colors.accent, top: 0, right: 13, transform: [{ rotate: '24deg' }] },
  smallSpark: { position: 'absolute', width: 11, height: 4, borderRadius: 2, backgroundColor: colors.accent, top: 20, right: 0, transform: [{ rotate: '-24deg' }] },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.primary, marginBottom: 14, letterSpacing: -0.4 },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: '#E8EDF4', padding: 20, shadowColor: '#102449', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  backupHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cloudIcon: { width: 34, alignItems: 'center' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.primary, flexGrow: 1 },
  badge: { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.primary },
  description: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.muted, marginTop: 14 },
  offlineNote: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 18, backgroundColor: colors.primaryLight, marginTop: 16, marginBottom: 30 },
  noteCopy: { flex: 1 },
  noteTitle: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 21, color: colors.primary },
  noteDescription: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: '#465B80', marginTop: 5 },
  aboutCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  aboutCopy: { flex: 1 },
  aboutName: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.primary, letterSpacing: -0.5 },
  aboutTagline: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.muted, marginTop: 5 },
  versionBlock: { alignItems: 'center', marginTop: 24, gap: 4 },
  versionLabel: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12 },
  versionNumber: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12 },
});
