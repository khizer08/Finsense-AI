import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from './theme';

// ─── Button ────────────────────────────────────────────────────────────────
export function Button({ title, onPress, loading, variant = 'primary', disabled, style }) {
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        isOutline && styles.buttonOutline,
        isDanger && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : '#fff'} size="small" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isOutline && styles.buttonTextOutline,
            isDanger && styles.buttonTextDanger,
          ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Input ─────────────────────────────────────────────────────────────────
export function Input({ label, error, style, ...props }) {
  return (
    <View style={[styles.inputWrapper, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        {...props}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
}

// ─── EntityTag ─────────────────────────────────────────────────────────────
export function EntityTag({ type, value, amount }) {
  const tagColors = {
    SIP: colors.tagSIP,
    EMI: colors.tagEMI,
    loan: colors.tagLoan,
    budget: colors.tagBudget,
    deadline: colors.tagDeadline,
    other: colors.tagOther,
  };
  const tc = tagColors[type] || colors.tagOther;
  const label = amount != null ? `${type} ₹${amount.toLocaleString('en-IN')}` : type;
  return (
    <View style={[styles.tag, { backgroundColor: tc.bg }]}>
      <Text style={[styles.tagType, { color: tc.text }]}>{label}</Text>
      {value ? (
        <Text style={[styles.tagValue, { color: tc.text }]} numberOfLines={1}>
          {' · '}{value}
        </Text>
      ) : null}
    </View>
  );
}

// ─── ActionItem ────────────────────────────────────────────────────────────
export function ActionItem({ text, done, onToggle }) {
  return (
    <TouchableOpacity
      style={[styles.actionItem, done && styles.actionItemDone]}
      onPress={onToggle}
      activeOpacity={0.7}
      disabled={!onToggle}>
      <View style={[styles.actionCheckbox, done && styles.actionCheckboxDone]}>
        {done && <Text style={styles.actionCheckmark}>✓</Text>}
      </View>
      <Text
        style={[
          styles.actionText,
          done && styles.actionTextDone,
        ]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── SectionHeader ─────────────────────────────────────────────────────────
export function SectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count != null && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

// ─── LoadingOverlay ────────────────────────────────────────────────────────
export function LoadingOverlay({ message }) {
  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message && <Text style={styles.loadingText}>{message}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Button
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  buttonDanger: { backgroundColor: colors.error },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...typography.h4, color: '#fff' },
  buttonTextOutline: { color: colors.primary },
  buttonTextDanger: { color: '#fff' },

  // Input
  inputWrapper: { marginBottom: spacing.md },
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: spacing.md,
    ...typography.body,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.error },
  inputErrorText: { ...typography.caption, color: colors.error, marginTop: 4 },

  // Tag
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagType: { ...typography.label, fontSize: 11 },
  tagValue: { fontSize: 11, fontWeight: '400', maxWidth: 120 },

  // Action item
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.actionBg,
    borderWidth: 1,
    borderColor: colors.actionBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.actionDot,
    marginTop: 6,
    marginRight: 10,
  },
  actionText: { ...typography.body, color: colors.actionText, flex: 1 },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h4 },
  sectionBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  sectionBadgeText: { ...typography.label, color: colors.primary },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, marginBottom: spacing.sm },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 160,
  },
  loadingText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
