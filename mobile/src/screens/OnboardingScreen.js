/**
 * OnboardingScreen.js
 * 
 * First-launch permission and setup onboarding flow.
 * Explains each permission before requesting it.
 * Provides battery optimization guidance for Android reliability.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  requestMicrophonePermission,
  requestNotificationPermission,
  checkPermission,
  AppPermissions,
} from '../services/PermissionService';
import { colors, typography, spacing, radius } from '../components/theme';
import { Button } from '../components/UIComponents';

const STEPS = {
  WELCOME: 'welcome',
  NOTIFICATION: 'notification',
  MICROPHONE: 'microphone',
  PHONE_STATE: 'phone_state',
  BATTERY_OPTIMIZATION: 'battery_optimization',
  COMPLETE: 'complete',
};

/**
 * OnboardingScreen
 * Guides user through permissions and app setup.
 * Each step explains the permission before requesting it.
 */
export default function OnboardingScreen({ navigation, onComplete }) {
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    notifications: null,
    microphone: null,
    phoneState: null,
  });

  // ─── Permission Check ──────────────────────────────────────────────────────
  const checkPermissions = useCallback(async () => {
    try {
      const notif = await checkPermission(AppPermissions.NOTIFICATIONS);
      const mic = await checkPermission(AppPermissions.MICROPHONE);
      // Phone state check only available on Android
      const phoneSt =
        Platform.OS === 'android'
          ? await checkPermission(AppPermissions.PHONE_STATE)
          : null;

      setPermissionStatus({
        notifications: notif,
        microphone: mic,
        phoneState: phoneSt,
      });
    } catch (error) {
      console.warn('[Onboarding] Permission check failed:', error.message);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // ─── Step Handlers ────────────────────────────────────────────────────────

  const handleNotificationPermission = async () => {
    setLoading(true);
    try {
      const granted = await requestNotificationPermission();
      setPermissionStatus(prev => ({ ...prev, notifications: granted }));
      // Auto-advance whether granted or not
      setCurrentStep(STEPS.MICROPHONE);
    } catch (error) {
      console.warn('[Onboarding] Notification permission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrophonePermission = async () => {
    setLoading(true);
    try {
      const granted = await requestMicrophonePermission();
      setPermissionStatus(prev => ({ ...prev, microphone: granted }));
      // Auto-advance whether granted or not
      setCurrentStep(STEPS.PHONE_STATE);
    } catch (error) {
      console.warn('[Onboarding] Microphone permission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneStatePermission = async () => {
    setLoading(true);
    try {
      // Phone state detection is managed by CallDetectionService
      // For now, we'll just move forward
      setCurrentStep(STEPS.BATTERY_OPTIMIZATION);
    } catch (error) {
      console.warn('[Onboarding] Phone state permission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatteryOptimizationDone = async () => {
    setLoading(false);
    setCurrentStep(STEPS.COMPLETE);
  };

  const handleComplete = async () => {
    // Mark onboarding as completed in storage
    try {
      // Will be saved via PermissionService or AuthContext as needed
      if (onComplete) {
        onComplete();
      }
      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      console.warn('[Onboarding] Complete failed:', error);
    }
  };

  const openBatterySettings = () => {
    if (Platform.OS === 'android') {
      Linking.openSettings();
    }
  };

  // ─── Render Steps ──────────────────────────────────────────────────────────

  switch (currentStep) {
    case STEPS.WELCOME:
      return <WelcomeStep onNext={() => setCurrentStep(STEPS.NOTIFICATION)} />;

    case STEPS.NOTIFICATION:
      return (
        <PermissionStep
          title="Notifications for Reminders & Alerts"
          description="FinSense AI will send you notifications when:"
          items={[
            '💬 A phone call ends (to prompt you to record a summary)',
            '⏰ Your AI-extracted reminders are due',
            '✅ A conversation has been processed and is ready to review',
          ]}
          note="We'll never send spam. Just helpful financial reminders."
          buttonText="Enable Notifications"
          onAllow={handleNotificationPermission}
          onSkip={() => setCurrentStep(STEPS.MICROPHONE)}
          loading={loading}
        />
      );

    case STEPS.MICROPHONE:
      return (
        <PermissionStep
          title="Microphone Access for Voice Recording"
          description="FinSense AI needs your microphone to:"
          items={[
            '🎙️ Record your voice summaries of financial discussions',
            '🎤 Transcribe your speech to text with Whisper AI',
            '💾 Save your voice notes securely on your device',
          ]}
          note="Your voice data is processed on-device and never stored on our servers."
          buttonText="Enable Microphone"
          onAllow={handleMicrophonePermission}
          onSkip={() => setCurrentStep(STEPS.PHONE_STATE)}
          loading={loading}
        />
      );

    case STEPS.PHONE_STATE:
      return (
        <PermissionStep
          title="Detect When Calls End"
          description="FinSense AI needs to know when calls end so it can:"
          items={[
            '📱 Detect when you finish a phone call',
            '🔔 Show a prompt asking if that call was about finances',
            '🎙️ Let you quickly record a summary',
          ]}
          note="⚠️ IMPORTANT: This permission allows us to DETECT calls, not record them. Your calls are never recorded by this app. This is an Android-only feature for call detection, similar to how your phone app works."
          buttonText="Enable Phone State Detection"
          onAllow={handlePhoneStatePermission}
          onSkip={() => setCurrentStep(STEPS.BATTERY_OPTIMIZATION)}
          loading={loading}
        />
      );

    case STEPS.BATTERY_OPTIMIZATION:
      return (
        <BatteryOptimizationStep
          onDone={handleBatteryOptimizationDone}
          onOpenSettings={openBatterySettings}
        />
      );

    case STEPS.COMPLETE:
      return (
        <CompleteStep
          permissionStatus={permissionStatus}
          onComplete={handleComplete}
        />
      );

    default:
      return null;
  }
}

// ─── Welcome Step ─────────────────────────────────────────────────────────────
function WelcomeStep({ onNext }) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.welcomeHeader}>
          <Text style={styles.welcomeEmoji}>💰</Text>
          <Text style={styles.welcomeTitle}>Welcome to FinSense AI</Text>
        </View>

        <Text style={styles.welcomeSubtitle}>
          Your intelligent financial memory assistant
        </Text>

        <View style={styles.featureList}>
          <FeatureItem
            emoji="📞"
            title="Call Detection"
            description="Detects when your calls end"
          />
          <FeatureItem
            emoji="🎙️"
            title="Voice Recording"
            description="Record summaries of financial discussions"
          />
          <FeatureItem
            emoji="🤖"
            title="AI Processing"
            description="Extracts financial insights with Gemini AI"
          />
          <FeatureItem
            emoji="⏰"
            title="Smart Reminders"
            description="Schedules reminders for tasks and deadlines"
          />
          <FeatureItem
            emoji="📅"
            title="Financial Timeline"
            description="Keeps track of all your financial conversations"
          />
        </View>

        <Text style={styles.welcomeNote}>
          To work reliably, FinSense AI needs a few permissions.
          Let's set those up now.
        </Text>
      </ScrollView>

      <View style={styles.actionBar}>
        <Button
          title="Continue"
          onPress={onNext}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Feature Item ─────────────────────────────────────────────────────────────
function FeatureItem({ emoji, title, description }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

// ─── Permission Step ──────────────────────────────────────────────────────────
function PermissionStep({
  title,
  description,
  items,
  note,
  buttonText,
  onAllow,
  onSkip,
  loading,
}) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.permissionHeader}>
          <Text style={styles.permissionTitle}>{title}</Text>
          <Text style={styles.permissionDescription}>{description}</Text>
        </View>

        <View style={styles.itemList}>
          {items.map((item, idx) => (
            <Text key={idx} style={styles.itemText}>
              • {item}
            </Text>
          ))}
        </View>

        {note && <Text style={styles.noteText}>{note}</Text>}
      </ScrollView>

      <View style={styles.actionBar}>
        <Button
          title={buttonText}
          onPress={onAllow}
          loading={loading}
          style={styles.button}
        />
        <Button
          title="Not Now"
          onPress={onSkip}
          variant="outline"
          disabled={loading}
          style={styles.buttonSecondary}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Battery Optimization Step ────────────────────────────────────────────────
function BatteryOptimizationStep({ onDone, onOpenSettings }) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.batteryHeader}>
          <Text style={styles.batteryEmoji}>🔋</Text>
          <Text style={styles.batteryTitle}>Battery Optimization</Text>
        </View>

        <Text style={styles.batterySubtitle}>
          For reliable call detection and reminders on Android, please disable battery
          optimization for FinSense AI.
        </Text>

        <View style={styles.batteryGuideSection}>
          <Text style={styles.guideSectionTitle}>📱 For Most Android Devices:</Text>
          <View style={styles.guideSteps}>
            <BatteryStep step={1} text="Go to Settings" />
            <BatteryStep step={2} text="Battery or Battery and device care" />
            <BatteryStep step={3} text="Battery optimization or Optimize battery usage" />
            <BatteryStep step={4} text="Find FinSense AI and select 'Don't optimize'" />
          </View>
        </View>

        <View style={styles.batteryGuideSection}>
          <Text style={styles.guideSectionTitle}>
            🔶 For OnePlus & OPPO Devices:
          </Text>
          <Text style={styles.guideText}>
            1. Go to Settings → Battery → Battery optimization
          </Text>
          <Text style={styles.guideText}>2. Find FinSense AI and select 'Don't optimize'</Text>
          <Text style={styles.guideText}>
            3. Go to Settings → Battery → Auto-launch
          </Text>
          <Text style={styles.guideText}>
            4. Enable "Auto-launch" for FinSense AI
          </Text>
          <Text style={styles.guideText}>
            5. Go to Settings → Battery → Background Activity
          </Text>
          <Text style={styles.guideText}>
            6. Enable "Allow background activity" for FinSense AI
          </Text>
        </View>

        <View style={styles.batteryNote}>
          <Text style={styles.batteryNoteText}>
            💡 Why? Without these settings, Android may kill the app in the background,
            preventing call detection and scheduled reminders.
          </Text>
        </View>

        <View style={styles.acknowledgeBox}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAcknowledged(!acknowledged)}
          >
            <View
              style={[
                styles.checkboxInner,
                acknowledged && styles.checkboxInnerChecked,
              ]}
            >
              {acknowledged && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
          <Text style={styles.acknowledgeText}>
            I've configured battery optimization for FinSense AI
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <Button
          title="Open Settings"
          onPress={onOpenSettings}
          variant="outline"
          style={styles.button}
        />
        <Button
          title={acknowledged ? 'Continue' : 'Skip for Now'}
          onPress={onDone}
          style={styles.buttonSecondary}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Battery Step ─────────────────────────────────────────────────────────────
function BatteryStep({ step, text }) {
  return (
    <View style={styles.batteryStep}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{step}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

// ─── Complete Step ────────────────────────────────────────────────────────────
function CompleteStep({ permissionStatus, onComplete }) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.completeHeader}>
          <Text style={styles.completeEmoji}>🎉</Text>
          <Text style={styles.completeTitle}>You're All Set!</Text>
        </View>

        <Text style={styles.completeSubtitle}>
          FinSense AI is ready to help you track financial conversations.
        </Text>

        <View style={styles.completeSummary}>
          <PermissionSummary
            title="Notifications"
            granted={permissionStatus.notifications}
          />
          <PermissionSummary
            title="Microphone"
            granted={permissionStatus.microphone}
          />
          <PermissionSummary
            title="Phone State Detection"
            granted={permissionStatus.phoneState}
          />
        </View>

        <View style={styles.completeNote}>
          <Text style={styles.completeNoteText}>
            📝 Tip: You can change these permissions anytime in Settings → Apps → FinSense AI
            → Permissions.
          </Text>
        </View>

        <View style={styles.completeQuickStart}>
          <Text style={styles.quickStartTitle}>Quick Start:</Text>
          <Text style={styles.quickStartItem}>
            1️⃣ When a call ends, look for the "Did you discuss finances?" notification
          </Text>
          <Text style={styles.quickStartItem}>
            2️⃣ Tap to record a voice summary
          </Text>
          <Text style={styles.quickStartItem}>
            3️⃣ AI extracts insights and creates reminders for you
          </Text>
          <Text style={styles.quickStartItem}>
            4️⃣ Check your Timeline to see all conversations
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <Button
          title="Start Using FinSense AI"
          onPress={onComplete}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Permission Summary ───────────────────────────────────────────────────────
function PermissionSummary({ title, granted }) {
  const statusIcon = granted === true ? '✅' : granted === false ? '⚠️' : '❓';
  const statusText = granted === true ? 'Enabled' : granted === false ? 'Not enabled' : 'Unknown';

  return (
    <View
      style={[
        styles.summaryItem,
        granted === true && styles.summaryItemGranted,
        granted === false && styles.summaryItemDenied,
      ]}
    >
      <Text style={styles.summaryIcon}>{statusIcon}</Text>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryStatus}>{statusText}</Text>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl + 80,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  button: {
    marginBottom: spacing.xs,
  },
  buttonSecondary: {
    marginBottom: 0,
  },

  // ─── Welcome ──────────────────────────────────────────────────────────────
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  featureList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  featureEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  welcomeNote: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // ─── Permission ────────────────────────────────────────────────────────────
  permissionHeader: {
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  permissionTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.md,
  },
  permissionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  itemList: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  itemText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  noteText: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftColor: colors.primary,
    borderLeftWidth: 4,
  },

  // ─── Battery Optimization ──────────────────────────────────────────────────
  batteryHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  batteryEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  batteryTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  batterySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  batteryGuideSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  guideSectionTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.md,
  },
  guideSteps: {
    gap: spacing.sm,
  },
  batteryStep: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: 'bold',
  },
  stepText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingTop: 2,
  },
  guideText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  batteryNote: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  batteryNoteText: {
    ...typography.caption,
    color: '#92400E',
  },
  acknowledgeBox: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderColor: colors.primary,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 16,
    height: 16,
    borderRadius: radius.xs,
    backgroundColor: 'transparent',
  },
  checkboxInnerChecked: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  acknowledgeText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },

  // ─── Complete ──────────────────────────────────────────────────────────────
  completeHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  completeEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  completeTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  completeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  completeSummary: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftColor: colors.primary,
    borderLeftWidth: 4,
  },
  summaryItemGranted: {
    borderLeftColor: '#10B981',
  },
  summaryItemDenied: {
    borderLeftColor: '#EF4444',
  },
  summaryIcon: {
    fontSize: 24,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryStatus: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  completeNote: {
    backgroundColor: '#DDD6FE',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  completeNoteText: {
    ...typography.caption,
    color: '#4F3FB0',
  },
  completeQuickStart: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickStartTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  quickStartItem: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
});
