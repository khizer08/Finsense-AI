import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import api from '../services/api';
import {
  EntityTag,
  ActionItem,
  SectionHeader,
  Card,
} from '../components/UIComponents';
import {formatFullDate, formatRecordingLength} from '../utils/formatters';
import {colors, typography, spacing, radius} from '../components/theme';

export default function SummaryScreen({route, navigation}) {
  const {conversation: passedConversation, conversationId} =
    route.params || {};

  const [conversation, setConversation] = useState(
    passedConversation || null,
  );
  const [loading, setLoading] = useState(!passedConversation);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  useEffect(() => {
    if (!passedConversation && conversationId) {
      fetchConversation(conversationId);
    }
  }, [conversationId]);

  const fetchConversation = async id => {
    try {
      const res = await api.get(`/api/conversations/${id}`);
      setConversation(res.data.conversation);
    } catch {
      Alert.alert('Error', 'Failed to load conversation');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading insights…</Text>
      </View>
    );
  }

  if (!conversation) return null;

  const transcriptLong = (conversation.transcript?.length || 0) > 300;

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Nav bar ── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Conversation Summary
        </Text>
        <View style={{width: 44}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Date & meta ── */}
        <Text style={styles.date}>
          {formatFullDate(conversation.createdAt)}
        </Text>
        {conversation.duration > 0 && (
          <Text style={styles.meta}>
            🕐 {formatRecordingLength(conversation.duration)}
            {'  '}·{'  '}
            🌐 {(conversation.language || 'unknown').toUpperCase()}
          </Text>
        )}

        {/* ── Summary ── */}
        <Card style={styles.summaryCard}>
          <SectionHeader title="Summary" />
          <Text style={styles.summaryText}>
            {conversation.summary || 'No summary available.'}
          </Text>
        </Card>

        {/* ── Action items ── */}
        {conversation.actionItems?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Action Items"
              count={conversation.actionItems.length}
            />
            {conversation.actionItems.map((item, i) => (
              <ActionItem key={i} text={item} />
            ))}
          </View>
        )}

        {/* ── Financial entities ── */}
        {conversation.entities?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Financial Entities"
              count={conversation.entities.length}
            />
            <Card>
              {conversation.entities.map((e, i) => (
                <View
                  key={i}
                  style={[
                    styles.entityRow,
                    i < conversation.entities.length - 1 &&
                      styles.entityDivider,
                  ]}>
                  <EntityTag type={e.type} value="" amount={e.amount} />
                  <Text style={styles.entityValue} numberOfLines={2}>
                    {e.value}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* ── Keywords ── */}
        {conversation.keywords?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Keywords" />
            <View style={styles.keywordsRow}>
              {conversation.keywords.map((k, i) => (
                <View key={i} style={styles.keyword}>
                  <Text style={styles.keywordText}>{k}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Transcript ── */}
        <View style={styles.section}>
          <SectionHeader title="Transcript" />
          <Card>
            <Text
              style={styles.transcriptText}
              numberOfLines={showFullTranscript ? undefined : 6}>
              {conversation.transcript || 'No transcript available.'}
            </Text>
            {transcriptLong && (
              <TouchableOpacity
                style={styles.expandBtn}
                onPress={() => setShowFullTranscript(v => !v)}>
                <Text style={styles.expandBtnText}>
                  {showFullTranscript ? '▲ Show less' : '▼ Show full transcript'}
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        <View style={{height: spacing.xxl}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {...typography.body, color: colors.textSecondary},

  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backIcon: {fontSize: 24, color: colors.primary},
  navTitle: {...typography.h4, flex: 1, textAlign: 'center'},

  // Content
  content: {padding: spacing.lg},
  date: {...typography.h3, marginBottom: spacing.xs},
  meta: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },

  // Summary
  summaryCard: {marginBottom: spacing.lg},
  summaryText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
  },

  // Section
  section: {marginBottom: spacing.lg},

  // Entities
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  entityDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  entityValue: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },

  // Keywords
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  keyword: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  keywordText: {...typography.label, color: colors.primary},

  // Transcript
  transcriptText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  expandBtn: {marginTop: spacing.md, alignItems: 'center'},
  expandBtnText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});
