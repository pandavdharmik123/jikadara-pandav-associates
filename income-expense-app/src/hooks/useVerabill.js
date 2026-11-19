import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useVerabillSummary = () =>
  useQuery({
    queryKey: ['verabill', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/verabill/summary');
      return data.summary;
    },
  });

export const useVerabillEntries = (params) =>
  useQuery({
    queryKey: ['verabill', 'entries', params],
    queryFn: async () => {
      const { data } = await api.get('/verabill', { params });
      return data;
    },
  });

export const useVerabillEntry = (id) =>
  useQuery({
    queryKey: ['verabill', 'entry', id],
    queryFn: async () => {
      const { data } = await api.get(`/verabill/${id}`);
      return data.entry;
    },
    enabled: Boolean(id),
  });

export const useCreateVerabillEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/verabill', payload);
      return data.entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verabill'] });
    },
  });
};

export const useUpdateVerabillEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/verabill/${id}`, payload);
      return data.entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verabill'] });
    },
  });
};

export const useDeleteVerabillEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/verabill/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verabill'] });
    },
  });
};

export const useImportVerabill = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records) => {
      const { data } = await api.post('/verabill/import', { records });
      return data.result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verabill'] });
    },
  });
};