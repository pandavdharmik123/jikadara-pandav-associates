import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useBackupStatus = () => {
  return useQuery({
    queryKey: ['backup', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/backup/status');
      return data;
    },
    refetchInterval: (query) => (query.state.data?.running ? 3000 : 30000),
    refetchOnWindowFocus: true,
  });
};

export const useBackupHistory = (page = 1, pageSize = 10) => {
  return useQuery({
    queryKey: ['backup', 'runs', page, pageSize],
    queryFn: async () => {
      const { data } = await api.get('/backup/runs', {
        params: { limit: pageSize, offset: (page - 1) * pageSize },
      });
      return data;
    },
    refetchInterval: 60000,
  });
};

export const useRunBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dryRun = false, accountIds = [], applyRetention = true } = {}) => {
      const { data } = await api.post('/backup/run', { dryRun, accountIds, applyRetention });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup'] });
    },
  });
};

export const useDeleteBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/backup/runs/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup'] });
    },
  });
};
