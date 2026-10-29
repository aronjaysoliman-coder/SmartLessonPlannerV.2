import { colors, fontSize, radius, spacing } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

export function TextField({
  label,
  error,
  optional,
  style,
  secureTextEntry,
  ...props
}: TextInputProps & { label: string; error?: string; optional?: boolean }) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label}{" "}
        {optional ? (
          <Text style={styles.optional}>(optional)</Text>
        ) : (
          <Text style={styles.req}>*</Text>
        )}
      </Text>
      {secureTextEntry ? (
        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              error && styles.inputError,
              style,
            ]}
            placeholderTextColor={colors.muted}
            secureTextEntry={!passwordVisible}
            {...props}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible ? "Hide password" : "Show password"
            }
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.passwordToggle}
            hitSlop={8}
          >
            <Ionicons
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TextInput
          accessibilityLabel={label}
          style={[styles.input, error && styles.inputError, style]}
          placeholderTextColor={colors.muted}
          {...props}
        />
      )}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export function SelectField({
  label,
  value,
  placeholder,
  options,
  onSelect,
  error,
  optional,
  disabled = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[] | { label: string; options: string[] }[];
  onSelect: (v: string) => void;
  error?: string;
  optional?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const grouped = options.length > 0 && typeof options[0] !== "string";
  const flatOptions: { header?: string; value?: string }[] = grouped
    ? (options as { label: string; options: string[] }[]).flatMap((g) => [
        { header: g.label },
        ...g.options.map((o) => ({ value: o })),
      ])
    : (options as string[]).map((o) => ({ value: o }));

  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label}{" "}
        {optional ? (
          <Text style={styles.optional}>(optional)</Text>
        ) : (
          <Text style={styles.req}>*</Text>
        )}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        style={[styles.input, styles.selectBox, error && styles.inputError, disabled && { backgroundColor: colors.border, opacity: 0.65 }]}
        onPress={() => { if (!disabled) setOpen(true); }}
      >
        <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <Modal
        visible={open && !disabled}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={flatOptions}
              keyExtractor={(item, idx) => item.value ?? `h-${idx}`}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) =>
                item.header ? (
                  <Text style={styles.optionHeader}>{item.header}</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => {
                      onSelect(item.value!);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        item.value === value && styles.optionTextSelected,
                      ]}
                    >
                      {item.value}
                    </Text>
                    {item.value === value && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                )
              }
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "solid",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "solid" | "outline" | "ghost";
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        variant === "outline" && styles.btnOutline,
        variant === "ghost" && styles.btnGhost,
        (disabled || loading) && styles.btnDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "solid" ? "#fff" : colors.primary}
        />
      ) : (
        <Text
          style={[styles.btnText, variant !== "solid" && styles.btnTextOutline]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerBtn} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerBtn}>{right}</View>
    </View>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.text,
    marginBottom: 6,
  },
  req: { color: colors.danger },
  optional: { color: colors.muted, fontWeight: "400", textTransform: "none" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.card,
  },
  passwordContainer: { position: "relative" },
  passwordInput: { paddingRight: 44 },
  passwordToggle: {
    position: "absolute",
    right: spacing.sm,
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: fontSize.xs, marginTop: 4 },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: { color: colors.text, fontSize: fontSize.base },
  selectPlaceholder: { color: colors.muted, fontSize: fontSize.base },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  optionHeader: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  optionText: { fontSize: fontSize.base, color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: "700" },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnGhost: { backgroundColor: "transparent" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: fontSize.base },
  btnTextOutline: { color: colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: fontSize.md,
    flex: 1,
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.dangerBg,
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: { color: colors.danger, fontSize: fontSize.sm, flex: 1 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: "center",
  },
});
