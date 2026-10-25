import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Office Ledger is an isolated financial module.
 * Its mutations intentionally do not invalidate reports, dashboard, Upad,
 * general expenses, or any other financial query.
 */
export const useOfficeLedger = (params, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ['officeLedger', params],
    queryFn: async () => {
      const { data } = await api.get('/office-ledger', { params });
      return data;
    },
    enabled: enabled && Boolean(params?.fyStartDate && params?.fyEndDate),
  });
};

export const useCreateOfficeLedgerEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/office-ledger', payload);
      return data.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officeLedger'] });
    },
  });
};

export const useUpdateOfficeLedgerEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/office-ledger/${id}`, payload);
      return data.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officeLedger'] });
    },
  });
};

export const useDeleteOfficeLedgerEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fyStartDate, fyEndDate }) => {
      const { data } = await api.delete(`/office-ledger/${id}`, {
        params: { fyStartDate, fyEndDate },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officeLedger'] });
      queryClient.invalidateQueries({ queryKey: ['recycleBin'] });
    },
  });
};

export const useCreateOfficeSplitUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }) => {
      const { data } = await api.post('/office-ledger/split-users', { name });
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officeLedger'] });
    },
  });
};

export const useDeleteOfficeSplitUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/office-ledger/split-users/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officeLedger'] });
    },
  });
};
