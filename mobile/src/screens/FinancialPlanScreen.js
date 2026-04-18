import React from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ActionItem, Card, SectionHeader} from '../components/UIComponents';
import {colors, spacing, typography} from '../components/theme';

export default function FinancialPlanScreen({route, navigation}) {
  const {plan} = route.params || {};

  if (!plan) {
    return null;
  }

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
          Financial Plan
        </Text>
        <View style={{width: 44}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard}>
          <Text style={styles.title}>{plan.title}</Text>
          <Text style={styles.summary}>{plan.summary}</Text>
          <Text style={styles.meta}>Horizon: {plan.horizonMonths} months</Text>
        </Card>

        {plan.immediateActions?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Immediate Actions" count={plan.immediateActions.length} />
            {plan.immediateActions.map((action, index) => (
              <ActionItem key={index} text={action} />
            ))}
          </View>
        )}

        {plan.monthlyMilestones?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Monthly Milestones" count={plan.monthlyMilestones.length} />
            {plan.monthlyMilestones.map(milestone => (
              <Card key={milestone.monthIndex} style={styles.milestoneCard}>
                <Text style={styles.milestoneLabel}>Month {milestone.monthIndex}</Text>
                {!!milestone.title && <Text style={styles.milestoneTitle}>{milestone.title}</Text>}
                {!!milestone.focus && (
                  <Text style={styles.milestoneFocus}>{milestone.focus}</Text>
                )}
                {milestone.actions?.length > 0 && (
                  <View style={{marginTop: spacing.sm}}>
                    {milestone.actions.map((action, index) => (
                      <ActionItem key={index} text={action} />
                    ))}
                  </View>
                )}
                {milestone.successMetric ? (
                  <Text style={styles.metric}>
                    Success metric: {milestone.successMetric}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        )}

        {plan.riskNotes?.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Risk Notes" count={plan.riskNotes.length} />
            <Card>
              {plan.riskNotes.map((note, index) => (
                <Text key={index} style={styles.riskNote}>
                  • {note}
                </Text>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
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
  content: {padding: spacing.lg, paddingBottom: spacing.xxl},
  heroCard: {marginBottom: spacing.lg},
  title: {...typography.h2, marginBottom: spacing.sm},
  summary: {...typography.body, color: colors.textSecondary},
  meta: {...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.sm},
  section: {marginBottom: spacing.lg},
  milestoneCard: {marginBottom: spacing.sm},
  milestoneLabel: {...typography.label, color: colors.primary, marginBottom: spacing.xs},
  milestoneTitle: {...typography.h4, marginBottom: spacing.xs},
  milestoneFocus: {...typography.body, color: colors.textSecondary},
  metric: {...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.sm},
  riskNote: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
