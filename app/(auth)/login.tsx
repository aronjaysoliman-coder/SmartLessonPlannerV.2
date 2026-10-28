import { Redirect } from 'expo-router';
import React, { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { AuthField, AuthScreen, AuthSubmit } from '@/components/auth/auth-ui';
import { ErrorBanner } from '@/components/ui/form-fields';
import { useAuth } from '@/lib/auth';
import { friendlyMessage } from '@/lib/errors';
import { hasErrors, validateLogin } from '@/lib/validation';

export default function LoginScreen() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const passwordInput = useRef<TextInput>(null);

  if (user) return <Redirect href="/(app)/dashboard" />;

  async function onSubmit() {
    if (submitting.current) return;
    setServerError('');
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    submitting.current = true;
    setIsSubmitting(true);
    try { await login(email.trim(), password); }
    catch (err) { setServerError(friendlyMessage(err, 'login')); }
    finally { submitting.current = false; setIsSubmitting(false); }
  }

  return (
    <AuthScreen>
      <ErrorBanner message={serverError} />
      <AuthField label="Email address" icon="mail-outline" placeholder="you@school.edu.ph" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" value={email} onChangeText={setEmail} error={fieldErrors.email} editable={!isSubmitting} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordInput.current?.focus()} />
      <AuthField ref={passwordInput} label="Password" icon="lock-closed-outline" placeholder="Enter your password" secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" value={password} onChangeText={setPassword} error={fieldErrors.password} editable={!isSubmitting} returnKeyType="go" onSubmitEditing={onSubmit} />
      <AuthSubmit title="Log In" loading={isSubmitting} onPress={onSubmit} />
    </AuthScreen>
  );
}
