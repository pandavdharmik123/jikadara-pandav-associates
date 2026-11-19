import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * React-Query hooks for the Notary Hisab module.
 * All amounts are derived on the client from entries + register.ratePerEntry.
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const useNotaryUsers = () =>
  useQuery({
    queryKey: ['notaryUsers'],
    queryFn: async () => {
      const { data } = await api.get('/notary-hisab/users');
      return data.users || [];
    },
  });

export const useNotaryRegisters = () =>
  useQuery({
    queryKey: ['notaryRegisters'],
    queryFn: async () => {
      const { data } = await api.get('/notary-hisab');
      return data.registers || [];
    },
  });

export const useNotaryRegister = (registerId) =>
  useQuery({
    queryKey: ['notaryRegister', registerId],
    enabled: Boolean(registerId),
    queryFn: async () => {
      const { data } = await api.get(`/notary-hisab/${registerId}`);
      return data.register;
    },
  });

export const useNotarySummary = (registerId) =>
  useQuery({
    queryKey: ['notarySummary', registerId],
    enabled: Boolean(registerId),
    queryFn: async () => {
      const { data } = await api.get(`/notary-hisab/${registerId}/summary`);
      return data.summary || [];
    },
  });

export const useCreateNotaryRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/notary-hisab', payload);
      return data.register;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notaryRegisters'] });
    },
  });
};

export const useUpdateNotaryRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/notary-hisab/${id}`, payload);
      return data.register;
    },
    onSuccess: (register) => {
      queryClient.invalidateQueries({ queryKey: ['notaryRegisters'] });
      if (register?.id) {
        queryClient.invalidateQueries({ queryKey: ['notaryRegister', register.id] });
        queryClient.invalidateQueries({ queryKey: ['notarySummary', register.id] });
      }
    },
  });
};

export const useDeleteNotaryRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, confirm }) => {
      const { data } = await api.delete(`/notary-hisab/${id}`, { params: confirm ? { confirm: 'true' } : {} });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notaryRegisters'] });
    },
  });
};

export const useAddNotaryRange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registerId, startNumber, endNumber }) => {
      const { data } = await api.post(`/notary-hisab/${registerId}/ranges`, { startNumber, endNumber });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notaryRegisters'] });
      queryClient.invalidateQueries({ queryKey: ['notaryRegister', variables.registerId] });
      queryClient.invalidateQueries({ queryKey: ['notarySummary', variables.registerId] });
    },
  });
};

export const useDeleteNotaryRange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registerId, rangeId, confirmDataLoss }) => {
      const { data } = await api.delete(
        `/notary-hisab/${registerId}/ranges/${rangeId}`,
        { params: confirmDataLoss ? { confirmDataLoss: 'true' } : {} }
      );
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notaryRegisters'] });
      queryClient.invalidateQueries({ queryKey: ['notaryRegister', variables.registerId] });
      queryClient.invalidateQueries({ queryKey: ['notarySummary', variables.registerId] });
    },
  });
};

export const useAssignNotaryEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, assignedUserId }) => {
      const { data } = await api.patch(`/notary-hisab/entries/${entryId}`, { assignedUserId });
      return data;
    },
    onSuccess: (data, variables) => {
      const registerId = typeof variables === 'object' ? variables.registerId : variables;
      queryClient.invalidateQueries({ queryKey: ['notaryRegisters'] });
      if (registerId) {
        queryClient.invalidateQueries({ queryKey: ['notaryRegister', registerId] });
        queryClient.invalidateQueries({ queryKey: ['notarySummary', registerId] });
      }
    },
  });
};

export const useBulkAssignNotaryEntries = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registerId, entryIds, assignedUserId }) => {
      const { data } = await api.post(`/notary-hisab/${registerId}/entries/assign-bulk`, {
        entryIds,
        assignedUserId,
      });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notaryRegisters'] });
      queryClient.invalidateQueries({ queryKey: ['notaryRegister', variables.registerId] });
      queryClient.invalidateQueries({ queryKey: ['notarySummary', variables.registerId] });
    },
  });
};
