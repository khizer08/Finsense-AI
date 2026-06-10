import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import api from '../services/api';
import {
  scheduleConversationReminders,
  showProcessingCompleteNotification,
} from '../services/NotificationService';
import { formatDuration } from '../utils/formatters';
import { colors, typography, spacing, radius, shadows } from '../components/theme';
import { Button } from '../components/UIComponents';

const PHASE = {
  IDLE: 'idle',
  RECORDING: 'recording',
  RECORDED: 'recorded',
  UPLOADING: 'uploading',
};

export default function RecordScreen({ navigation }) {
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [statusMsg, setStatusMsg] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const {
    isRecording,
    elapsedMs,
    recordPath,
    startRecording,
    stopRecording,
    discardRecording,
  } = useAudioRecorder();

  // Keep phase in sync with recorder state
  useEffect(() => {
    if (isRecording) setPhase(PHASE.RECORDING);
  }, [isRecording]);

  // Pulse animation while recording
  useEffect(() => {
    if (phase === PHASE.RECORDING) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      if (pulseLoop.current) pulseLoop.current.stop();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      if (pulseLoop.current) pulseLoop.current.stop();
    };
  }, [phase, pulseAnim]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleMicPress = async () => {
    if (phase === PHASE.IDLE) {
      try {
        await startRecording();
        setPhase(PHASE.RECORDING);
      } catch (err) {
        Alert.alert('Recording Error', err.message);
      }
    } else if (phase === PHASE.RECORDING) {
      try {
        await stopRecording();
        setPhase(PHASE.RECORDED);
      } catch (err) {
        Alert.alert('Error', 'Failed to stop recording: ' + err.message);
        setPhase(PHASE.IDLE);
      }
    }
  };

  const handleUpload = async () => {
    if (!recordPath) {
      Alert.alert('Error', 'No recording found.');
      return;
    }

    setPhase(PHASE.UPLOADING);
    setStatusMsg('Uploading audio…');

    try {
      const referenceDate = new Date().toISOString();
      const timeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const timezoneOffsetMinutes = String(new Date().getTimezoneOffset());
      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'android' ? `file://${recordPath}` : recordPath,
        type: Platform.OS === 'android' ? 'audio/mp4' : 'audio/m4a',
        name: `recording-${Date.now()}.m4a`,
      });
      formData.append('referenceDate', referenceDate);
      formData.append('timeZone', timeZone);
      formData.append('timezoneOffsetMinutes', timezoneOffsetMinutes);

      setStatusMsg('Transcribing with Whisper…');

      const res = await api.post('/api/conversations/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180_000, // 3 min for large recordings
      });

      setStatusMsg('Extracting insights with Gemini…');
      await scheduleConversationReminders(res.data.conversation);

      // Notify user that processing is done
      showProcessingCompleteNotification(res.data.conversation?._id).catch(() => { });

      // Clean up temp file
      RNFS.unlink(recordPath).catch(() => { });

      setPhase(PHASE.IDLE);
      navigation.navigate('Summary', { conversation: res.data.conversation });
    } catch (err) {
      setPhase(PHASE.RECORDED);
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      Alert.alert('Upload Failed', msg);
    }
  };

  const handleDiscard = () => {
    discardRecording();
    setPhase(PHASE.IDLE);
  };

  // ─── Derived ───────────────────────────────────────────────────────────────
  const micDisabled =
    phase === PHASE.RECORDED || phase === PHASE.UPLOADING;

  const micBgColor =
    phase === PHASE.RECORDING
      ? colors.error
      : phase === PHASE.UPLOADING
        ? colors.textTertiary
        : colors.primary;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Record Conversation</Text>
        <Text style={styles.subtitle}>
          Tap to record. Whisper transcribes, Gemini extracts financial insights.
        </Text>

        {/* ── Mic button ── */}
        <View style={styles.buttonArea}>
          {phase === PHASE.RECORDING && (
            <Animated.View
              style={[styles.pulse, { transform: [{ scale: pulseAnim }] }]}
            />
          )}
          <TouchableOpacity
            style={[styles.micBtn, { backgroundColor: micBgColor }]}
            onPress={handleMicPress}
            disabled={micDisabled}
            activeOpacity={0.85}>
            <Text style={styles.micIcon}>
              {phase === PHASE.RECORDING ? '⏹' : '🎙️'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Timer ── */}
        {(phase === PHASE.RECORDING || phase === PHASE.RECORDED) && (
          <Text style={styles.timer}>{formatDuration(elapsedMs)}</Text>
        )}

        {/* ── Status hints ── */}
        {phase === PHASE.IDLE && (
          <Text style={styles.hint}>Tap the mic to start recording</Text>
        )}
        {phase === PHASE.RECORDING && (
          <Text style={[styles.hint, { color: colors.error }]}>
            Recording… tap ⏹ to stop
          </Text>
        )}

        {/* ── Upload in progress ── */}
        {phase === PHASE.UPLOADING && (
          <View style={styles.statusBox}>
            <Text style={styles.statusEmoji}>⚙️</Text>
            <Text style={styles.statusText}>{statusMsg}</Text>
            <Text style={styles.statusSub}>This may take up to 60 seconds</Text>
          </View>
        )}

        {/* ── Post-record actions ── */}
        {phase === PHASE.RECORDED && (
          <View style={styles.actions}>
            <Button
              title="Analyse Recording"
              onPress={handleUpload}
              style={{ marginBottom: spacing.sm }}
            />
            <Button
              title="Discard & Re-record"
              onPress={handleDiscard}
              variant="outline"
            />
          </View>
        )}

        {/* ── Tips ── */}
        {phase === PHASE.IDLE && (
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips for best results</Text>
            {[
              'Speak clearly and at a normal pace',
              'Mention amounts, dates and financial terms explicitly',
              'Works in English and Hindi (mixed is fine)',
              'Quiet background helps Whisper accuracy',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipDot}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },

  title: { ...typography.h2, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  // Mic button
  buttonArea: {
    width: '60%',
    minWidth: 160,
    maxWidth: 240,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
    alignSelf: 'center',
  },
  pulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.error,
    opacity: 0.18,
  },
  micBtn: {
    width: '75%',
    height: '75%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  micIcon: { fontSize: 48 },

  // Timer
  timer: {
    ...typography.h1,
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.md,
  },

  // Hint
  hint: { ...typography.body, color: colors.textSecondary },

  // Status box (uploading)
  statusBox: {
    alignItems: 'center',
    marginVertical: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    width: '100%',
  },
  statusEmoji: { fontSize: 36, marginBottom: spacing.sm },
  statusText: { ...typography.h4, color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' },
  statusSub: { ...typography.bodySmall, color: colors.textSecondary },

  // Actions
  actions: { width: '100%', marginTop: spacing.lg },

  // Tips
  tips: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    ...shadows.sm,
  },
  tipsTitle: { ...typography.h4, marginBottom: spacing.md, color: colors.textSecondary },
  tipRow: { flexDirection: 'row', marginBottom: spacing.sm },
  tipDot: { color: colors.primary, marginRight: spacing.sm, fontSize: 16, lineHeight: 24 },
  tipText: { ...typography.body, color: colors.textSecondary, flex: 1 },
});
