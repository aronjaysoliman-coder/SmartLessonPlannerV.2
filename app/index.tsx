import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors, fontSize, spacing } from '@/lib/theme';

/** Module 1.1 — splash screen with logo, app name, and a short loading process. */
export default function SplashScreen() {
  const { isLoading, user } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 900);
    return () => clearTimeout(t);
  }, []);

  if (isLoading || !minTimeElapsed) {
    return (
      <View style={styles.container}>
        <View style={styles.logoCircle}>
          <Ionicons name="book" size={40} color="#fff" />
        </View>
        <Text style={styles.title}>Smart Lesson Planner</Text>
        <Text style={styles.subtitle}>Plan smarter, teach better.</Text>
        <ActivityIndicator color="#fff" style={{ marginTop: spacing.xl }} />
      </View>
    );
  }

  return <Redirect href={user ? '/(app)/dashboard' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { color: '#fff', fontSize: fontSize.xxl, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.base },
});
