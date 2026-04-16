import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../services/AuthContext';
import {Button, Input} from '../components/UIComponents';
import {colors, typography, spacing, radius} from '../components/theme';

export default function AuthScreen() {
  const {login, register} = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({name: '', email: '', password: ''});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (key, val) => {
    setForm(prev => ({...prev, [key]: val}));
    setErrors(prev => ({...prev, [key]: undefined}));
  };

  const validate = () => {
    const errs = {};
    if (mode === 'register' && !form.name.trim()) {
      errs.name = 'Name is required';
    }
    if (!form.email.includes('@')) {
      errs.email = 'Enter a valid email';
    }
    if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email.trim(), form.password);
      } else {
        await register(form.name.trim(), form.email.trim(), form.password);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = newMode => {
    setMode(newMode);
    setErrors({});
    setForm({name: '', email: '', password: ''});
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>💡</Text>
            <Text style={styles.appName}>FinSense AI</Text>
            <Text style={styles.tagline}>Financial conversation intelligence</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.toggle}>
            {['login', 'register'].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleActive]}
                onPress={() => switchMode(m)}>
                <Text
                  style={[
                    styles.toggleText,
                    mode === m && styles.toggleTextActive,
                  ]}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'register' && (
              <Input
                label="Full Name"
                placeholder="Rahul Sharma"
                value={form.name}
                onChangeText={v => update('name', v)}
                error={errors.name}
                autoCapitalize="words"
              />
            )}
            <Input
              label="Email"
              placeholder="you@example.com"
              value={form.email}
              onChangeText={v => update('email', v)}
              error={errors.email}
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={form.password}
              onChangeText={v => update('password', v)}
              error={errors.password}
              secureTextEntry
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
            <Button
              title={mode === 'login' ? 'Sign In' : 'Create Account'}
              onPress={handleSubmit}
              loading={loading}
              style={{marginTop: spacing.sm}}
            />
          </View>

          {/* Footer switch */}
          <Text style={styles.footer}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text
              style={styles.footerLink}
              onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </Text>
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  flex: {flex: 1},
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },

  // Header
  header: {alignItems: 'center', marginBottom: spacing.xl},
  logo: {fontSize: 60, marginBottom: spacing.sm},
  appName: {...typography.h1, marginBottom: spacing.xs},
  tagline: {...typography.body, color: colors.textSecondary},

  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  toggleActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {...typography.h4, color: colors.textSecondary},
  toggleTextActive: {color: colors.primary},

  // Form
  form: {marginBottom: spacing.lg},

  // Footer
  footer: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLink: {color: colors.primary, fontWeight: '600'},
});
