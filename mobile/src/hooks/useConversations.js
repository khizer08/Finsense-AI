/**
 * useConversations
 * Shared data hook — used by TimelineScreen and prepared for Analytics.
 */
import {useState, useCallback} from 'react';
import api from '../services/api';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/api/conversations');
      setConversations(res.data.conversations);
    } catch (err) {
      if (err.response?.status !== 401) setError('Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const search = useCallback(async q => {
    if (!q?.trim()) return fetchAll();
    try {
      setError(null);
      const res = await api.get(`/api/search?q=${encodeURIComponent(q.trim())}`);
      setConversations(res.data.conversations);
    } catch {
      setError('Search failed');
    }
  }, [fetchAll]);

  const clearSearch = useCallback(() => fetchAll(), [fetchAll]);

  const deleteById = useCallback(async id => {
    setConversations(prev => prev.filter(c => c._id !== id));
    try {
      await api.delete(`/api/conversations/${id}`);
    } catch {
      fetchAll(); // rollback
      throw new Error('Delete failed');
    }
  }, [fetchAll]);

  return {conversations, loading, refreshing, error, fetchAll, refresh, search, clearSearch, deleteById};
}
