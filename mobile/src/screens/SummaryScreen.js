import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
import {scheduleConversationReminders} from '../services/NotificationService';
import {
  ActionItem,
  Button,
  Card,
  EntityTag,
  LoadingOverlay,
  SectionHeader,
} from '../components/UIComponents';
import {
  formatDateTime,
  formatFullDate,
  formatRecordingLength,
  formatReminderStatus,
} from '../utils/formatters';
import {colors, typography, spacing, radius} from '../components/theme';

export default function SummaryScreen({route, navigation}) {
  const {conversation: passedConversation, conversationId, promptPlanReminderId} =
    route.params || {};

  const [conversation, setConversation] = useState(passedConversation || null);
  const [loading, setLoading] = useState(!passedConversation);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const promptedPlanRef = useRef(null);

  const actionableReminders = useMemo(
    () =>
      (conversation?.reminderJobs || []).filter(
        reminder => reminder.kind !== 'plan_prompt',
      ),
    [conversation],
  );
  const planPrompts = useMemo(
    () =>
      (conversation?.reminderJobs || []).filter(
        reminder =>
          reminder.kind === 'plan_prompt' && reminder.status === 'pending',
      ),
    [conversation],
  );
  const latestPlan = useMemo(() => {
    const plans = conversation?.financialPlans || [];
    return plans.length > 0 ? plans[plans.length - 1] : null;
  }, [conversation]);

  const fetchConversation = useCallback(async id => {
    try {
      const res = await api.get(`/api/conversations/${id}`);
      setConversation(res.data.conversation);
    } catch {
      Alert.alert('Error', 'Failed to load conversation');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  const handleCreatePlan = useCallback(async reminder => {
    if (!conversation?._id) {
      return;
    }

    setCreatingPlan(true);
    try {
      const res = await api.post(`/api/conversations/${conversation._id}/plan`, {
        reminderId: reminder?._id || reminder?.id,
      });

      await scheduleConversationReminders(res.data.conversation);
      setConversation(res.data.conversation);
      navigation.navigate('FinancialPlan', {
        plan: res.data.plan,
        conversationId: conversation._id,
      });
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to create financial plan';
      Alert.alert('Plan Error', message);
    } finally {
      setCreatingPlan(false);
    }
  }, [conversation, navigation]);

  const handleToggleActionItem = async (index) => {
    try {
      const currentItem = conversation.actionItems[index];
      const newDoneState = !currentItem.done;
      
      const updatedActionItems = [...conversation.actionItems];
      updatedActionItems[index] = { ...currentItem, done: newDoneState };
      setConversation({ ...conversation, actionItems: updatedActionItems });

      const res = await api.patch(`/api/conversations/${conversation._id}/action-items/${index}`, {
        done: newDoneState
      });
      setConversation(res.data.conversation);
    } catch (err) {
      Alert.alert('Error', 'Failed to update action item');
      if (conversation._id) {
        fetchConversation(conversation._id);
      }
    }
  };

  useEffect(() => {
    if (!passedConversation && conversationId) {
      fetchConversation(conversationId);
    }
  }, [conversationId, fetchConversation, passedConversation]);

  useEffect(() => {
    if (planPrompts.length === 0 || latestPlan) {
      return;
    }

    const selectedPrompt =
      planPrompts.find(
        reminder =>
          String(reminder._id || reminder.id) === String(promptPlanReminderId || ''),
      ) || planPrompts[0];

    const selectedId = String(selectedPrompt?._id || selectedPrompt?.id || '');
    if (!selectedId || promptedPlanRef.current === selectedId) {
      return;
    }

    promptedPlanRef.current = selectedId;

    const horizonLabel = selectedPrompt.planHorizonMonths
      ? `${selectedPrompt.planHorizonMonths}-month`
      : 'multi-month';

    Alert.alert(
      'Create a plan?',
      `Gemini identified a ${horizonLabel} planning workflow here. Should we create it now?`,
      [
        {text: 'Later', style: 'cancel'},
        {
          text: 'Create Plan',
          onPress: () => handleCreatePlan(selectedPrompt),
        },
      ],
    );
  }, [handleCreatePlan, latestPlan, planPrompts, promptPlanReminderId]);

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
        <Text style={styles.date}>{formatFullDate(conversation.createdAt)}</Text>
        {conversation.duration > 0 && (
          <Text style={styles.meta}>
            🕐 {formatRecordingLength(conversation.duration)}
            {'  '}·{'  '}
            🌐 {(conversation.language || 'unknown').toUpperCase()}
          </Text>
        )}

        <Card style={styles.summaryCard}>
          <SectionHeader title="Summary" />
          <Text style={styles.summaryText}>
            {conversation.summary || 'No summary available.'}
          </Text>
        </Card>

        {planPrompts.length > 0 && !latestPlan && (
          <View style={styles.section}>
            <SectionHeader title="Suggested Plans" count={planPrompts.length} />
            {planPrompts.map(prompt => (
              <Card key={String(prompt._id || prompt.id)} style={styles.planPromptCard}>
                <Text style={styles.planPromptTitle}>{prompt.title}</Text>
                <Text style={styles.planPromptBody}>
                  {prompt.description || 'Gemini recommends creating a plan for this conversation.'}
                </Text>
                {prompt.planHorizonMonths ? (
                  <Text style={styles.planPromptMeta}>
                    Horizon: {prompt.planHorizonMonths} months
                  </Text>
                ) : null}
                <Button
                  title="Create Plan"
                  onPress={() => handleCreatePlan(prompt)}
                  style={{marginTop: spacing.sm}}
                />
              </Card>
            ))}
          </View>
        )}

        {latestPlan && (
          <View style={styles.section}>
            <SectionHeader title="Financial Plan" />
            <Card>
              <Text style={styles.planPromptTitle}>{latestPlan.title}</Text>
              <Text style={styles.planPromptBody}>
                {latestPlan.summary || 'Financial plan created successfully.'}
              </Text>
              <Button
                title="Open Plan"
                onPress={() =>
                  navigation.navigate('FinancialPlan', {
                    plan: latestPlan,
                    conversationId: conversation._id,
                  })
                }
                style={{marginTop: spacing.sm}}
              />
            </Card>
          </View>
        )}

        {actionableReminders.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Reminder Jobs" count={actionableReminders.length} />
            {actionableReminders.map(reminder => (
              <Card key={String(reminder._id || reminder.id)} style={styles.reminderCard}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  <View style={styles.reminderBadge}>
                    <Text style={styles.reminderBadgeText}>
                      {formatReminderStatus(reminder.status)}
                    </Text>
                  </View>
                </View>
                {!!reminder.description && (
                  <Text style={styles.reminderDescription}>
                    {reminder.description}
                  </Text>
                )}
                <Text style={styles.reminderMeta}>
                  Due: {formatDateTime(reminder.dueAt)}
                </Text>
                {reminder.recurrence && reminder.recurrence !== 'once' && (
                  <Text style={styles.reminderMeta}>
                    Repeats: {reminder.recurrence}
                  </Text>
                )}
                {reminder.checkInAt && (
                  <Text style={styles.reminderMeta}>
                    Check-in: {formatDateTime(reminder.checkInAt)}
                  </Text>
                )}
              </Card>
            ))}
          </View>
        )}

        {conversation.actionItems?.length > 0 && (() => {
          const completedCount = conversation.actionItems.filter(item => item.done).length;
          const totalCount = conversation.actionItems.length;
          return (
            <View style={styles.section}>
              <SectionHeader
                title="Action Items"
                count={`${completedCount}/${totalCount}`}
              />
              {conversation.actionItems.map((item, index) => (
                <ActionItem 
                  key={index} 
                  text={item.text || item} 
                  done={item.done} 
                  onToggle={() => handleToggleActionItem(index)} 
                />
              ))}
            </View>
          );
        })()}

        {conversation.entities?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Financial Entities"
              count={conversation.entities.length}
            />
            <Card>
              {conversation.entities.map((entity, index) => (
                <View
                  key={index}
                  style={[
                    styles.entityRow,
                    index < conversation.entities.length - 1 &&
                      styles.entityDivider,
                  ]}>
                  <EntityTag
                    type={entity.type}
                    value=""
                    amount={entity.amount}
                  />
                  <Text style={styles.entityValue} numberOfLines={2}>
                    {entity.value}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {conversation.keywords?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Keywords" />
            <View style={styles.keywordsRow}>
              {conversation.keywords.map((keyword, index) => (
                <View key={index} style={styles.keyword}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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
                onPress={() => setShowFullTranscript(value => !value)}>
                <Text style={styles.expandBtnText}>
                  {showFullTranscript ? '▲ Show less' : '▼ Show full transcript'}
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        <View style={{height: spacing.xxl}} />
      </ScrollView>

      {creatingPlan && <LoadingOverlay message="Creating your plan with Gemini…" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {...typography.body, color: colors.textSecondary},
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
  content: {padding: spacing.lg},
  date: {...typography.h3, marginBottom: spacing.xs},
  meta: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  summaryCard: {marginBottom: spacing.lg},
  summaryText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  section: {marginBottom: spacing.lg},
  planPromptCard: {gap: spacing.xs},
  planPromptTitle: {...typography.h4},
  planPromptBody: {...typography.body, color: colors.textSecondary},
  planPromptMeta: {...typography.bodySmall, color: colors.textTertiary},
  reminderCard: {marginBottom: spacing.sm},
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  reminderTitle: {...typography.h4, flex: 1},
  reminderDescription: {...typography.body, color: colors.textSecondary},
  reminderMeta: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  reminderBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reminderBadgeText: {...typography.label, color: colors.primary},
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    flexWrap: 'wrap',
  },
  entityDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  entityValue: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    minWidth: '50%',
  },
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
