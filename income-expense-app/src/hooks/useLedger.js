import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

function ledgerParams(fyRange, range, { entryType, search } = {}) {
  const params = {
    fyStartDate: fyRange.startDate,
    fyEndDate: fyRange.endDate,
  };

  if (range) {
    params.startDate = range.startDate;
    params.endDate = range.endDate;
  }

  if (entryType && entryType !== 'ALL') params.entryType = entryType;
  if (search && String(search).trim()) params.search = String(search).trim();

  return params;
}

/**
 * GET /api/office-ledger — the same endpoint and table used by the existing
 * website's Office Reports screen.
 */
export const useOfficeLedger = ({ fyRange, range, entryType, search }, { enabled = true } = {}) => {
  return useQuery({
    queryKey: [
      'office-ledger',
      fyRange?.startDate,
      fyRange?.endDate,
      range?.startDate,
      range?.endDate,
      entryType || 'ALL',
      search || '',
    ],
    queryFn: async () => {
      const { data } = await api.get('/office-ledger', {
        params: ledgerParams(fyRange, range, { entryType, search }),
      });
      return data;
    },
    enabled: enabled && Boolean(fyRange && range),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
  });
};

export const useLedgerEntry = ({ fyRange, id }) => {
  return useQuery({
    queryKey: ['ledger-entry', id, fyRange?.startDate, fyRange?.endDate],
    queryFn: async () => {
      const { data } = await api.get(`/office-ledger/${id}`, {
        params: { fyStartDate: fyRange.startDate, fyEndDate: fyRange.endDate },
      });
      return data.entry;
    },
    enabled: Boolean(id && fyRange),
  });
};

function useInvalidateLedger() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['office-ledger'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-entry'] });
  };
}

export const useCreateLedgerEntry = (fyRange) => {
  const invalidate = useInvalidateLedger();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/office-ledger', {
        fyStartDate: fyRange.startDate,
        fyEndDate: fyRange.endDate,
        ...payload,
      });
      return data.entry;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateLedgerEntry = (fyRange) => {
  const invalidate = useInvalidateLedger();

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/office-ledger/${id}`, {
        fyStartDate: fyRange.startDate,
        fyEndDate: fyRange.endDate,
        ...payload,
      });
      return data.entry;
    },
    onSuccess: invalidate,
  });
};

export const useDeleteLedgerEntry = (fyRange) => {
  const invalidate = useInvalidateLedger();

  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/office-ledger/${id}`, {
        params: { fyStartDate: fyRange.startDate, fyEndDate: fyRange.endDate },
      });
      return data;
    },
    onSuccess: invalidate,
  });
};
