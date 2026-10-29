import { useAuth } from '@/lib/auth';
import { Redirect, Stack } from 'expo-router';
import React from 'react';

/** The shared progress header handles step navigation; each Continue action validates the next step. */
export default function CreateLayout() {
  const { user, isLoading } = useAuth();
  if (!isLoading && !user) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
