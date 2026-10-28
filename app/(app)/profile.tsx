import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { colors, fonts, spacing } from '@/lib/theme';

export default function ProfileScreen() {
  const { profile, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const name = profile?.fullName?.trim() || 'Teacher';
  const initials = (profile?.fullName?.trim() || profile?.email?.trim() || 'Teacher')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError('');
    try {
      await logout();
    } catch {
      setError('Sign-out could not be completed. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={styles.bookMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Ionicons name="book" size={29} color={colors.primary} />
              <View style={styles.bookAccent} />
            </View>
            <Text style={styles.brandName}>Smart<Text style={styles.brandAccent}>Lesson</Text>Planner</Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text accessibilityRole="header" style={styles.title}>My Profile</Text>
              <Text style={styles.subtitle}>Your teaching identity, in one place.</Text>
            </View>
            <View style={styles.heroArtwork} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={styles.spark} />
              <Ionicons name="id-card" size={54} color={colors.primaryLight} />
              <View style={styles.smallSpark} />
            </View>
          </View>

          <View style={[styles.card, styles.identityCard]}>
            <View style={styles.avatar} accessibilityLabel={`Initials: ${initials}`}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.name}>{name}</Text>
              {!!profile?.email && <Text selectable style={styles.email}>{profile.email}</Text>}
              <Text style={styles.role}>{isAdmin ? 'Administrator' : 'Teacher'}</Text>
            </View>
          </View>

          <Text accessibilityRole="header" style={styles.sectionTitle}>Teaching information</Text>
          <View style={styles.card}>
            <InfoRow icon="school-outline" label="School" value={profile?.school?.trim() || 'Not set'} />
            <View style={styles.divider} />
            <InfoRow icon="book-outline" label="Grade level taught" value={profile?.gradeLevelTaught?.trim() || 'Not set'} />
          </View>

          <Text accessibilityRole="header" style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} style={styles.actionRow} onPress={() => router.push('/(app)/settings')}>
            <Ionicons name="settings-outline" size={25} color={colors.primary} />
            <Text style={styles.actionText}>Settings</Text>
            <Ionicons name="chevron-forward" size={19} color={colors.muted} />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} style={styles.actionRow} onPress={() => router.push('/(app)/admin')}>
              <Ionicons name="shield-checkmark-outline" size={25} color={colors.primary} />
              <Text style={styles.actionText}>Manage users</Text>
              <Ionicons name="chevron-forward" size={19} color={colors.muted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: signingOut, busy: signingOut }} disabled={signingOut} activeOpacity={0.75} style={[styles.actionRow, styles.signOut, signingOut && styles.disabled]} onPress={onSignOut}>
            <Ionicons name="log-out-outline" size={25} color={colors.danger} />
            <Text style={[styles.actionText, styles.signOutText]}>{signingOut ? 'Signing out...' : 'Sign Out'}</Text>
          </TouchableOpacity>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Text style={styles.footer}>Your profile, connected to your lesson plans.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={29} color={colors.primary} />
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
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
  bookAccent: { position: 'absolute', width: 5, height: 14, backgroundColor: colors.accent, right: 7, top: 5, borderBottomLeftRadius: 3 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary, borderRadius: 22, padding: 24, marginBottom: 20, overflow: 'hidden' },
  heroCopy: { flex: 1 },
  title: { fontFamily: fonts.extraBold, fontSize: 30, color: '#FFFFFF', letterSpacing: -0.7 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: '#E0E8FA', marginTop: 7 },
  heroArtwork: { width: 60, height: 76, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  spark: { position: 'absolute', width: 5, height: 14, borderRadius: 3, backgroundColor: colors.accent, top: 0, right: 13, transform: [{ rotate: '24deg' }] },
  smallSpark: { position: 'absolute', width: 11, height: 4, borderRadius: 2, backgroundColor: colors.accent, top: 17, right: 0, transform: [{ rotate: '-24deg' }] },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: '#E8EDF4', padding: 20, shadowColor: '#102449', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  identityCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18 },
  avatar: { width: 78, height: 78, borderRadius: 39, borderWidth: 3, borderColor: colors.accent, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.extraBold, fontSize: 27, color: colors.primary },
  identityCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 170, gap: 5 },
  name: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 30, color: colors.primary, letterSpacing: -0.5 },
  email: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.muted },
  role: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.primary, marginTop: 26, marginBottom: 14, letterSpacing: -0.4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 4 },
  infoCopy: { flex: 1, gap: 5 },
  infoLabel: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 22, color: colors.primary },
  infoValue: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: '#E8EDF4', padding: 18, minHeight: 60, marginBottom: 12 },
  actionText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 15, color: colors.primary },
  signOut: { backgroundColor: colors.dangerBg, borderColor: '#FECACA' },
  signOutText: { color: colors.danger },
  disabled: { opacity: 0.6 },
  error: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.danger, marginBottom: 12 },
  footer: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: 'center', marginTop: 6, paddingHorizontal: 12 },
});
