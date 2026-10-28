import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBanner } from '@/components/ui/form-fields';
import { fetchAdminUsers, ManagedUser, setUserRole } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

export default function AdminScreen() {
  const { isAdmin, profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }
    let active = true;
    fetchAdminUsers()
      .then((result) => {
        if (active) setUsers(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load users.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) return <Redirect href="/(app)/dashboard" />;

  async function changeRole(target: ManagedUser) {
    const role = target.role === 'admin' ? 'user' : 'admin';
    setError('');
    setUpdatingUid(target.uid);
    try {
      const updated = await setUserRole(target.uid, role);
      setUsers((current) => current.map((user) => (user.uid === updated.uid ? updated : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this user.');
    } finally {
      setUpdatingUid('');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>User management</Text>
        <Text style={styles.subtitle}>{users.length} account{users.length === 1 ? '' : 's'}</Text>
        <ErrorBanner message={error} />
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          users.map((managedUser) => (
            <View key={managedUser.uid} style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{managedUser.fullName}</Text>
                <Text style={styles.email}>{managedUser.email}</Text>
                <Text style={styles.role}>{managedUser.role === 'admin' ? 'Administrator' : 'User'}</Text>
              </View>
              {managedUser.uid === profile?.uid ? (
                <Text style={styles.currentUser}>You</Text>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={!!updatingUid}
                  onPress={() => changeRole(managedUser)}
                  style={styles.roleButton}
                >
                  {updatingUid === managedUser.uid ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name={managedUser.role === 'admin' ? 'person-remove-outline' : 'shield-checkmark-outline'}
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.roleButtonText}>
                        {managedUser.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: fontSize.sm, marginTop: spacing.xs, marginBottom: spacing.lg },
  loading: { marginTop: spacing.xl },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: colors.text, fontSize: fontSize.base, fontWeight: '700' },
  email: { color: colors.muted, fontSize: fontSize.sm, marginTop: 2 },
  role: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '600', marginTop: 4 },
  currentUser: { color: colors.muted, fontSize: fontSize.sm },
  roleButton: {
    minHeight: 38,
    maxWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  roleButtonText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '700' },
});