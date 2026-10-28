import { Redirect } from 'expo-router';
import React, { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { AuthField, AuthScreen, AuthSubmit } from '@/components/auth/auth-ui';
import { ErrorBanner } from '@/components/ui/form-fields';
import { useAuth } from '@/lib/auth';
import { friendlyMessage } from '@/lib/errors';
import { hasErrors, validateRegistration } from '@/lib/validation';

export default function RegisterScreen() {
  const { register, user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const submitting = useRef(false);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const confirmInput = useRef<TextInput>(null);

  if (user && !isSubmitting && !hasSubmitError) return <Redirect href="/(app)/dashboard" />;

  async function onSubmit() {
    if (submitting.current) return;
    setServerError('');
    setHasSubmitError(false);
    const errors = validateRegistration(fullName, email, password, confirmPassword);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    submitting.current = true;
    setIsSubmitting(true);
    try { await register(fullName.trim(), email.trim(), password); }
    catch (err) { setHasSubmitError(true); setServerError(friendlyMessage(err, 'register')); }
    finally { submitting.current = false; setIsSubmitting(false); }
  }

  return (
    <AuthScreen registration>
      <ErrorBanner message={serverError} />
      <AuthField label="Full name" icon="person-outline" placeholder="Enter your full name" autoCapitalize="words" autoComplete="name" textContentType="name" value={fullName} onChangeText={setFullName} error={fieldErrors.fullName} editable={!isSubmitting} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailInput.current?.focus()} />
      <AuthField ref={emailInput} label="Email address" icon="mail-outline" placeholder="you@school.edu.ph" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" value={email} onChangeText={setEmail} error={fieldErrors.email} editable={!isSubmitting} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordInput.current?.focus()} />
      <AuthField ref={passwordInput} label="Password" icon="lock-closed-outline" placeholder="Create a password" hint="At least 8 characters" secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" value={password} onChangeText={setPassword} error={fieldErrors.password} editable={!isSubmitting} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => confirmInput.current?.focus()} />
      <AuthField ref={confirmInput} label="Confirm password" icon="lock-closed-outline" placeholder="Re-enter your password" secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" value={confirmPassword} onChangeText={setConfirmPassword} error={fieldErrors.confirmPassword} editable={!isSubmitting} returnKeyType="go" onSubmitEditing={onSubmit} />
      <AuthSubmit title="Create Account" loading={isSubmitting} onPress={onSubmit} />
    </AuthScreen>
  );
}
