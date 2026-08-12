import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Fetch all items currently in the Recycle Bin
 */
export const useRecycleBin = () => {
  return useQuery({
    queryKey: ['recycleBin'],
    queryFn: async () => {
      const { data } = await api.get('/recycle-bin');
      return data;
    },
  });
};

/**
 * Restore an item from Recycle Bin
 */
export const useRestoreItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id }) => {
      const { data } = await api.post('/recycle-bin/restore', { type, id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycleBin'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['generalExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['upads'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

/**
 * Permanently delete a single item
 */
export const usePermanentDeleteItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id }) => {
      const { data } = await api.delete('/recycle-bin/permanent', { data: { type, id } });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycleBin'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['generalExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['upads'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
    },
  });
};

/**
 * Empty the Recycle Bin (all or specific category)
 */
export const useEmptyRecycleBin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ category = 'ALL' } = {}) => {
      const { data } = await api.delete('/recycle-bin/empty', { data: { category } });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycleBin'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['generalExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['upads'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
    },
  });
};
