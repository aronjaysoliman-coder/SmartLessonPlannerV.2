import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { forwardRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';

export function AuthScreen({ registration = false, children }: { registration?: boolean; children: React.ReactNode }) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={s.content}>
            <View style={s.brandBlock}>
              <View style={s.logo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Ionicons name="book" size={46} color={colors.primary} /><View style={s.logoBookmark} /></View>
              <Text style={s.brand}>SmartLesson<Text style={s.amberText}>Planner</Text></Text>
            </View>
            <View style={[s.illustration, registration && s.smallIllustration]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={s.halo} />
              <View style={s.notebook}>
                <View style={s.paper}><View style={s.rule} /><View style={s.rule} /><View style={s.rule} /><View style={s.rule} /></View>
                <View style={s.paper}><View style={s.rule} /><View style={s.rule} /><View style={s.rule} /><View style={s.rule} /></View>
                <View style={s.ribbon} />
              </View>
              <View style={s.pencil}><Ionicons name="pencil" size={60} color={colors.accent} /></View>
              <View style={s.spark} /><View style={s.sparkTwo} />
            </View>
            <Text accessibilityRole="header" style={s.headline}>{registration ? 'Great lessons start with you.' : 'Welcome back, Teacher!'}</Text>
            <Text style={s.subtitle}>{registration ? 'Create your account and start planning.' : 'Your next great lesson starts here.'}</Text>
            <View style={s.card}>
              <Text accessibilityRole="header" style={s.formTitle}>{registration ? 'Create your account' : 'Log in to your account'}</Text>
              {children}
              <View style={s.accountLink}>
                <Text style={s.accountHint}>{registration ? 'Already have an account?' : 'New to SmartLessonPlanner?'}</Text>
                <Link href={registration ? '/(auth)/login' : '/(auth)/register'} style={s.link}>{registration ? 'Log In' : 'Create an account'}</Link>
              </View>
            </View>
            <Text style={s.tagline}>Thoughtful lessons. Less preparation.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type AuthFieldProps = TextInputProps & { label: string; icon: keyof typeof Ionicons.glyphMap; error?: string; hint?: string };
export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField({ label, icon, error, hint, secureTextEntry, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputRow, focused && s.inputFocused, !!error && s.inputError]}>
        <Ionicons name={icon} size={21} color={colors.muted} />
        <TextInput {...props} ref={ref} accessibilityLabel={label} style={[s.input, props.style]} placeholderTextColor={colors.muted} secureTextEntry={secureTextEntry && !visible}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }} />
        {secureTextEntry && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} accessibilityState={{ disabled: props.editable === false }} disabled={props.editable === false} onPress={() => setVisible((value) => !value)} style={s.eye}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={23} color={colors.muted} /></TouchableOpacity>}
      </View>
      {!!error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : !!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
});

export function AuthSubmit({ title, loading, onPress }: { title: string; loading: boolean; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} activeOpacity={0.8} style={[s.submit, loading && s.disabled]} onPress={onPress}>{loading && <ActivityIndicator color={colors.primaryDark} />}<Text style={s.submitText}>{loading ? 'Please wait...' : title}</Text></TouchableOpacity>;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#EFF4FF' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  brandBlock: { alignItems: 'center', gap: 6 },
  logo: { width: 56, height: 50, alignItems: 'center', justifyContent: 'center' },
  logoBookmark: { position: 'absolute', width: 8, height: 24, top: 5, right: 11, backgroundColor: colors.accent, borderBottomLeftRadius: 4 },
  brand: { fontFamily: fonts.extraBold, fontSize: 23, letterSpacing: -0.8, color: colors.primary, textAlign: 'center' },
  amberText: { color: '#AD6800' },
  illustration: { height: 164, width: 220, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 10 },
  smallIllustration: { height: 126, marginTop: 10, marginBottom: 6, transform: [{ scale: 0.8 }] },
  halo: { position: 'absolute', width: 145, height: 145, backgroundColor: '#DCE8FC', borderRadius: 75 },
  notebook: { flexDirection: 'row', width: 156, height: 106, backgroundColor: colors.primary, padding: 5, paddingBottom: 10, borderRadius: 9, transform: [{ rotate: '-10deg' }] },
  paper: { flex: 1, backgroundColor: '#FFFCF5', borderRadius: 4, paddingTop: 15, paddingHorizontal: 9, gap: 12, borderWidth: 1, borderColor: '#E5DCCD' },
  rule: { height: 2, backgroundColor: '#C4CEDC', borderRadius: 1 },
  ribbon: { position: 'absolute', width: 10, height: 65, backgroundColor: colors.accent, top: 5, left: 81, borderBottomLeftRadius: 4 },
  pencil: { position: 'absolute', right: 7, bottom: 22, transform: [{ rotate: '-18deg' }] },
  spark: { position: 'absolute', left: 26, top: 12, width: 5, height: 20, borderRadius: 3, backgroundColor: colors.accent, transform: [{ rotate: '-20deg' }] },
  sparkTwo: { position: 'absolute', left: 10, top: 40, width: 19, height: 5, borderRadius: 3, backgroundColor: colors.accent, transform: [{ rotate: '15deg' }] },
  headline: { fontFamily: fonts.extraBold, fontSize: 27, lineHeight: 36, letterSpacing: -0.8, color: colors.primary, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: '#4B5F81', textAlign: 'center', marginTop: 7, marginBottom: 24 },
  card: { padding: 24, backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: '#E8EDF4', shadowColor: '#102449', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 14, elevation: 2 },
  formTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.5, color: colors.primary, marginBottom: 22 },
  field: { marginBottom: 18 },
  label: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primaryDark, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#CCD7EA', borderRadius: 12, paddingLeft: 13, paddingRight: 4, minHeight: 54 },
  inputFocused: { borderColor: colors.primary, backgroundColor: '#FAFCFF' },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, minWidth: 0, paddingVertical: 15, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  eye: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 6, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  error: { marginTop: 6, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.danger },
  submit: { minHeight: 54, backgroundColor: colors.accent, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 14, marginTop: 4 },
  submitText: { fontFamily: fonts.bold, fontSize: 17, color: colors.primaryDark },
  disabled: { opacity: 0.7 },
  accountLink: { alignItems: 'center', marginTop: 22, gap: 5 },
  accountHint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.muted, textAlign: 'center' },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary, paddingVertical: 10, textAlign: 'center' },
  tagline: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: 'center', marginTop: 22 },
});
