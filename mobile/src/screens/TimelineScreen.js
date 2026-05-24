import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {useCallback} from 'react';
import {useAuth} from '../services/AuthContext';
import {useConversations} from '../hooks/useConversations';
import {EntityTag, EmptyState} from '../components/UIComponents';
import {formatShortDate, formatTime} from '../utils/formatters';
import {colors, typography, spacing, radius, shadows} from '../components/theme';

// ─── Conversation card ────────────────────────────────────────────────────────
function ConversationCard({item, onPress, onDelete}) {
  const taskStats = _getTaskStats(item.actionItems);
  const allTasksDone = taskStats.total > 0 && taskStats.completed === taskStats.total;
  const firstTask = taskStats.items[0];

  return (
    <TouchableOpacity style={[styles.card, allTasksDone && styles.cardDone]} onPress={onPress} activeOpacity={0.85}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.dateGroup}>
          <Text style={[styles.cardDate, allTasksDone && styles.textMuted]}>{formatShortDate(item.createdAt)}</Text>
          <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {allTasksDone && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          style={styles.deleteBtn}>
          <Text style={styles.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </View>

      {/* Summary preview */}
      {!!item.summary && (
        <Text style={[styles.summary, allTasksDone && styles.textMuted]} numberOfLines={2}>
          {item.summary}
        </Text>
      )}

      {/* Entity tags */}
      {item.entities?.length > 0 && (
        <View style={styles.tags}>
          {item.entities.slice(0, 4).map((e, i) => (
            <EntityTag key={i} type={e.type} value={e.value} amount={e.amount} />
          ))}
          {item.entities.length > 4 && (
            <Text style={styles.moreTag}>+{item.entities.length - 4} more</Text>
          )}
        </View>
      )}

      {/* First action item preview */}
      {taskStats.total > 0 && (
        <View style={[styles.actionPreview, allTasksDone && styles.actionPreviewDone]}>
          <View
            style={[
              styles.actionPreviewCheckbox,
              firstTask.done && styles.actionPreviewCheckboxDone,
            ]}>
            {firstTask.done && <Text style={styles.actionPreviewCheckmark}>✓</Text>}
          </View>
          <Text
            style={[styles.actionPreviewText, firstTask.done && styles.actionPreviewTextDone]}
            numberOfLines={1}>
            {firstTask.text}
          </Text>
          <Text style={[styles.actionProgressText, allTasksDone && styles.actionPreviewTextDone]}>
            {taskStats.completed}/{taskStats.total}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function _getTaskStats(actionItems = []) {
  const items = Array.isArray(actionItems)
    ? actionItems
        .map(item => {
          if (typeof item === 'string') {
            return {text: item, done: false};
          }
          if (item && typeof item === 'object') {
            return {
              text: item.text || item.value || '',
              done: item.done === true,
            };
          }
          return null;
        })
        .filter(item => item && item.text)
    : [];

  return {
    items,
    total: items.length,
    completed: items.filter(item => item.done).length,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TimelineScreen({navigation}) {
  const {logout} = useAuth();
  const {
    conversations,
    loading,
    refreshing,
    error,
    fetchAll,
    refresh,
    search,
    clearSearch,
    deleteById,
  } = useConversations();

  const [searchQuery, setSearchQuery] = useState('');

  // Refresh list whenever screen comes into focus (e.g. after recording)
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const handleSearch = () => {
    if (searchQuery.trim()) {
      search(searchQuery);
    } else {
      fetchAll();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    clearSearch();
  };

  const handleDelete = id => {
    Alert.alert('Delete Conversation', 'This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteById(id);
          } catch {
            Alert.alert('Error', 'Failed to delete conversation');
          }
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign Out', style: 'destructive', onPress: logout},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>FinSense AI</Text>
          <Text style={styles.headerSub}>
            {conversations.length}{' '}
            {conversations.length === 1 ? 'conversation' : 'conversations'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutBtn}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search SIP, EMI, loan…"
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Error banner ── */}
      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── List ── */}
      <FlatList
        data={conversations}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <ConversationCard
            item={item}
            onPress={() =>
              navigation.navigate('Summary', {conversationId: item._id})
            }
            onDelete={() => handleDelete(item._id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="🎙️"
              title="No conversations yet"
              subtitle="Tap Record to capture your first financial conversation"
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {...typography.h2},
  headerSub: {...typography.caption, color: colors.textTertiary, marginTop: 2},
  signOutBtn: {...typography.bodySmall, color: colors.primary, fontWeight: '600'},

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  searchIcon: {fontSize: 16, marginRight: spacing.sm},
  searchInput: {flex: 1, height: 46, ...typography.body},
  clearBtn: {padding: spacing.xs},
  clearBtnText: {color: colors.textTertiary, fontSize: 14},

  // Error banner
  errorBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: '#FEE2E2',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  errorText: {...typography.bodySmall, color: '#991B1B'},

  // List
  list: {paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl},

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardDone: {
    opacity: 0.6,
    backgroundColor: colors.surfaceSecondary,
  },
  textMuted: {
    color: colors.textTertiary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dateGroup: {flex: 1},
  cardDate: {...typography.h4},
  cardTime: {...typography.caption, color: colors.textTertiary, marginTop: 2},
  completedBadge: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedBadgeText: {
    ...typography.label,
    color: colors.textTertiary,
  },
  deleteBtn: {padding: spacing.xs},
  deleteIcon: {fontSize: 16},

  summary: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  tags: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs},
  moreTag: {
    ...typography.caption,
    color: colors.textTertiary,
    alignSelf: 'center',
    marginLeft: spacing.xs,
  },

  // Action preview
  actionPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.actionBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
  actionPreviewIcon: {fontSize: 12, marginRight: 6},
  actionPreviewCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.actionDot,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPreviewCheckboxDone: {
    backgroundColor: colors.actionDot,
  },
  actionPreviewCheckmark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionPreviewText: {
    ...typography.bodySmall,
    color: colors.actionText,
    flex: 1,
    flexShrink: 1,
  },
  actionProgressText: {
    ...typography.caption,
    color: colors.actionText,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  actionPreviewDone: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  actionPreviewTextDone: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
});
